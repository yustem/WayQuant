# File: backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from threading import BoundedSemaphore
import os, platform
import numpy as np
import pydantic
from dataclasses import asdict
from datetime import datetime, timezone
from app.engine.fair_monte_carlo import MODEL_VERSION

_gate = BoundedSemaphore(1)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import List
from app.engine.fair_monte_carlo import OpenFairInput, FairMonteCarloEngine

app = FastAPI(
    title="WayQuant Enterprise CRQ API",
    version="3.0.0",
    description="Open FAIR Vectorized Monte Carlo Quantification Engine"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("WAYQUANT_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def safe_validation_error(_request, exc):
    # Invalid NaN/Infinity inputs and exception-valued contexts cannot be echoed
    # through strict JSON. Preserve actionable field locations/types/messages.
    return JSONResponse(status_code=422, content={"detail": [
        {"type": error["type"], "loc": list(error["loc"]), "msg": error["msg"]}
        for error in exc.errors()
    ]})

class ControlItem(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, strict=True)

    id: str
    annual_cost: float = Field(..., ge=0, le=1e12)
    lef_reduction: float = Field(..., ge=0.0, le=0.95)
    plm_reduction: float = Field(..., ge=0.0, le=0.95)
    slm_reduction: float = Field(..., ge=0.0, le=0.95)
    enabled: bool = True

class SimulationRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, strict=True)

    lef_min: float = Field(..., ge=0)
    lef_mode: float = Field(..., ge=0)
    lef_max: float = Field(..., ge=0)
    lef_gamma: float = Field(4.0, ge=1.0, le=8.0)
    plm_min: float = Field(..., ge=0)
    plm_mode: float = Field(..., ge=0)
    plm_max: float = Field(..., ge=0)
    plm_gamma: float = Field(4.0, ge=1.0, le=8.0)
    slef_prob: float = Field(0.65, ge=0.0, le=1.0)
    slm_min: float = Field(..., ge=0)
    slm_mode: float = Field(..., ge=0)
    slm_max: float = Field(..., ge=0)
    sec_materiality_threshold: float = Field(2500000.0, ge=0)
    iterations: int = Field(50000, ge=1000, le=250000, strict=True)
    random_seed: int = Field(42001, ge=0, le=4294967295, strict=True)
    controls: List[ControlItem] = Field(default_factory=list, max_length=32)

    @model_validator(mode="after")
    def validate_estimate_ranges(self):
        if len({c.id for c in self.controls}) != len(self.controls):
            raise ValueError("Control identifiers must be unique")
        for name in ("lef", "plm", "slm"):
            low = getattr(self, f"{name}_min")
            mode = getattr(self, f"{name}_mode")
            high = getattr(self, f"{name}_max")
            if not low <= mode <= high:
                raise ValueError(f"{name}_min <= {name}_mode <= {name}_max must hold")
        OpenFairInput(**self.model_dump(exclude={"controls"}))
        return self


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": MODEL_VERSION}


@app.post("/api/v1/simulate")
def execute_fair_simulation(payload: SimulationRequest):
    if not _gate.acquire(blocking=False):
        raise HTTPException(429, "Simulation worker busy; retry later")
    try:
        return simulate(payload)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    finally:
        _gate.release()


def simulate(payload: SimulationRequest):
    # Baseline simulation.
    base_cfg = OpenFairInput(
        lef_min=payload.lef_min, lef_mode=payload.lef_mode, lef_max=payload.lef_max,
        lef_gamma=payload.lef_gamma,
        plm_min=payload.plm_min, plm_mode=payload.plm_mode, plm_max=payload.plm_max,
        plm_gamma=payload.plm_gamma,
        slef_prob=payload.slef_prob,
        slm_min=payload.slm_min, slm_mode=payload.slm_mode, slm_max=payload.slm_max,
        sec_materiality_threshold=payload.sec_materiality_threshold,
        iterations=payload.iterations, random_seed=payload.random_seed
    )
    baseline_res = FairMonteCarloEngine(base_cfg).run_simulation()

    # Multiplicative scenario control effects.
    active_controls = [c for c in payload.controls if c.enabled]
    lef_mult, plm_mult, slm_mult, total_cost = 1.0, 1.0, 1.0, 0.0
    for ctrl in active_controls:
        lef_mult *= (1.0 - ctrl.lef_reduction)
        plm_mult *= (1.0 - ctrl.plm_reduction)
        slm_mult *= (1.0 - ctrl.slm_reduction)
        total_cost += ctrl.annual_cost

    res_cfg = OpenFairInput(
        lef_min=payload.lef_min * lef_mult,
        lef_mode=payload.lef_mode * lef_mult,
        lef_max=payload.lef_max * lef_mult,
        lef_gamma=payload.lef_gamma,
        plm_min=payload.plm_min * plm_mult,
        plm_mode=payload.plm_mode * plm_mult,
        plm_max=payload.plm_max * plm_mult,
        plm_gamma=payload.plm_gamma,
        slef_prob=payload.slef_prob,
        slm_min=payload.slm_min * slm_mult,
        slm_mode=payload.slm_mode * slm_mult,
        slm_max=payload.slm_max * slm_mult,
        sec_materiality_threshold=payload.sec_materiality_threshold,
        iterations=payload.iterations,
        random_seed=payload.random_seed
    )
    residual_res = FairMonteCarloEngine(res_cfg).run_simulation(lec_thresholds=[p["loss"] for p in baseline_res["lec_curve"]]) if active_controls else dict(baseline_res)

    prevented_ale = max(0.0, baseline_res["ale"] - residual_res["ale"])
    net_benefit = prevented_ale - total_cost
    rosi_pct = ((net_benefit / total_cost) * 100.0) if total_cost > 0 else 0.0
    sec_materiality_exceed_prob = baseline_res.pop("sec_materiality_exceed_prob")
    residual_res.pop("sec_materiality_exceed_prob")

    return {
        "metadata": {
            "engine": "numpy", "engine_version": MODEL_VERSION, "software_version": MODEL_VERSION,
            "model": "shifted-lognormal-mode-p95-v1", "inputs": asdict(base_cfg),
            "controls": [c.model_dump() for c in active_controls],
            "residual_inputs": asdict(res_cfg), "timestamp": datetime.now(timezone.utc).isoformat(),
            "code_revision": os.getenv("WAYQUANT_CODE_REVISION"),
            "environment": {"python": platform.python_version(), "numpy": np.__version__, "pydantic": pydantic.__version__},
            "assumptions": ["Independent incidents and severities", "Scenario control coefficients; not certified NIST effects", "SLM maximum field denotes P95, not a ceiling"]
        },
        "baseline": baseline_res,
        "residual": residual_res,
        "governance": {
            "annual_control_spend": round(total_cost, 2),
            "prevented_annual_loss": round(prevented_ale, 2),
            "net_benefit": round(net_benefit, 2),
            "rosi_percentage": round(rosi_pct, 2),
            "sec_materiality_exceed_prob": round(sec_materiality_exceed_prob, 2)
        }
    }
