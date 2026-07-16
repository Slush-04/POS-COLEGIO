import sys, os, glob

backend = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, backend)
venv = glob.glob(os.path.join(backend, "venv", "lib", "python*", "site-packages"))
if venv:
    sys.path.insert(0, venv[0])

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
resp = client.get("/api/pagos/historial")
txs = resp.json()

conteo = {}
for t in txs:
    tipo = t["type"]
    conteo[tipo] = conteo.get(tipo, 0) + 1

print(f"Total transacciones: {len(txs)}")
for tipo, n in sorted(conteo.items()):
    print(f'  Tag "{tipo}": {n} movimientos')

# Verificar que existen los 6 tipos
esperados = {"VENTA", "VENTA A CUENTA", "CURSO", "CUOTA", "PAGO", "COMPRA"}
presentes = set(conteo.keys())
faltantes = esperados - presentes
if faltantes:
    print(f"\n[ALERTA] Tags faltantes: {faltantes}")
else:
    print(f"\n[OK] Todos los tipos de etiqueta presentes: {sorted(presentes)}")
