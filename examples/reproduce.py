"""Run from an installed source release; archive output with the environment."""
from dataclasses import asdict
import json, platform, time
import numpy as np
from wayquant import OpenFairInput, FairMonteCarloEngine, __version__

for n in (10000,50000,100000,250000):
    cfg=OpenFairInput(.25,.85,2.4,iterations=n)
    start=time.perf_counter()
    result=FairMonteCarloEngine(cfg).run_simulation()
    print(json.dumps(dict(version=__version__,python=platform.python_version(),numpy=np.__version__,
        inputs=asdict(cfg),ale=result['ale'],var95=result['cyber_var_95'],wall_ms=round((time.perf_counter()-start)*1000,2))))
