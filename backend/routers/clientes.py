from database import get_db_connection
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
from typing import List, Optional

router = APIRouter(
    prefix="/api/clientes",
    tags=["Clientes"],
)

# ==========================================
# MÓDULO 1: DIRECTORIO DE CLIENTES (CRM)
# ==========================================
class DatosCliente(BaseModel):
    nombre: str
    telefono: str = ""
    correo: str
    razon_social: str = ""
    rfc: str = ""
    curp: str = ""
    regimen_fiscal: str = ""
    uso_cfdi: str = "G03"
    tipo_cliente: str
    genero: str = ""
    fecha_nacimiento: Optional[str] = None
    estatus_operativo: str = "Activo"
    sector: str = "Normal"


class ClienteImportItem(BaseModel):
    nombre: str
    correo: str = ""
    telefono: str = ""
    tipo_cliente: str = "publico general"
    razon_social: str = ""
    rfc: str = ""
    curp: str = ""
    regimen_fiscal: str = ""
    uso_cfdi: str = "G03"
    genero: str = ""
    fecha_nacimiento: Optional[str] = None
    estatus_operativo: str = "Activo"
    sector: str = "Normal"


@router.post("/importar")
def importar_clientes(clientes: List[ClienteImportItem]):
    if not clientes:
        raise HTTPException(status_code=400, detail="No se enviaron clientes para importar.")

    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        creados = 0
        omitidos = 0
        errores = []

        from datetime import datetime
        mes_actual = datetime.now().month
        anio_actual = datetime.now().year
        from routers.cuotas import NOMBRE_CUOTA_MENSUAL, obtener_precio_cuota_catalogo

        for idx, cliente in enumerate(clientes, start=1):
            nombre = (cliente.nombre or "").strip()
            if not nombre:
                errores.append(f"Fila {idx}: El nombre es obligatorio.")
                continue

            correo = (cliente.correo or "").strip()
            telefono = (cliente.telefono or "").strip()
            razon_social = (cliente.razon_social or "").strip()
            rfc_valor = cliente.rfc.strip().upper() if cliente.rfc and cliente.rfc.strip() else None
            curp_valor = cliente.curp.strip().upper() if cliente.curp and cliente.curp.strip() else None
            regimen_fiscal = (cliente.regimen_fiscal or "").strip()
            uso_cfdi = (cliente.uso_cfdi or "G03").strip().upper()
            tipo_cliente = (cliente.tipo_cliente or "publico general").strip().lower()
            genero = (cliente.genero or "").strip()
            fecha_nac = (cliente.fecha_nacimiento or "").strip() or None
            estatus_op = (cliente.estatus_operativo or "Activo").strip()
            sector = (cliente.sector or "Normal").strip()

            if rfc_valor:
                cursor.execute("SELECT id_cliente FROM clientes WHERE rfc = ?", (rfc_valor,))
                if cursor.fetchone():
                    omitidos += 1
                    errores.append(f"Fila {idx} ({nombre}): El RFC '{rfc_valor}' ya existe.")
                    continue

            try:
                cursor.execute('''
                    INSERT INTO clientes (
                        nombre, telefono, correo, razon_social, rfc, curp, 
                        regimen_fiscal, uso_cfdi, tipo_cliente, genero, fecha_nacimiento, estatus_operativo, sector
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    nombre, telefono, correo, razon_social, rfc_valor, curp_valor,
                    regimen_fiscal, uso_cfdi, tipo_cliente, genero, fecha_nac,
                    estatus_op, sector
                ))
                id_nuevo = cursor.lastrowid
                creados += 1

                if tipo_cliente == 'asociado' and estatus_op == 'Activo':
                    monto_cuota = obtener_precio_cuota_catalogo(cursor, NOMBRE_CUOTA_MENSUAL, 500.0)
                    cursor.execute('''
                        INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago)
                        VALUES (?, 'Mensual', ?, ?, ?, 'PENDIENTE')
                    ''', (id_nuevo, anio_actual, mes_actual, monto_cuota))
                    id_cuota = cursor.lastrowid

                    concepto = f"Cuota mensual {mes_actual:02d}/{anio_actual}"
                    cursor.execute('''
                        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado)
                        VALUES (?, 'CUOTA_MENSUAL', ?, ?, ?, 'PENDIENTE')
                    ''', (id_nuevo, id_cuota, concepto, monto_cuota))

            except Exception as ex:
                errores.append(f"Fila {idx} ({nombre}): {str(ex)}")

        conexion.commit()
        return {
            "estatus": "éxito",
            "creados": creados,
            "omitidos": omitidos,
            "errores": errores,
            "mensaje": f"Importación completada: {creados} clientes registrados correctamente."
        }
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo en la importación masiva: {str(e)}")
    finally:
        conexion.close()


@router.get("")
def obtener_clientes():
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM clientes ORDER BY id_cliente DESC")
        clientes = [dict(row) for row in cursor.fetchall()]
        return clientes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al leer base de datos: {str(e)}")
    finally:
        conexion.close()


@router.get("/buscar")
def buscar_clientes(q: str = "", include_inactive: bool = False):
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        query = f"%{q}%"
        if include_inactive:
            cursor.execute('''
                SELECT * FROM clientes 
                WHERE nombre LIKE ? OR rfc LIKE ? OR telefono LIKE ?
                ORDER BY nombre ASC
                LIMIT 20
            ''', (query, query, query))
        else:
            cursor.execute('''
                SELECT * FROM clientes 
                WHERE (nombre LIKE ? OR rfc LIKE ? OR telefono LIKE ?)
                  AND estatus_operativo = 'Activo'
                ORDER BY nombre ASC
                LIMIT 20
            ''', (query, query, query))
        clientes = [dict(row) for row in cursor.fetchall()]
        return clientes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al buscar en base de datos: {str(e)}")
    finally:
        conexion.close()


@router.put("/{id_cliente}")
def actualizar_cliente(id_cliente: int, cliente: DatosCliente):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        
        rfc_valor = cliente.rfc.strip() if cliente.rfc else None
        if rfc_valor == "":
            rfc_valor = None
            
        curp_valor = cliente.curp.strip() if cliente.curp else None
        if curp_valor == "":
            curp_valor = None

        if rfc_valor:
            cursor.execute("SELECT id_cliente FROM clientes WHERE rfc = ? AND id_cliente != ?", (rfc_valor, id_cliente))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Error de auditoría: Este RFC ya está registrado por otro cliente.")
        
        cursor.execute('''
            UPDATE clientes SET
                nombre = ?, telefono = ?, correo = ?, razon_social = ?, 
                rfc = ?, curp = ?, regimen_fiscal = ?, uso_cfdi = ?, tipo_cliente = ?,
                genero = ?, fecha_nacimiento = ?, estatus_operativo = ?, sector = ?
            WHERE id_cliente = ?
        ''', (
            cliente.nombre, cliente.telefono, cliente.correo,
            cliente.razon_social, rfc_valor, curp_valor,
            cliente.regimen_fiscal, cliente.uso_cfdi, cliente.tipo_cliente,
            cliente.genero, cliente.fecha_nacimiento,
            cliente.estatus_operativo, cliente.sector,
            id_cliente
        ))
        conexion.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cliente no encontrado.")
        return {"estatus": "éxito", "mensaje": f"Cliente {cliente.nombre} actualizado correctamente."}
    except HTTPException:
        raise
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed: clientes.rfc" in str(e):
            raise HTTPException(status_code=400, detail="Error de auditoría: Este RFC ya está registrado por otro cliente.")
        else:
            raise HTTPException(status_code=400, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
    finally:
        conexion.close()
