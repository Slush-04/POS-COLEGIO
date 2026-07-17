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

    return {
        "series": series,
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
        conexion.commit()
        return _leer_configuracion(cursor)
    except Exception as exc:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la configuración: {exc}")
    finally:
        conexion.close()


class FiscalSettingsModel(BaseModel):
    razon_social: str = Field(..., min_length=1, max_length=150)
    rfc: str = Field(..., min_length=12, max_length=13)
    codigo_postal: str = Field(..., min_length=5, max_length=5)
    regimen_fiscal: str = Field(..., min_length=3, max_length=3)
    domicilio_fiscal: str = Field(..., min_length=1, max_length=250)
    telefono: str = Field(..., min_length=1, max_length=50)
    correo: str = Field(..., min_length=1, max_length=100)
    representante_legal: str = Field(..., min_length=1, max_length=100)


class TicketSettingsModel(BaseModel):
    titulo_comprobante: str = Field(..., min_length=1, max_length=100)
    pie_pagina: str = Field(..., min_length=1, max_length=250)
    mostrar_datos_fiscales: bool
    ubicacion_emisor: str = "ARRIBA"
    alineacion_emisor: str = "IZQUIERDA"
    alineacion_titulo: str = "IZQUIERDA"
    plantilla: str = "PLANTILLA_1"


@router.get("/fiscal")
def obtener_configuracion_fiscal():
    conexion = get_db_connection()
    conexion.row_factory = sqlite3.Row
    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT razon_social, rfc, codigo_postal, regimen_fiscal, domicilio_fiscal, telefono, correo, representante_legal FROM configuracion_fiscal WHERE id = 1")
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Configuración fiscal no encontrada.")
        return dict(row)
    finally:
        conexion.close()


@router.put("/fiscal")
def actualizar_configuracion_fiscal(datos: FiscalSettingsModel):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute('''
            UPDATE configuracion_fiscal
            SET razon_social = ?, rfc = ?, codigo_postal = ?, regimen_fiscal = ?, domicilio_fiscal = ?, telefono = ?, correo = ?, representante_legal = ?, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = 1
        ''', (datos.razon_social, datos.rfc.upper(), datos.codigo_postal, datos.regimen_fiscal, datos.domicilio_fiscal, datos.telefono, datos.correo, datos.representante_legal))
        conexion.commit()
        return {"status": "success", "mensaje": "Configuración fiscal actualizada correctamente."}
    except Exception as exc:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la configuración fiscal: {exc}")
    finally:
        conexion.close()


@router.get("/tickets")
def obtener_configuracion_tickets():
    conexion = get_db_connection()
    conexion.row_factory = sqlite3.Row
    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT titulo_comprobante, pie_pagina, mostrar_datos_fiscales, ubicacion_emisor, alineacion_emisor, alineacion_titulo, plantilla FROM configuracion_tickets WHERE id = 1")
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Configuración de tickets no encontrada.")
        res = dict(row)
        res["mostrar_datos_fiscales"] = bool(res["mostrar_datos_fiscales"])
        return res
    finally:
        conexion.close()


@router.put("/tickets")
def actualizar_configuracion_tickets(datos: TicketSettingsModel):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute('''
            UPDATE configuracion_tickets
            SET titulo_comprobante = ?, pie_pagina = ?, mostrar_datos_fiscales = ?, ubicacion_emisor = ?, alineacion_emisor = ?, alineacion_titulo = ?, plantilla = ?, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = 1
        ''', (datos.titulo_comprobante, datos.pie_pagina, 1 if datos.mostrar_datos_fiscales else 0, datos.ubicacion_emisor, datos.alineacion_emisor, datos.alineacion_titulo, datos.plantilla))
        conexion.commit()
        return {"status": "success", "mensaje": "Configuración de tickets actualizada correctamente."}
    except Exception as exc:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la configuración de tickets: {exc}")
    finally:
        conexion.close()


@router.get("/comprobante")
def obtener_comprobante_configuracion():
    conexion = get_db_connection()
    conexion.row_factory = sqlite3.Row
    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT razon_social, rfc, codigo_postal, regimen_fiscal, domicilio_fiscal, telefono, correo, representante_legal FROM configuracion_fiscal WHERE id = 1")
        fiscal = cursor.fetchone()
        cursor.execute("SELECT titulo_comprobante, pie_pagina, mostrar_datos_fiscales, ubicacion_emisor, alineacion_emisor, alineacion_titulo, plantilla FROM configuracion_tickets WHERE id = 1")
        tickets = cursor.fetchone()
        if not fiscal or not tickets:
            raise HTTPException(status_code=404, detail="Configuraciones no encontradas.")
        res_tickets = dict(tickets)
        res_tickets["mostrar_datos_fiscales"] = bool(res_tickets["mostrar_datos_fiscales"])
        return {
            "fiscal": dict(fiscal),
            "tickets": res_tickets
        }
    finally:
        conexion.close()

