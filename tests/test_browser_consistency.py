"""Compare independent RNG implementations against the same model expectation."""
import json
import subprocess
from pathlib import Path
import pytest
from app.engine.fair_monte_carlo import FairMonteCarloEngine
from test_engine import config

def test_python_browser_agree_statistically():
    root=Path(__file__).resolve().parents[1]
    js="""import {runOpenFairMonteCarlo as run} from './frontend/src/engine.js';
    console.log(JSON.stringify(run({lefMin:1,lefMode:1,lefMax:1,plmMin:100,plmMode:100,plmMax:100,slefProb:1,slmMin:20,slmMode:100,slmMax:500},100000)));"""
    result=subprocess.run(['node','--input-type=module','-e',js],cwd=root,capture_output=True,text=True,check=True)
    browser=json.loads(result.stdout)
    python=FairMonteCarloEngine(config(iterations=100000,slef_prob=1,slm_min=20,slm_mode=100,slm_max=500)).run_simulation()
    assert browser['ale'] == pytest.approx(python['ale'],rel=.03)
    assert browser['var95'] == pytest.approx(python['cyber_var_95'],rel=.04)
