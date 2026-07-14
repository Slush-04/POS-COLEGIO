from database import get_db_connection
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
from datetime import datetime

router = APIRouter(
    prefix="/api/cuotas",
    tags=["Cuotas"],
)

class NuevaCuota(BaseModel):
    id_cliente: int
    tipo_cuota: str # 'Mensual' o 'Anual'
    anio: int
    mes: Optional[int] = None
    monto: float

class PagoCuotas(BaseModel):
    id_cliente: int
    tipo_cuota: str # 'Mensual' o 'Anual'
    cantidad_a_pagar: int # Cuántas cuotas está pagando en esta transacción
    monto_total: float # El pago total


NOMBRE_CUOTA_MENSUAL = "Cuota mensual"
NOMBRE_CUOTA_ANUAL = "Cuota anual 1"


def obtener_precio_cuota_catalogo(cursor, nombre: str, precio_predeterminado: float) -> float:
    """Obtiene el precio vigente de una cuota configurada como servicio."""
    cursor.execute('''
        SELECT precio_venta FROM inventario
        WHERE LOWER(nombre) = LOWER(?)
          AND LOWER(categoria) = 'cuotas'
          AND tipo = 'Servicio'
          AND estatus = 1
        ORDER BY id ASC LIMIT 1
    ''', (nombre,))
    fila = cursor.fetchone()
    return float(fila[0]) if fila and fila[0] is not None else precio_predeterminado

