from pathlib import Path
import re

def test_unauthed_api_host_binding_is_loopback_only():
    compose=(Path(__file__).resolve().parents[1]/'docker-compose.yml').read_text()
    api=compose.split('  api:',1)[1].split('  web:',1)[0]
    ports=re.findall(r'^\s*-\s*"([^"]*8000[^"]*)"',api,re.M)
    assert ports and all(port.startswith('127.0.0.1:') or port.startswith('[::1]:') for port in ports)
