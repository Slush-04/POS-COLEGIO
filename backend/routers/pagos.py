from database import get_db_connection
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
from datetime import date, datetime
from typing import List, Optional

router = APIRouter(
    prefix="/api/pagos",
    tags=["Pagos"],
)

# ==========================================
# MÓDULO: REGISTRO DE ABONOS Y SALDOS (NUEVO MODELO)
# ==========================================
class DatosAbonoDeuda(BaseModel):
    id_deuda: int
    monto_abono: float
    metodo_pago: str = "efectivo"
    observacion: str = ""


class PagoPorMetodo(BaseModel):
    metodo_pago: str
    monto: float


class DatosAbonosLote(BaseModel):
    id_cliente: Optional[int] = None
    deuda_ids: List[int]
    monto_total: float
    metodo_pago: str = "efectivo"
    observacion: str = ""
    fecha_pago: Optional[date] = None
    pagos: Optional[List[PagoPorMetodo]] = None
    monto_perdonado: float = 0.0


def _calcular_saldo_deuda(cursor, id_deuda: int):
    cursor.execute(
        "SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_deudas WHERE id_deuda = ?",
        (id_deuda,)
    )
    pagado = cursor.fetchone()[0] or 0

    cursor.execute(
        "SELECT monto_total, COALESCE(saldo_perdonado, 0) FROM deudas WHERE id_deuda = ?",
        (id_deuda,)
    )
    row = cursor.fetchone()
    if not row:
        return None

    monto_total, saldo_perdonado = row
    return round(monto_total - pagado - saldo_perdonado, 2)


def _crear_deuda_curso_si_falta(cursor, id_inscripcion: int):
    cursor.execute(
        "SELECT id_deuda FROM deudas WHERE tipo_deuda = 'CURSO' AND id_referencia = ?",
        (id_inscripcion,)
    )
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute('''
        SELECT i.id_cliente, i.monto_total, i.saldo_pendiente, i.estado_pago, i.fecha_registro, cu.nombre
        FROM inscripciones i
        LEFT JOIN cursos cu ON i.id_curso = cu.id_curso
        WHERE i.id_inscripcion = ?
    ''', (id_inscripcion,))
    inscripcion = cursor.fetchone()
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada.")

    id_cliente, monto_total, saldo_pendiente, estado_pago, fecha_registro, nombre_curso = inscripcion
    if id_cliente is None:
        raise HTTPException(status_code=400, detail="La inscripción no está vinculada a un cliente.")

    estado_deuda = 'PAGADO' if saldo_pendiente == 0 and estado_pago == 'PAGADO' else 'PENDIENTE'
    cursor.execute('''
        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
        VALUES (?, 'CURSO', ?, ?, ?, ?, ?)
    ''', (id_cliente, id_inscripcion, f"Curso: {nombre_curso or 'Sin nombre'}", monto_total, estado_deuda, fecha_registro))
    return cursor.lastrowid


