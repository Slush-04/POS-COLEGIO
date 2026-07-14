from database import get_db_connection
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
from typing import Optional

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


@router.post("")
def registrar_cliente(cliente: DatosCliente):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        
        rfc_valor = cliente.rfc.strip() if cliente.rfc else None
        if rfc_valor == "":
            rfc_valor = None
            
        curp_valor = cliente.curp.strip() if cliente.curp else None
        if curp_valor == "":
            curp_valor = None

        cursor.execute('''
            INSERT INTO clientes (
                nombre, telefono, correo, razon_social, rfc, curp, 
                regimen_fiscal, uso_cfdi, tipo_cliente, genero, fecha_nacimiento, estatus_operativo, sector
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            cliente.nombre, cliente.telefono, cliente.correo,
            cliente.razon_social, rfc_valor, curp_valor,
            cliente.regimen_fiscal, cliente.uso_cfdi, cliente.tipo_cliente,
            cliente.genero, cliente.fecha_nacimiento,
            cliente.estatus_operativo, cliente.sector
        ))
        id_nuevo = cursor.lastrowid

        # Si el tipo de cliente es 'asociado' y estatus_operativo es 'Activo',
        # generamos automáticamente la cuota mensual del mes de registro
        if cliente.tipo_cliente.lower() == 'asociado' and cliente.estatus_operativo == 'Activo':
            from datetime import datetime
            mes_actual = datetime.now().month
            anio_actual = datetime.now().year
            # El precio se administra en Catálogo / Inventario con el
            # servicio "Cuota mensual".
            from routers.cuotas import NOMBRE_CUOTA_MENSUAL, obtener_precio_cuota_catalogo
            monto_cuota = obtener_precio_cuota_catalogo(cursor, NOMBRE_CUOTA_MENSUAL, 500.0)
            
            # Insertar la cuota mensual de este mes para el nuevo asociado
            cursor.execute('''
                INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago)
                VALUES (?, 'Mensual', ?, ?, ?, 'PENDIENTE')
            ''', (id_nuevo, anio_actual, mes_actual, monto_cuota))
            id_cuota = cursor.lastrowid

            # Sincronizar con tabla deudas centralizada
            concepto = f"Cuota mensual {mes_actual:02d}/{anio_actual}"
            cursor.execute('''
                INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado)
                VALUES (?, 'CUOTA_MENSUAL', ?, ?, ?, 'PENDIENTE')
            ''', (id_nuevo, id_cuota, concepto, monto_cuota))

        conexion.commit()
        return {"estatus": "éxito", "mensaje": f"Cliente {cliente.nombre} registrado correctamente."}
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed: clientes.rfc" in str(e):
            raise HTTPException(status_code=400, detail="Error de auditoría: Este RFC ya está registrado.")
        else:
            raise HTTPException(status_code=400, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
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
def buscar_clientes(q: str = ""):
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        query = f"%{q}%"
        cursor.execute('''
            SELECT * FROM clientes 
            WHERE nombre LIKE ? OR rfc LIKE ? OR telefono LIKE ?
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
