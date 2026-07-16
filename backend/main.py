from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import clientes, compras, cursos, pagos, inventario, cuotas, pos, operaciones, configuracion
from database import inicializar_base_datos

# Inicializamos el sistema administrativo
app = FastAPI(title="Motor Lógico ProBill - Colegio")

# Política de Seguridad CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# CONEXIÓN DE MÓDULOS (ROUTERS)
# ==========================================
app.include_router(clientes.router)
app.include_router(compras.router)
app.include_router(cursos.router)
app.include_router(pagos.router)
app.include_router(inventario.router)
app.include_router(cuotas.router)
app.include_router(pos.router)
app.include_router(operaciones.router)
app.include_router(configuracion.router)

@app.on_event("startup")
def generar_cuotas_inicio():
    try:
        # Incluye migraciones no destructivas para instalaciones ya existentes.
        inicializar_base_datos()
        from routers.cuotas import autogenerar_cuotas_mensuales
        autogenerar_cuotas_mensuales()
    except Exception as e:
        print(f"Error al autogenerar cuotas: {e}")