def _crear_deuda_cuota_si_falta(cursor, id_cuota: int):
    cursor.execute('''
        SELECT id_deuda FROM deudas
        WHERE tipo_deuda IN ('CUOTA_MENSUAL', 'CUOTA_ANUAL') AND id_referencia = ?
    ''', (id_cuota,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute('''
        SELECT id_cliente, tipo_cuota, anio, mes, monto, estado_pago
        FROM cuotas_asociados
        WHERE id_cuota = ?
    ''', (id_cuota,))
    cuota = cursor.fetchone()
    if not cuota:
        raise HTTPException(status_code=404, detail="Cuota no encontrada.")

    id_cliente, tipo_cuota, anio, mes, monto, estado_pago = cuota
    tipo_deuda = 'CUOTA_MENSUAL' if tipo_cuota == 'Mensual' else 'CUOTA_ANUAL'
    concepto = f"Cuota mensual {mes:02d}/{anio}" if tipo_cuota == 'Mensual' and mes else f"Cuota anual {anio}"
    estado_deuda = 'PAGADO' if estado_pago == 'PAGADO' else 'PENDIENTE'
    fecha_generacion = f"{anio}-{(mes or 1):02d}-01"

    cursor.execute('''
        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (id_cliente, tipo_deuda, id_cuota, concepto, monto, estado_deuda, fecha_generacion))
    return cursor.lastrowid


def _sincronizar_origen_deuda(cursor, deuda, nuevo_saldo: float, nuevo_estado: str, fecha_movimiento: str):
    """Sincroniza la deuda unificada con su inscripción o cuota de origen."""
    id_deuda, id_cliente, _, _, tipo_deuda, id_referencia = deuda

    if tipo_deuda == 'CURSO' and id_referencia:
        cursor.execute(
            "UPDATE inscripciones SET saldo_pendiente = ?, estado_pago = ? WHERE id_inscripcion = ?",
            (nuevo_saldo, nuevo_estado, id_referencia)
        )
    elif tipo_deuda in ('CUOTA_MENSUAL', 'CUOTA_ANUAL') and id_referencia:
        cursor.execute('''
            UPDATE cuotas_asociados
            SET estado_pago = ?,
                fecha_pago = CASE WHEN ? = 'PAGADO' THEN ? ELSE fecha_pago END
            WHERE id_cuota = ?
        ''', (nuevo_estado, nuevo_estado, fecha_movimiento, id_referencia))

        if tipo_deuda == 'CUOTA_ANUAL' and nuevo_estado == 'PAGADO':
            cursor.execute("SELECT anio FROM cuotas_asociados WHERE id_cuota = ?", (id_referencia,))
            row = cursor.fetchone()
            if row:
                anio_exento = row[0]
                cursor.execute('''
                    UPDATE cuotas_asociados
                    SET estado_pago = 'EXENTO', fecha_pago = ?
                    WHERE id_cliente = ?
                      AND tipo_cuota = 'Mensual'
                      AND anio = ?
                      AND estado_pago = 'PENDIENTE'
                ''', (fecha_movimiento, id_cliente, anio_exento))
                cursor.execute('''
                    UPDATE deudas
                    SET estado = 'EXENTO'
                    WHERE id_cliente = ?
                      AND tipo_deuda = 'CUOTA_MENSUAL'
                      AND id_referencia IN (
                          SELECT id_cuota FROM cuotas_asociados
                          WHERE id_cliente = ? AND tipo_cuota = 'Mensual'
                            AND anio = ? AND estado_pago = 'EXENTO'
                      )
                ''', (id_cliente, id_cliente, anio_exento))


def _obtener_deuda_para_movimiento(cursor, id_deuda: int):
    cursor.execute(
        "SELECT id_deuda, id_cliente, monto_total, estado, tipo_deuda, id_referencia FROM deudas WHERE id_deuda = ?",
        (id_deuda,)
    )
    deuda = cursor.fetchone()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada.")
    return deuda


def _registrar_abono_deuda(cursor, id_deuda: int, monto_abono: float, metodo_pago: str, observacion: str, fecha_pago: Optional[date] = None):
    deuda = _obtener_deuda_para_movimiento(cursor, id_deuda)

    id_deuda, id_cliente, monto_total, estado_actual, tipo_deuda, id_referencia = deuda

    if estado_actual == 'PAGADO':
        raise HTTPException(status_code=400, detail="Esta deuda ya está completamente pagada.")

    saldo_actual = _calcular_saldo_deuda(cursor, id_deuda)

    if monto_abono <= 0:
        raise HTTPException(status_code=400, detail="El monto del abono debe ser mayor a 0.")

    if monto_abono > saldo_actual:
        raise HTTPException(
            status_code=400,
            detail=f"El abono (${monto_abono:.2f}) excede el saldo pendiente (${saldo_actual:.2f})."
        )

    fecha_pago = (fecha_pago or date.today()).isoformat()
    nuevo_saldo = round(saldo_actual - monto_abono, 2)
    nuevo_estado = 'PAGADO' if nuevo_saldo == 0 else 'PENDIENTE'

    cursor.execute(
        "INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion) VALUES (?, ?, ?, ?, ?, ?)",
        (id_deuda, id_cliente, monto_abono, metodo_pago, fecha_pago, observacion)
    )
    cursor.execute("UPDATE deudas SET estado = ? WHERE id_deuda = ?", (nuevo_estado, id_deuda))

    _sincronizar_origen_deuda(cursor, deuda, nuevo_saldo, nuevo_estado, fecha_pago)

    return {
        "estatus": "exito",
        "mensaje": f"Abono de ${monto_abono:.2f} registrado correctamente.",
        "nuevo_saldo": nuevo_saldo,
        "estado_deuda": nuevo_estado,
    }


def _perdonar_saldo_deuda(cursor, id_deuda: int, monto_perdonado: float, observacion: str, fecha_perdon: Optional[date] = None):
    """Condona saldo sin crear un pago ni afectar los ingresos."""
    deuda = _obtener_deuda_para_movimiento(cursor, id_deuda)
    _, _, _, estado_actual, _, _ = deuda
    if estado_actual != 'PENDIENTE':
        raise HTTPException(status_code=400, detail="Esta deuda no tiene saldo pendiente para condonar.")
    if monto_perdonado <= 0:
        raise HTTPException(status_code=400, detail="El monto condonado debe ser mayor a 0.")

    saldo_actual = _calcular_saldo_deuda(cursor, id_deuda)
    if monto_perdonado > saldo_actual + 0.001:
        raise HTTPException(status_code=400, detail=f"La condonación (${monto_perdonado:.2f}) excede el saldo pendiente (${saldo_actual:.2f}).")

    fecha_texto = (fecha_perdon or date.today()).isoformat()
    nuevo_saldo = round(max(0, saldo_actual - monto_perdonado), 2)
    nuevo_estado = 'PAGADO' if nuevo_saldo <= 0.005 else 'PENDIENTE'
    cursor.execute('''
        UPDATE deudas
        SET saldo_perdonado = COALESCE(saldo_perdonado, 0) + ?,
            motivo_perdon = CASE WHEN ? <> '' THEN ? ELSE motivo_perdon END,
            fecha_perdon = ?,
            estado = ?
        WHERE id_deuda = ?
    ''', (monto_perdonado, observacion, observacion, fecha_texto, nuevo_estado, id_deuda))
    _sincronizar_origen_deuda(cursor, deuda, nuevo_saldo, nuevo_estado, fecha_texto)
    return {"id_deuda": id_deuda, "monto_perdonado": monto_perdonado, "nuevo_saldo": nuevo_saldo, "estado_deuda": nuevo_estado}


@router.post("/deudas/abono")
def registrar_abono_deuda(abono: DatosAbonoDeuda):
    """Registra un abono contra una deuda general. Liquida la deuda si el saldo llega a 0."""
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        resultado = _registrar_abono_deuda(
            cursor,
            abono.id_deuda,
            abono.monto_abono,
            abono.metodo_pago,
            abono.observacion
        )
        conexion.commit()
        return resultado
    except HTTPException:
        conexion.rollback()
        raise
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Error en sistema de pagos: {str(e)}")
    finally:
        conexion.close()


@router.post("/deudas/abonos-lote")
def registrar_abonos_lote(abono: DatosAbonosLote):
    """Registra pagos y, si aplica, condonaciones repartidas en una transacción."""
    deuda_ids = list(dict.fromkeys(abono.deuda_ids))
    monto_restante = round(abono.monto_total, 2)
    monto_perdonado_restante = round(abono.monto_perdonado, 2)

    if not deuda_ids:
        raise HTTPException(status_code=400, detail="No hay deudas seleccionadas para pagar.")

    if monto_restante < 0 or monto_perdonado_restante < 0:
        raise HTTPException(status_code=400, detail="Los montos no pueden ser negativos.")
    if monto_restante <= 0 and monto_perdonado_restante <= 0:
        raise HTTPException(status_code=400, detail="Indica un pago o una condonación de saldo.")

    pagos_por_metodo = abono.pagos or ([] if monto_restante == 0 else [
        PagoPorMetodo(metodo_pago=abono.metodo_pago, monto=monto_restante)
    ])
    total_por_metodos = round(sum(pago.monto for pago in pagos_por_metodo), 2)
    if monto_restante > 0 and (not pagos_por_metodo or any(pago.monto <= 0 for pago in pagos_por_metodo)):
        raise HTTPException(status_code=400, detail="Cada método de pago debe tener un monto mayor a 0.")
    if abs(total_por_metodos - monto_restante) > 0.001:
        raise HTTPException(status_code=400, detail="La suma de los métodos de pago debe coincidir con el monto total.")

    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        placeholders = ",".join("?" for _ in deuda_ids)
        cursor.execute(f'''
            SELECT id_deuda, id_cliente, monto_total, estado, fecha_generacion
            FROM deudas
            WHERE id_deuda IN ({placeholders})
            ORDER BY date(fecha_generacion) ASC, id_deuda ASC
        ''', deuda_ids)
        deudas = [dict(row) for row in cursor.fetchall()]

        if len(deudas) != len(deuda_ids):
            raise HTTPException(status_code=404, detail="Una o más deudas seleccionadas no existen.")

        clientes = {deuda["id_cliente"] for deuda in deudas}
        if len(clientes) > 1:
            raise HTTPException(status_code=400, detail="Todas las deudas deben pertenecer al mismo cliente.")

        id_cliente_real = next(iter(clientes))
        if abono.id_cliente is not None and abono.id_cliente != id_cliente_real:
            raise HTTPException(status_code=400, detail="Las deudas no pertenecen al cliente indicado.")

        saldos = []
        saldo_total = 0.0
        for deuda in deudas:
            if deuda["estado"] != "PENDIENTE":
                continue
            saldo = _calcular_saldo_deuda(cursor, deuda["id_deuda"])
            if saldo and saldo > 0:
                saldo = round(saldo, 2)
                saldos.append((deuda["id_deuda"], saldo))
                saldo_total = round(saldo_total + saldo, 2)

        if not saldos:
            raise HTTPException(status_code=400, detail="No hay saldo pendiente en las deudas seleccionadas.")

        if monto_restante + monto_perdonado_restante > saldo_total + 0.001:
            raise HTTPException(
                status_code=400,
                detail=f"El pago y la condonación exceden el saldo total pendiente (${saldo_total:.2f})."
            )

        condonaciones_aplicadas = []
        for id_deuda, saldo in saldos:
            if monto_perdonado_restante <= 0:
                break
            monto_condonar = round(min(monto_perdonado_restante, saldo), 2)
            resultado = _perdonar_saldo_deuda(
                cursor, id_deuda, monto_condonar, abono.observacion, abono.fecha_pago
            )
            condonaciones_aplicadas.append(resultado)
            monto_perdonado_restante = round(monto_perdonado_restante - monto_condonar, 2)

        # La condonación cambia los saldos disponibles para los pagos posteriores.
        saldos = [
            (id_deuda, saldo_actual)
            for id_deuda, _ in saldos
            if (saldo_actual := _calcular_saldo_deuda(cursor, id_deuda)) > 0.005
        ]

        pagos_aplicados = []
        indice_deuda = 0
        saldo_deuda_actual = saldos[0][1] if saldos else 0
        for pago in pagos_por_metodo:
            monto_por_aplicar = round(pago.monto, 2)
            while monto_por_aplicar > 0 and indice_deuda < len(saldos):
                id_deuda = saldos[indice_deuda][0]
                monto_aplicar = round(min(monto_por_aplicar, saldo_deuda_actual), 2)
                resultado = _registrar_abono_deuda(
                    cursor,
                    id_deuda,
                    monto_aplicar,
                    pago.metodo_pago,
                    abono.observacion,
                    abono.fecha_pago,
                )
                pagos_aplicados.append({
                    "id_deuda": id_deuda,
                    "metodo_pago": pago.metodo_pago,
                    "monto_aplicado": monto_aplicar,
                    "nuevo_saldo": resultado["nuevo_saldo"],
                    "estado_deuda": resultado["estado_deuda"],
                })
                monto_por_aplicar = round(monto_por_aplicar - monto_aplicar, 2)
                monto_restante = round(monto_restante - monto_aplicar, 2)
                saldo_deuda_actual = round(saldo_deuda_actual - monto_aplicar, 2)
                if saldo_deuda_actual <= 0:
                    indice_deuda += 1
                    if indice_deuda < len(saldos):
                        saldo_deuda_actual = saldos[indice_deuda][1]

        conexion.commit()
        return {
            "estatus": "exito",
            "mensaje": "Abono múltiple registrado correctamente.",
            "pagos_aplicados": pagos_aplicados,
            "condonaciones_aplicadas": condonaciones_aplicadas,
            "monto_no_usado": monto_restante,
        }
    except HTTPException:
        conexion.rollback()
        raise
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Error en abono múltiple: {str(e)}")
    finally:
        conexion.close()


# ==========================================
# MÓDULO: RESUMEN FINANCIERO DEL DASHBOARD
# ==========================================
@router.get("/dashboard")
def obtener_dashboard_financiero():
    """Resume cobros, cuentas por cobrar y actividad de cursos para el panel principal."""
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        # Mantiene vigentes los estados automáticos de cursos antes de contarlos.
        from routers.cursos import _actualizar_estatus_automaticos
        _actualizar_estatus_automaticos(cursor)
        conexion.commit()

        hoy = date.today()
        inicio_mes = hoy.replace(day=1)
        if inicio_mes.month == 1:
            inicio_mes_anterior = inicio_mes.replace(year=inicio_mes.year - 1, month=12)
        else:
            inicio_mes_anterior = inicio_mes.replace(month=inicio_mes.month - 1)

        cursor.execute('''
            SELECT COALESCE(SUM(monto_pagado), 0)
            FROM pagos_deudas
            WHERE date(fecha_pago) >= date(?)
              AND date(fecha_pago) < date(?, '+1 month')
        ''', (inicio_mes.isoformat(), inicio_mes.isoformat()))
        ingresos_mes = float(cursor.fetchone()[0] or 0)

        cursor.execute('''
            SELECT COALESCE(SUM(monto_pagado), 0)
            FROM pagos_deudas
            WHERE date(fecha_pago) >= date(?)
              AND date(fecha_pago) < date(?)
        ''', (inicio_mes_anterior.isoformat(), inicio_mes.isoformat()))
        ingresos_mes_anterior = float(cursor.fetchone()[0] or 0)

        cursor.execute('''
            SELECT COALESCE(SUM(d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                SELECT SUM(pd.monto_pagado)
                FROM pagos_deudas pd
                WHERE pd.id_deuda = d.id_deuda
            ), 0)), 0)
            FROM deudas d
            WHERE d.estado = 'PENDIENTE'
        ''')
        cuentas_por_cobrar = float(cursor.fetchone()[0] or 0)

        periodo_actual = inicio_mes.strftime('%Y-%m')
        cursor.execute('''
            SELECT COUNT(DISTINCT c.id_curso), COUNT(i.id_inscripcion)
            FROM cursos c
            LEFT JOIN inscripciones i ON i.id_curso = c.id_curso
            WHERE UPPER(COALESCE(c.estatus, 'ACTIVO')) = 'ACTIVO'
              AND strftime('%Y-%m', c.fecha_inicio) = ?
        ''', (periodo_actual,))
        cursos_activos, participantes_inscritos = cursor.fetchone()

        meses = []
        cursor.execute('''
            WITH RECURSIVE serie(mes, indice) AS (
                SELECT date(?, 'start of month', '-5 months'), 0
                UNION ALL
                SELECT date(mes, '+1 month'), indice + 1 FROM serie WHERE indice < 5
            )
            SELECT mes FROM serie
        ''', (inicio_mes.isoformat(),))
        for fila in cursor.fetchall():
            mes_inicio = fila[0]
            cursor.execute('''
                SELECT COALESCE(SUM(monto_pagado), 0)
                FROM pagos_deudas
                WHERE strftime('%Y-%m', fecha_pago) = strftime('%Y-%m', ?)
            ''', (mes_inicio,))
            ingresos = float(cursor.fetchone()[0] or 0)
            cursor.execute('''
                SELECT COALESCE(SUM(d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                    SELECT SUM(pd.monto_pagado)
                    FROM pagos_deudas pd
                    WHERE pd.id_deuda = d.id_deuda
                ), 0)), 0)
                FROM deudas d
                WHERE strftime('%Y-%m', d.fecha_generacion) = strftime('%Y-%m', ?)
                  AND d.estado = 'PENDIENTE'
            ''', (mes_inicio,))
            por_cobrar = float(cursor.fetchone()[0] or 0)
            fecha_mes = datetime.strptime(mes_inicio, '%Y-%m-%d')
            meses.append({
                "name": ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"][fecha_mes.month - 1],
                "ingresos": round(ingresos, 2),
                "por_cobrar": round(por_cobrar, 2),
            })

        comparativa = None if ingresos_mes_anterior == 0 else round(((ingresos_mes - ingresos_mes_anterior) / ingresos_mes_anterior) * 100, 1)
        return {
            "ingresos_mes": round(ingresos_mes, 2),
            "ingresos_mes_anterior": round(ingresos_mes_anterior, 2),
            "comparativa_mes": comparativa,
            "cuentas_por_cobrar": round(cuentas_por_cobrar, 2),
            "cursos_activos": cursos_activos or 0,
            "participantes_inscritos": participantes_inscritos or 0,
            "flujo_mensual": meses,
        }
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Error al obtener el resumen financiero: {str(e)}")
    finally:
        conexion.close()


# ==========================================
# MÓDULO: CONSULTA DE DEUDAS GLOBALES (NUEVO MODELO)
# ==========================================
@router.get("/deudas")
def obtener_deudas():
    """Lee todas las deudas pendientes desde la tabla centralizada `deudas`."""
    try:
        conexion = get_db_connection()
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        cursor.execute('''
            SELECT
                d.id_cliente,
                cl.nombre,
                SUM(d.monto_total) as totalBalance,
                SUM(d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                    SELECT SUM(pd.monto_pagado) FROM pagos_deudas pd WHERE pd.id_deuda = d.id_deuda
                ), 0)) as overdueBalance,
                MIN(d.fecha_generacion) as oldestDebtDate
            FROM deudas d
            JOIN clientes cl ON d.id_cliente = cl.id_cliente
            WHERE d.estado = 'PENDIENTE'
            GROUP BY d.id_cliente, cl.nombre
            HAVING overdueBalance > 0
            ORDER BY overdueBalance DESC
        ''')
        filas = cursor.fetchall()

        deudas = []
        for row in filas:
            deuda = dict(row)
            deuda["id_cliente_num"] = deuda["id_cliente"]
            deuda["id"] = f"CLI-{str(deuda['id_cliente']).zfill(4)}"
            deuda["name"] = deuda["nombre"]
            deuda["status"] = "Con Saldo Pendiente"
            deuda["isOverdue"] = True
            deuda["totalBalanceFormateado"] = f"${deuda['totalBalance']:,.2f}"
            deuda["overdueBalanceFormateado"] = f"${deuda['overdueBalance']:,.2f}"
            deudas.append(deuda)

        conexion.close()
        return deudas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# MÓDULO: SALDO DE UNA DEUDA INDIVIDUAL
# ==========================================
@router.get("/deudas/{id_deuda}/saldo")
def obtener_saldo_deuda(id_deuda: int):
    """Devuelve el saldo actual pendiente de una deuda específica."""
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute(
            "SELECT monto_total, COALESCE(saldo_perdonado, 0), estado FROM deudas WHERE id_deuda = ?", (id_deuda,)
        )
        row = cursor.fetchone()
        if not row:
            conexion.close()
            raise HTTPException(status_code=404, detail="Deuda no encontrada.")
        monto_total, saldo_perdonado, estado = row
        cursor.execute(
            "SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_deudas WHERE id_deuda = ?", (id_deuda,)
        )
        pagado = cursor.fetchone()[0]
        saldo_pendiente = 0 if estado == 'PAGADO' else round(monto_total - saldo_perdonado - pagado, 2)
        conexion.close()
        return {"id_deuda": id_deuda, "monto_total": monto_total, "pagado": pagado, "saldo_perdonado": saldo_perdonado, "saldo_pendiente": saldo_pendiente, "estado": estado}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# MÓDULO: DETALLE DE DEUDA POR CLIENTE (NUEVO MODELO)
# ==========================================
@router.get("/deudas/{id_cliente}")
def obtener_deuda_cliente(id_cliente: int):
    """Devuelve las deudas pendientes de un cliente desde la tabla centralizada `deudas`."""
    try:
        conexion = get_db_connection()
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        cursor.execute('''
            SELECT
                d.id_deuda,
                d.tipo_deuda,
                d.concepto AS nombre_curso,
                d.fecha_generacion AS fecha_registro,
                d.monto_total,
                COALESCE((
                    SELECT SUM(pd.monto_pagado) FROM pagos_deudas pd WHERE pd.id_deuda = d.id_deuda
                ), 0) AS abonado,
                d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                    SELECT SUM(pd.monto_pagado) FROM pagos_deudas pd WHERE pd.id_deuda = d.id_deuda
                ), 0) AS saldo_pendiente,
                d.estado AS estado_pago
            FROM deudas d
            WHERE d.id_cliente = ? AND d.estado = 'PENDIENTE'
            ORDER BY d.fecha_generacion ASC
        ''', (id_cliente,))

        resultado = [dict(row) for row in cursor.fetchall()]
        conexion.close()
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# MÓDULO: HISTORIAL DE MOVIMIENTOS POR CLIENTE (NUEVO MODELO)
# ==========================================
@router.get("/movimientos/{id_cliente}")
def obtener_movimientos_cliente(id_cliente: int):
    """Devuelve el historial de pagos del cliente desde la tabla centralizada `pagos_deudas`."""
    try:
        conexion = get_db_connection()
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        cursor.execute('''
            SELECT
                pd.id_pago_deuda AS id_pago,
                pd.fecha_pago,
                d.concepto AS nombre_curso,
                d.tipo_deuda,
                pd.metodo_pago,
                pd.monto_pagado,
                pd.observacion
            FROM pagos_deudas pd
            JOIN deudas d ON pd.id_deuda = d.id_deuda
            WHERE pd.id_cliente = ?
            ORDER BY pd.fecha_pago DESC
        ''', (id_cliente,))

        movimientos = [dict(row) for row in cursor.fetchall()]
        conexion.close()
        return movimientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# MÓDULO: HISTORIAL GLOBAL DE TRANSACCIONES (NUEVO)
# ==========================================
@router.get("/historial")
def obtener_historial_transacciones():
    """Devuelve todas las transacciones financieras (ingresos y egresos futuros) registradas en el sistema."""
    try:
        conexion = get_db_connection()
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        cursor.execute('''
            SELECT
                pd.id_pago_deuda,
                pd.fecha_pago,
                d.tipo_deuda,
                cl.nombre AS nombre_cliente,
                d.concepto,
                pd.monto_pagado,
                pd.metodo_pago,
                pd.observacion
            FROM pagos_deudas pd
            JOIN deudas d ON pd.id_deuda = d.id_deuda
            JOIN clientes cl ON pd.id_cliente = cl.id_cliente
            ORDER BY pd.id_pago_deuda DESC
        ''')
        rows = cursor.fetchall()
        conexion.close()

        transacciones = []
        for r in rows:
            tipo_db = r["tipo_deuda"]
            id_pago = r["id_pago_deuda"]
            
            # Mapear tipo_deuda a los tipos esperados por el frontend
            if tipo_db == "CURSO":
                tipo_front = "CURSO"
                folio = f"C-{1000 + id_pago}"
            elif tipo_db in ("CUOTA_MENSUAL", "CUOTA_ANUAL"):
                tipo_front = "CUOTA"
                folio = f"Q-{1000 + id_pago}"
            elif tipo_db == "COMPRA":
                tipo_front = "COMPRA"
                folio = f"E-{1000 + id_pago}"
            else:
                tipo_front = "VENTA"
                folio = f"F-{1000 + id_pago}"

            transacciones.append({
                "id": f"TRX-{str(id_pago).zfill(3)}",
                "date": r["fecha_pago"],
                "serieFolio": folio,
                "client": r["nombre_cliente"] or "Público General",
                "type": tipo_front,
                "concept": r["concepto"],
                "amount": r["monto_pagado"],
                "paymentMethod": r["metodo_pago"].capitalize() if r["metodo_pago"] else "",
                "observation": r["observacion"] or "",
                "status": "COMPLETADO"
            })

        return transacciones
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
