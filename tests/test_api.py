from fastapi.testclient import TestClient
from app.main import app, _gate
from test_engine import config
from dataclasses import asdict

client=TestClient(app)

def test_health_and_openapi():
    assert client.get('/api/v1/health').status_code==200
    assert client.get('/openapi.json').status_code==200

def test_controls_and_metadata():
    data=asdict(config())
    data['controls']=[dict(id='test',annual_cost=10,lef_reduction=.5,plm_reduction=0,slm_reduction=0)]
    r=client.post('/api/v1/simulate',json=data)
    assert r.status_code==200, r.text
    x=r.json(); assert x['residual']['ale'] < x['baseline']['ale']
    assert x['metadata']['inputs']['random_seed']==data['random_seed']
    g=x['governance']
    assert abs(g['rosi_percentage']-(g['net_benefit']/10)*100)<.011

def test_api_rejects_invalid_and_busy():
    data=asdict(config()); data['random_seed']=-1
    assert client.post('/api/v1/simulate',json=data).status_code==422
    assert client.post('/api/v1/simulate',content='{').status_code==422
    assert client.post('/api/v1/simulate',json={}).status_code==422
    _gate.acquire()
    try: assert client.post('/api/v1/simulate',json=asdict(config())).status_code==429
    finally: _gate.release()
