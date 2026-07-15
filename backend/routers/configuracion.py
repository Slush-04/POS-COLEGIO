import re
import sqlite3
from datetime import datetime
from typing import List

from database import get_db_connection
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/configuracion", tags=["Configuración"])
CLAVES_FOLIO = ("V", "VC", "CU", "QT", "PD")
TIPOS_OPERACION = {
    "V": "VENTA",
    "VC": "VENTA_CUENTA",
    "CU": "CURSO",
    "QT": "CUOTA",
    "PD": "PAGO_DEUDA",
}


class SerieFolio(BaseModel):
    clave: str
    prefijo: str = Field(min_length=1, max_length=8)


class ConfiguracionOperacion(BaseModel):
    series: List[SerieFolio]
    motivo_anulacion_minimo: int = Field(ge=3, le=100)


def _leer_configuracion(cursor):
    periodo = datetime.now().strftime("%y%m")
    cursor.execute('''
        SELECT clave, nombre, prefijo, siguiente_numero, periodo_actual
        FROM configuracion_folios
        WHERE activo = 1
        ORDER BY CASE clave
            WHEN 'V' THEN 1 WHEN 'VC' THEN 2 WHEN 'CU' THEN 3
            WHEN 'QT' THEN 4 WHEN 'PD' THEN 5 ELSE 99 END
    ''')
    series = []
    for row in cursor.fetchall():
        serie = dict(row)
        siguiente_numero = int(serie.pop("siguiente_numero"))
        proximo = siguiente_numero if serie["periodo_actual"] == periodo else 1
        serie["proximo_consecutivo"] = proximo
        serie["vista_previa"] = f'{serie["prefijo"]}-{periodo}{proximo:04d}'
        cursor.execute('''
            SELECT folio FROM operaciones
            WHERE tipo_operacion = ?
            ORDER BY id_operacion DESC LIMIT 1
        ''', (TIPOS_OPERACION.get(serie["clave"]),))
        ultimo = cursor.fetchone()
        serie["ultimo_folio"] = ultimo[0] if ultimo else None
        series.append(serie)

    cursor.execute("SELECT motivo_anulacion_minimo FROM configuracion_operacion WHERE id = 1")
    regla = cursor.fetchone()
    return {
        "series": series,
        "motivo_anulacion_minimo": regla[0] if regla else 5,
    }


@router.get("/operacion-folios")
def obtener_configuracion_operacion():
    conexion = get_db_connection()
    conexion.row_factory = sqlite3.Row
    try:
        return _leer_configuracion(conexion.cursor())
    finally:
        conexion.close()


@router.put("/operacion-folios")
def actualizar_configuracion_operacion(configuracion: ConfiguracionOperacion):
    if len(configuracion.series) != len(CLAVES_FOLIO) or {serie.clave for serie in configuracion.series} != set(CLAVES_FOLIO):
        raise HTTPException(status_code=400, detail="Debes enviar las cinco series de folios.")

    prefijos = []
    for serie in configuracion.series:
        serie.prefijo = serie.prefijo.strip().upper()
        if not re.fullmatch(r"[A-Z0-9]{1,8}", serie.prefijo):
            raise HTTPException(
                status_code=400,
                detail=f"El prefijo de {serie.clave} sólo puede contener letras y números.",
            )
        prefijos.append(serie.prefijo)
    if len(prefijos) != len(set(prefijos)):
        raise HTTPException(status_code=400, detail="Cada serie debe tener un prefijo diferente.")

    conexion = get_db_connection()
    conexion.row_factory = sqlite3.Row
    try:
        conexion.execute("BEGIN IMMEDIATE")
        cursor = conexion.cursor()
        for serie in configuracion.series:
            cursor.execute('''
                UPDATE configuracion_folios
                SET prefijo = ?, fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE clave = ?
            ''', (serie.prefijo, serie.clave))
        cursor.execute('''
            UPDATE configuracion_operacion
            SET motivo_anulacion_minimo = ?, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = 1
        ''', (configuracion.motivo_anulacion_minimo,))
        conexion.commit()
        return _leer_configuracion(cursor)
    except Exception as exc:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la configuración: {exc}")
    finally:
        conexion.close()
