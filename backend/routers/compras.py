from datetime import date, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import generar_folio, get_db_connection


router = APIRouter(
    prefix="/api/compras",
    tags=["Compras"],
)


METODOS_PAGO = {
    "efectivo",
    "transferencia",
    "debito",
    "credito",
    "terminal",
}


class RegistroCompra(BaseModel):
    descripcion: str = Field(min_length=1, max_length=300)
    monto: float = Field(gt=0)
    metodo_pago: str
    fecha_compra: date = Field(default_factory=date.today)


@router.post("")
def registrar_compra(compra: RegistroCompra):
    descripcion = compra.descripcion.strip()
    metodo_pago = compra.metodo_pago.strip().lower()
    monto = round(float(compra.monto), 2)

    if not descripcion:
        raise HTTPException(status_code=400, detail="La descripción de la compra es obligatoria.")
    if metodo_pago not in METODOS_PAGO:
        raise HTTPException(status_code=400, detail="El método de pago no es válido.")
    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto de la compra debe ser mayor a cero.")

    ahora = datetime.now()
    fecha_evento = datetime.combine(compra.fecha_compra, ahora.time()).strftime("%Y-%m-%d %H:%M:%S")
    conexion = get_db_connection()
    try:
        conexion.execute("BEGIN IMMEDIATE")
        cursor = conexion.cursor()
        folio = generar_folio("E", cursor)

        cursor.execute(
            """
            INSERT INTO operaciones (
                folio, tipo_operacion, id_cliente, total, metodo_pago,
                observacion, estado, fecha_evento
            )
            VALUES (?, 'COMPRA', NULL, ?, ?, ?, 'COMPLETADA', ?)
            """,
            (folio, monto, metodo_pago, descripcion, fecha_evento),
        )
        id_operacion = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO operacion_detalles (
                id_operacion, tipo_detalle, descripcion, cantidad,
                precio_unitario, descuento, iva, importe_total
            )
            VALUES (?, 'COMPRA', ?, 1, ?, 0, 0, ?)
            """,
            (id_operacion, descripcion, monto, monto),
        )

        conexion.commit()
        return {
            "message": "Compra registrada correctamente.",
            "id_operacion": id_operacion,
            "folio": folio,
            "monto": monto,
        }
    except HTTPException:
        conexion.rollback()
        raise
    except Exception as error:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo registrar la compra: {error}")
    finally:
        conexion.close()
