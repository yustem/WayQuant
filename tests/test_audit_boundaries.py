"""Independent negative boundary regressions established by the 2026-11-27 audit."""
import json
from dataclasses import asdict
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engine.fair_monte_carlo import OpenFairInput
from app.engine.fair_monte_carlo import FairMonteCarloEngine

client=TestClient(app,raise_server_exceptions=False)

@pytest.mark.parametrize('field,value', [('random_seed',True),('iterations','1000'),('lef_min',True),('plm_min','100000'),('slef_prob',True)])
def test_api_does_not_coerce_invalid_integer_json_types(field,value):
    data=asdict(OpenFairInput(1,1,1))
    data[field]=value
    response=client.post('/api/v1/simulate',json=data)
    assert response.status_code==422

def test_control_json_types_are_not_silently_coerced():
    data=asdict(OpenFairInput(1,1,1))
    data['controls']=[dict(id='audit',annual_cost='10',lef_reduction=0,plm_reduction=0,slm_reduction=0,enabled='true')]
    assert client.post('/api/v1/simulate',json=data).status_code==422

@pytest.mark.parametrize('field,value',[('lef_min',float('nan')),('plm_max',float('inf')),('slm_mode',float('-inf'))])
def test_api_nonfinite_input_errors_are_json_safe(field,value):
    data=asdict(OpenFairInput(1,1,1))
    data[field]=value
    response=client.post('/api/v1/simulate',content=json.dumps(data),headers={'Content-Type':'application/json'})
    assert response.status_code==422
    assert isinstance(response.json()['detail'],list)

def test_nonfinite_custom_curve_threshold_is_rejected_before_computation():
    with pytest.raises(ValueError,match='threshold'):
        FairMonteCarloEngine(OpenFairInput(1,1,1)).run_simulation(lec_thresholds=[float('nan')])