@router.post("")
def generar_cuota(cuota: NuevaCuota):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute('''
            INSERT INTO cuotas_asociados (
                id_cliente, tipo_cuota, anio, mes, monto, estado_pago
            ) VALUES (?, ?, ?, ?, ?, 'PENDIENTE')
        ''', (cuota.id_cliente, cuota.tipo_cuota, cuota.anio, cuota.mes, cuota.monto))
        id_cuota = cursor.lastrowid

        # Auto-crear en tabla deudas (evitar duplicados)
        tipo_deuda = 'CUOTA_MENSUAL' if cuota.tipo_cuota == 'Mensual' else 'CUOTA_ANUAL'
        if cuota.tipo_cuota == 'Mensual' and cuota.mes:
            concepto = f"Cuota mensual {cuota.mes:02d}/{cuota.anio}"
        else:
            concepto = f"Cuota anual {cuota.anio}"

        cursor.execute("SELECT 1 FROM deudas WHERE tipo_deuda = ? AND id_referencia = ?", (tipo_deuda, id_cuota))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado)
                VALUES (?, ?, ?, ?, ?, 'PENDIENTE')
            ''', (cuota.id_cliente, tipo_deuda, id_cuota, concepto, cuota.monto))

        conexion.commit()
        return {"estatus": "éxito", "mensaje": "Cuota generada correctamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
    finally:
        conexion.close()


@router.get("/{id_cliente}/pendientes")
def obtener_cuotas_pendientes(id_cliente: int, tipo_cuota: Optional[str] = None):
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        
        query = '''
            SELECT
                c.*,
                d.id_deuda,
                ROUND(c.monto - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                    SELECT SUM(pd.monto_pagado)
                    FROM pagos_deudas pd
                    WHERE pd.id_deuda = d.id_deuda
                ), 0), 2) AS saldo_pendiente
            FROM cuotas_asociados c
            LEFT JOIN deudas d
              ON d.id_referencia = c.id_cuota
             AND d.tipo_deuda IN ('CUOTA_MENSUAL', 'CUOTA_ANUAL')
            WHERE c.id_cliente = ? AND c.estado_pago = 'PENDIENTE'
        '''
        params = [id_cliente]
        
        if tipo_cuota:
            query += " AND c.tipo_cuota = ?"
            params.append(tipo_cuota)
            
        query += " ORDER BY c.anio ASC, c.mes ASC"
        
        cursor.execute(query, params)
        cuotas = [dict(row) for row in cursor.fetchall() if row["saldo_pendiente"] > 0]
        return cuotas
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al leer base de datos: {str(e)}")
    finally:
        conexion.close()


@router.post("/{id_cliente}/anualidad-pendiente")
def obtener_o_generar_anualidad_pendiente(id_cliente: int):
    """Obtiene la anualidad aplicable o la crea una sola vez para el POS."""
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        cursor.execute(
            "SELECT tipo_cliente, estatus_operativo FROM clientes WHERE id_cliente = ? AND estatus = 1",
            (id_cliente,)
        )
        cliente = cursor.fetchone()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado o inactivo.")
        if (cliente["tipo_cliente"] or "").strip().lower() != "asociado" or cliente["estatus_operativo"] != "Activo":
            raise HTTPException(status_code=400, detail="Solo los asociados activos pueden pagar anualidad.")

        hoy = datetime.now()
        # Septiembre a diciembre cubre el siguiente ejercicio; de enero a
        # agosto cubre el ejercicio en curso.
        anio_cobertura = hoy.year + 1 if hoy.month >= 9 else hoy.year

        cursor.execute('''
            SELECT * FROM cuotas_asociados
            WHERE id_cliente = ? AND tipo_cuota = 'Anual' AND anio = ?
            ORDER BY id_cuota DESC LIMIT 1
        ''', (id_cliente, anio_cobertura))
        cuota = cursor.fetchone()
        creada = False

        if not cuota:
            monto_anual = obtener_precio_cuota_catalogo(cursor, NOMBRE_CUOTA_ANUAL, 5000.0)
            cursor.execute('''
                INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago)
                VALUES (?, 'Anual', ?, NULL, ?, 'PENDIENTE')
            ''', (id_cliente, anio_cobertura, monto_anual))
            id_cuota = cursor.lastrowid
            cursor.execute('''
                INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
                VALUES (?, 'CUOTA_ANUAL', ?, ?, ?, 'PENDIENTE', ?)
            ''', (id_cliente, id_cuota, f"Cuota anual {anio_cobertura}", monto_anual, f"{anio_cobertura}-01-01"))
            cursor.execute("SELECT * FROM cuotas_asociados WHERE id_cuota = ?", (id_cuota,))
            cuota = cursor.fetchone()
            creada = True

        conexion.commit()
        return {"cuota": dict(cuota), "creada": creada, "anio_cobertura": anio_cobertura}
    except HTTPException:
        conexion.rollback()
        raise
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo al preparar anualidad: {str(e)}")
    finally:
        conexion.close()

@router.post("/pagar")
def registrar_pago_cuota(pago: PagoCuotas):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Obtener las cuotas pendientes más antiguas, incluyendo el monto original
        cursor.execute('''
            SELECT id_cuota, anio, mes, monto FROM cuotas_asociados 
            WHERE id_cliente = ? AND tipo_cuota = ? AND estado_pago = 'PENDIENTE'
            ORDER BY anio ASC, mes ASC LIMIT ?
        ''', (pago.id_cliente, pago.tipo_cuota, pago.cantidad_a_pagar))
        
        cuotas_a_pagar = cursor.fetchall()
        
        if len(cuotas_a_pagar) < pago.cantidad_a_pagar:
            # Si quiere pagar 5 pero solo debe 2, solo cobramos las 2 pendientes
            pass
            
        if not cuotas_a_pagar:
            raise HTTPException(status_code=400, detail="El cliente no tiene cuotas pendientes de este tipo.")

        # Registrar el pago de cada cuota en el modelo centralizado de deudas
        for id_cuota, anio, mes, monto in cuotas_a_pagar:
            tipo_deuda = 'CUOTA_MENSUAL' if pago.tipo_cuota == 'Mensual' else 'CUOTA_ANUAL'
            concepto = f"Cuota mensual {mes:02d}/{anio}" if pago.tipo_cuota == 'Mensual' and mes else f"Cuota anual {anio}"

            cursor.execute(
                "SELECT id_deuda FROM deudas WHERE tipo_deuda = ? AND id_referencia = ?",
                (tipo_deuda, id_cuota)
            )
            deuda_row = cursor.fetchone()
            if deuda_row:
                id_deuda = deuda_row[0]
            else:
                cursor.execute('''
                    INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
                    VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?)
                ''', (pago.id_cliente, tipo_deuda, id_cuota, concepto, monto, f"{anio}-{(mes or 1):02d}-01"))
                id_deuda = cursor.lastrowid

            cursor.execute("SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_deudas WHERE id_deuda = ?", (id_deuda,))
            suma_abonos = cursor.fetchone()[0] or 0
            cursor.execute("SELECT COALESCE(saldo_perdonado, 0) FROM deudas WHERE id_deuda = ?", (id_deuda,))
            saldo_perdonado = cursor.fetchone()[0] or 0
            restante = round(monto - suma_abonos - saldo_perdonado, 2)
            if restante <= 0:
                continue

            cursor.execute('''
                INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion)
                VALUES (?, ?, ?, 'Efectivo', ?, ?)
            ''', (id_deuda, pago.id_cliente, restante, fecha_actual, f"Liquidación de {concepto}"))
            cursor.execute("UPDATE deudas SET estado = 'PAGADO' WHERE id_deuda = ?", (id_deuda,))

        # Actualizar cuotas a PAGADO
        ids_a_pagar = [str(cuota[0]) for cuota in cuotas_a_pagar]
        placeholders = ','.join('?' * len(ids_a_pagar))
        cursor.execute(f'''
            UPDATE cuotas_asociados 
            SET estado_pago = 'PAGADO', fecha_pago = ? 
            WHERE id_cuota IN ({placeholders})
        ''', [fecha_actual] + ids_a_pagar)
        
        # Lógica especial de EXENCIÓN para Cuota Anual
        if pago.tipo_cuota == 'Anual':
            mes_actual = datetime.now().month
            anio_actual = datetime.now().year
            anio_exento = anio_actual
            
            # Tolerancia: 4 meses antes del fin de año (septiembre-diciembre)
            if mes_actual >= 9:
                anio_exento = anio_actual + 1
            # O dos meses del año nuevo (enero-febrero) -> exenta el año actual.
            elif mes_actual <= 2:
                anio_exento = anio_actual
            else:
                # Si paga en marzo-agosto, exenta el año actual también, por lógica estándar.
                anio_exento = anio_actual

            # Marcar como EXENTO las cuotas MENSUALES de ese año exento
            cursor.execute('''
                UPDATE cuotas_asociados 
                SET estado_pago = 'EXENTO', fecha_pago = ? 
                WHERE id_cliente = ? AND tipo_cuota = 'Mensual' AND anio = ? AND estado_pago = 'PENDIENTE'
            ''', (fecha_actual, pago.id_cliente, anio_exento))
            cursor.execute('''
                UPDATE deudas
                SET estado = 'EXENTO'
                WHERE id_cliente = ?
                  AND tipo_deuda = 'CUOTA_MENSUAL'
                  AND id_referencia IN (
                      SELECT id_cuota
                      FROM cuotas_asociados
                      WHERE id_cliente = ?
                        AND tipo_cuota = 'Mensual'
                        AND anio = ?
                        AND estado_pago = 'EXENTO'
                  )
            ''', (pago.id_cliente, pago.id_cliente, anio_exento))
            
            # (Opcional) Si las cuotas mensuales se generan al inicio del mes, 
            # al generarlas habría que verificar si pagó la anualidad para crearlas ya EXENTAS.
            
        conexion.commit()
        return {
            "estatus": "éxito", 
            "mensaje": f"Se registraron {len(cuotas_a_pagar)} cuotas como pagadas.",
            "cuotas_pagadas": ids_a_pagar
        }
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
    finally:
        conexion.close()

def autogenerar_cuotas_mensuales():
    """Genera las cuotas mensuales para los asociados activos si no existen."""
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        mes_actual = datetime.now().month
        anio_actual = datetime.now().year
        monto_cuota = obtener_precio_cuota_catalogo(cursor, NOMBRE_CUOTA_MENSUAL, 500.0)
        
        # Obtener todos los asociados activos
        cursor.execute("SELECT id_cliente FROM clientes WHERE LOWER(tipo_cliente) = 'asociado' AND estatus_operativo = 'Activo'")
        asociados = cursor.fetchall()
        
        for (id_cliente,) in asociados:
            # Revisar si ya tiene la cuota generada este mes
            cursor.execute("SELECT id_cuota FROM cuotas_asociados WHERE id_cliente = ? AND tipo_cuota = 'Mensual' AND anio = ? AND mes = ?", (id_cliente, anio_actual, mes_actual))
            if not cursor.fetchone():
                # Verificar si pagó anualidad (para exentar en lugar de pendiente)
                cursor.execute("SELECT id_cuota FROM cuotas_asociados WHERE id_cliente = ? AND tipo_cuota = 'Anual' AND anio = ? AND estado_pago = 'PAGADO'", (id_cliente, anio_actual))
                estado = 'EXENTO' if cursor.fetchone() else 'PENDIENTE'
                
                cursor.execute('''
                    INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago)
                    VALUES (?, 'Mensual', ?, ?, ?, ?)
                ''', (id_cliente, anio_actual, mes_actual, monto_cuota, estado))
                id_cuota = cursor.lastrowid
                if estado == 'PENDIENTE':
                    concepto = f"Cuota mensual {mes_actual:02d}/{anio_actual}"
                    cursor.execute('''
                        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
                        VALUES (?, 'CUOTA_MENSUAL', ?, ?, ?, 'PENDIENTE', ?)
                    ''', (id_cliente, id_cuota, concepto, monto_cuota, f"{anio_actual}-{mes_actual:02d}-01"))
        conexion.commit()
    except Exception as e:
        print(f"Error en autogeneración de cuotas: {e}")
    finally:
        conexion.close()

@router.get("/dashboard")
def obtener_dashboard_cuotas():
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        # 1. Total Asociados (Activos vs Inactivos)
        cursor.execute("SELECT estatus_operativo, COUNT(*) FROM clientes WHERE LOWER(tipo_cliente) = 'asociado' GROUP BY estatus_operativo")
        asociados_raw = cursor.fetchall()
        activos = 0
        inactivos = 0
        for estatus, total in asociados_raw:
            if estatus == 'Activo': activos = total
            else: inactivos = total
            
        # 2. Proyección Mes
        mes_actual = datetime.now().month
        anio_actual = datetime.now().year
        cursor.execute("SELECT SUM(monto) FROM cuotas_asociados WHERE tipo_cuota = 'Mensual' AND mes = ? AND anio = ? AND estado_pago != 'EXENTO'", (mes_actual, anio_actual))
        meta_mes = cursor.fetchone()[0] or 0.0
        
        mes_str = f"{anio_actual:04d}-{mes_actual:02d}"
        cursor.execute('''
            SELECT COALESCE(SUM(pd.monto_pagado), 0.0)
            FROM pagos_deudas pd
            JOIN deudas d ON pd.id_deuda = d.id_deuda
            WHERE d.tipo_deuda = 'CUOTA_MENSUAL'
              AND strftime('%Y-%m', pd.fecha_pago) = ?
        ''', (mes_str,))
        progreso_mes = cursor.fetchone()[0] or 0.0
        
        # 3. Cuotas Pendientes Históricas
        cursor.execute('''
            SELECT COALESCE(SUM(d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                SELECT SUM(pd.monto_pagado)
                FROM pagos_deudas pd
                WHERE pd.id_deuda = d.id_deuda
            ), 0)), 0)
            FROM deudas d
            WHERE d.estado = 'PENDIENTE'
              AND d.tipo_deuda IN ('CUOTA_MENSUAL', 'CUOTA_ANUAL')
        ''')
        deuda_total = cursor.fetchone()[0] or 0.0
        
        # 4. Anualidades Pagadas (Suma e Ingresos)
        cursor.execute("SELECT COUNT(*), SUM(monto) FROM cuotas_asociados WHERE tipo_cuota = 'Anual' AND anio = ? AND estado_pago = 'PAGADO'", (anio_actual,))
        anualidades_row = cursor.fetchone()
        anualidades_pagadas = anualidades_row[0] or 0
        anualidades_suma = anualidades_row[1] or 0.0
        
        return {
            "membresia": {"activos": activos, "inactivos": inactivos},
            "proyeccion_mes": {"meta": meta_mes, "progreso": progreso_mes},
            "cuotas_pendientes": deuda_total,
            "anualidades": {"cantidad": anualidades_pagadas, "ingreso": anualidades_suma}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al cargar dashboard: {str(e)}")
    finally:
        conexion.close()

@router.get("/asociados")
def obtener_asociados_historial():
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        
        # Obtener todos los asociados
        cursor.execute("SELECT id_cliente, nombre, rfc, estatus_operativo, fecha_registro FROM clientes WHERE LOWER(tipo_cliente) = 'asociado' ORDER BY nombre ASC")
        asociados = [dict(row) for row in cursor.fetchall()]
        
        # Para cada uno, adjuntar sus ultimos cuotas mensuales
        mes_actual = datetime.now().month
        anio_actual = datetime.now().year
        
        for asc in asociados:
            cursor.execute('''
                SELECT anio, mes, estado_pago 
                FROM cuotas_asociados 
                WHERE id_cliente = ? AND tipo_cuota = 'Mensual' 
                ORDER BY anio DESC, mes DESC LIMIT 12
            ''', (asc["id_cliente"],))
            asc["historial"] = [dict(row) for row in cursor.fetchall()]
            
            # Revisar si pagó anualidad
            cursor.execute("SELECT estado_pago FROM cuotas_asociados WHERE id_cliente = ? AND tipo_cuota = 'Anual' AND anio = ?", (asc["id_cliente"], anio_actual))
            anual = cursor.fetchone()
            asc["anualidad"] = anual["estado_pago"] if anual else "NO_GENERADA"

            # Calcular deuda total real en cuotas
            cursor.execute('''
                SELECT COALESCE(SUM(d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                    SELECT SUM(pd.monto_pagado)
                    FROM pagos_deudas pd
                    WHERE pd.id_deuda = d.id_deuda
                ), 0)), 0)
                FROM deudas d
                WHERE d.id_cliente = ?
                  AND d.estado = 'PENDIENTE'
                  AND d.tipo_deuda IN ('CUOTA_MENSUAL', 'CUOTA_ANUAL')
            ''', (asc["id_cliente"],))
            deuda = cursor.fetchone()[0]
            asc["deuda_total_cuotas"] = deuda if deuda else 0.0
            
        return asociados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al cargar asociados: {str(e)}")
    finally:
        conexion.close()
