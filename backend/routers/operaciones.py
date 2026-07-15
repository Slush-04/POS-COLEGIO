import sqlite3
from datetime import datetime

from database import get_db_connection
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/operaciones",
    tags=["Operaciones"],
)


class SolicitudAnulacion(BaseModel):
    motivo: str = Field(min_length=1, max_length=500)


def _obtener_operacion(cursor, id_operacion: int):
    cursor.execute(
        "SELECT * FROM operaciones WHERE id_operacion = ?",
        (id_operacion,),
    )
    operacion = cursor.fetchone()
    if not operacion:
        raise HTTPException(status_code=404, detail="Operación no encontrada.")
    return operacion


def _calcular_estado_deuda(cursor, id_deuda: int):
    cursor.execute('''
        SELECT monto_total, COALESCE(saldo_perdonado, 0) AS saldo_perdonado, tipo_deuda,
               id_referencia, id_cliente
        FROM deudas
        WHERE id_deuda = ?
    ''', (id_deuda,))
    deuda = cursor.fetchone()
    if not deuda:
        return None

    cursor.execute('''
        SELECT COALESCE(SUM(monto_pagado), 0)
        FROM pagos_deudas
        WHERE id_deuda = ?
    ''', (id_deuda,))
    pagado = float(cursor.fetchone()[0] or 0)
    saldo = round(float(deuda["monto_total"]) - pagado - float(deuda["saldo_perdonado"]), 2)
    estado = "PAGADO" if saldo <= 0.005 else "PENDIENTE"
    return deuda, max(0.0, saldo), estado


def _restaurar_mensualidades_exentas(cursor, id_cliente: int, anio: int):
    """Revierte las exenciones que dependían de una anualidad ya anulada."""
    cursor.execute('''
        SELECT id_cuota
        FROM cuotas_asociados
        WHERE id_cliente = ?
          AND tipo_cuota = 'Mensual'
          AND anio = ?
          AND estado_pago = 'EXENTO'
    ''', (id_cliente, anio))
    ids_cuotas = [row[0] for row in cursor.fetchall()]
    if not ids_cuotas:
        return 0

    placeholders = ",".join("?" for _ in ids_cuotas)
    cursor.execute(f'''
        UPDATE cuotas_asociados
        SET estado_pago = 'PENDIENTE', fecha_pago = NULL
        WHERE id_cuota IN ({placeholders})
    ''', ids_cuotas)
    restauradas = cursor.rowcount
    cursor.execute(f'''
        UPDATE deudas
        SET estado = 'PENDIENTE'
        WHERE tipo_deuda = 'CUOTA_MENSUAL'
          AND id_referencia IN ({placeholders})
          AND estado = 'EXENTO'
    ''', ids_cuotas)
    return restauradas


def _sincronizar_deuda_revertida(cursor, id_deuda: int):
    calculo = _calcular_estado_deuda(cursor, id_deuda)
    if not calculo:
        return None

    deuda, saldo, estado = calculo
    cursor.execute('''
        UPDATE deudas
        SET estado = ?, fecha_anulacion = NULL, motivo_anulacion = NULL
        WHERE id_deuda = ?
    ''', (estado, id_deuda))

    tipo_deuda = deuda["tipo_deuda"]
    id_referencia = deuda["id_referencia"]
    if tipo_deuda == "CURSO" and id_referencia:
        cursor.execute('''
            UPDATE inscripciones
            SET saldo_pendiente = ?, estado_pago = ?
            WHERE id_inscripcion = ?
              AND COALESCE(estado_inscripcion, 'ACTIVA') = 'ACTIVA'
        ''', (saldo, estado, id_referencia))
    elif tipo_deuda in ("CUOTA_MENSUAL", "CUOTA_ANUAL") and id_referencia:
        cursor.execute('''
            UPDATE cuotas_asociados
            SET estado_pago = ?,
                fecha_pago = CASE WHEN ? = 'PENDIENTE' THEN NULL ELSE fecha_pago END
            WHERE id_cuota = ?
        ''', (estado, estado, id_referencia))

        if tipo_deuda == "CUOTA_ANUAL" and estado == "PENDIENTE":
            cursor.execute(
                "SELECT id_cliente, anio FROM cuotas_asociados WHERE id_cuota = ?",
                (id_referencia,),
            )
            anualidad = cursor.fetchone()
            if anualidad:
                _restaurar_mensualidades_exentas(
                    cursor,
                    anualidad["id_cliente"],
                    anualidad["anio"],
                )

    return {"id_deuda": id_deuda, "saldo": saldo, "estado": estado}


@router.get("/{id_operacion}")
def obtener_operacion(id_operacion: int):
    conexion = get_db_connection()
    conexion.row_factory = sqlite3.Row
    try:
        cursor = conexion.cursor()
        operacion = _obtener_operacion(cursor, id_operacion)
        cursor.execute(
            "SELECT * FROM operacion_detalles WHERE id_operacion = ? ORDER BY id_detalle",
            (id_operacion,),
        )
        detalles = [dict(row) for row in cursor.fetchall()]
        cursor.execute('''
            SELECT * FROM pagos_deudas
            WHERE id_operacion = ?
            ORDER BY id_pago_deuda
        ''', (id_operacion,))
        pagos = [dict(row) for row in cursor.fetchall()]
        cursor.execute('''
            SELECT * FROM movimientos_inventario
            WHERE id_operacion = ?
            ORDER BY id_movimiento
        ''', (id_operacion,))
        movimientos_inventario = [dict(row) for row in cursor.fetchall()]
        return {
            "operacion": dict(operacion),
            "detalles": detalles,
            "pagos": pagos,
            "movimientos_inventario": movimientos_inventario,
        }
    finally:
        conexion.close()


@router.post("/{id_operacion}/anular")
def anular_operacion(id_operacion: int, solicitud: SolicitudAnulacion):
    motivo = solicitud.motivo.strip()
    if not motivo:
        raise HTTPException(status_code=400, detail="El motivo de anulación es obligatorio.")

    conexion = get_db_connection()
    conexion.row_factory = sqlite3.Row
    try:
        # Bloquea la escritura antes de validar el estado para impedir que dos
        # solicitudes simultáneas creen reversos duplicados.
        conexion.execute("BEGIN IMMEDIATE")
        cursor = conexion.cursor()
        operacion = _obtener_operacion(cursor, id_operacion)
        if operacion["estado"] != "COMPLETADA":
            raise HTTPException(
                status_code=409,
                detail="La operación ya fue anulada o no se encuentra completada.",
            )

        cursor.execute(
            "SELECT motivo_anulacion_minimo FROM configuracion_operacion WHERE id = 1"
        )
        regla_motivo = cursor.fetchone()
        longitud_minima = int(regla_motivo[0]) if regla_motivo else 5
        if len(motivo) < longitud_minima:
            raise HTTPException(
                status_code=400,
                detail=f"El motivo debe contener al menos {longitud_minima} caracteres.",
            )

        fecha_anulacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        fecha_evento = operacion["fecha_evento"]
        cursor.execute('''
            UPDATE operaciones
            SET estado = 'ANULADA', fecha_anulacion = ?, motivo_anulacion = ?
            WHERE id_operacion = ? AND estado = 'COMPLETADA'
        ''', (fecha_anulacion, motivo, id_operacion))
        if cursor.rowcount != 1:
            raise HTTPException(status_code=409, detail="La operación ya fue anulada.")

        cursor.execute(
            "SELECT * FROM operacion_detalles WHERE id_operacion = ? ORDER BY id_detalle",
            (id_operacion,),
        )
        detalles = cursor.fetchall()

        # Reponer sólo salidas reales. Los servicios de inventario no generan
        # SALIDA_VENTA y, por lo tanto, no alteran existencias al anular.
        cursor.execute('''
            SELECT id_movimiento, id_inventario, cantidad
            FROM movimientos_inventario
            WHERE id_operacion = ? AND tipo_movimiento = 'SALIDA_VENTA'
            ORDER BY id_movimiento
        ''', (id_operacion,))
        salidas_inventario = cursor.fetchall()
        stock_restituido = 0
        for salida in salidas_inventario:
            cursor.execute(
                "UPDATE inventario SET stock_actual = stock_actual + ? WHERE id = ?",
                (salida["cantidad"], salida["id_inventario"]),
            )
            if cursor.rowcount != 1:
                raise HTTPException(
                    status_code=409,
                    detail=f"No se pudo restituir el artículo {salida['id_inventario']}.",
                )
            cursor.execute('''
                INSERT INTO movimientos_inventario
                (id_operacion, id_inventario, tipo_movimiento, cantidad,
                 fecha_evento, fecha_registro, observacion)
                VALUES (?, ?, 'ENTRADA_ANULACION', ?, ?, ?, ?)
            ''', (
                id_operacion,
                salida["id_inventario"],
                salida["cantidad"],
                fecha_evento,
                fecha_anulacion,
                f"Reversa del movimiento de inventario #{salida['id_movimiento']}: {motivo}",
            ))
            stock_restituido += int(salida["cantidad"])

        ids_inscripciones = {
            detalle["id_inscripcion"]
            for detalle in detalles
            if detalle["tipo_detalle"] == "CURSO" and detalle["id_inscripcion"]
        }
        cursor.execute(
            "SELECT id_inscripcion FROM inscripciones WHERE id_operacion = ?",
            (id_operacion,),
        )
        ids_inscripciones.update(row[0] for row in cursor.fetchall())
        for id_inscripcion in ids_inscripciones:
            cursor.execute('''
                UPDATE inscripciones
                SET estado_inscripcion = 'CANCELADA',
                    estado_pago = 'CANCELADO',
                    saldo_pendiente = 0,
                    fecha_cancelacion = ?,
                    motivo_cancelacion = ?
                WHERE id_inscripcion = ?
            ''', (fecha_anulacion, motivo, id_inscripcion))

        # Los pagos conservan su fecha económica. Así el original y su reversa
        # compensan el mismo periodo aunque la anulación se registre después.
        cursor.execute('''
            SELECT * FROM pagos_deudas
            WHERE id_operacion = ?
              AND COALESCE(tipo_movimiento, 'PAGO') = 'PAGO'
            ORDER BY id_pago_deuda
        ''', (id_operacion,))
        pagos_originales = cursor.fetchall()
        reversos_creados = 0
        ids_deudas_pagadas = set()
        for pago in pagos_originales:
            cursor.execute(
                "SELECT 1 FROM pagos_deudas WHERE id_pago_origen = ? AND tipo_movimiento = 'REVERSO'",
                (pago["id_pago_deuda"],),
            )
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="La operación ya contiene pagos revertidos.")
            fecha_pago_original = pago["fecha_evento"] or pago["fecha_pago"] or fecha_evento
            observacion = f"Reversa del pago #{pago['id_pago_deuda']}: {motivo}"
            cursor.execute('''
                INSERT INTO pagos_deudas
                (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago,
                 observacion, id_operacion, tipo_movimiento, id_pago_origen,
                 fecha_evento, fecha_registro_mov, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'REVERSO', ?, ?, ?, 'ACTIVO')
            ''', (
                pago["id_deuda"],
                pago["id_cliente"],
                -abs(float(pago["monto_pagado"])),
                pago["metodo_pago"],
                fecha_pago_original,
                observacion,
                id_operacion,
                pago["id_pago_deuda"],
                fecha_pago_original,
                fecha_anulacion,
            ))
            cursor.execute(
                "UPDATE pagos_deudas SET estado = 'ANULADO' WHERE id_pago_deuda = ?",
                (pago["id_pago_deuda"],),
            )
            ids_deudas_pagadas.add(pago["id_deuda"])
            reversos_creados += 1

        ids_deudas_anular = {
            detalle["id_deuda"]
            for detalle in detalles
            if detalle["id_deuda"]
            and detalle["tipo_detalle"] in ("INVENTARIO", "CURSO")
        }
        ids_deudas_recalcular = set(ids_deudas_pagadas)
        ids_deudas_recalcular.update(
            detalle["id_deuda"]
            for detalle in detalles
            if detalle["id_deuda"]
            and detalle["tipo_detalle"] in ("CUOTA", "DEUDA")
        )
        ids_deudas_recalcular.difference_update(ids_deudas_anular)

        for id_deuda in ids_deudas_anular:
            cursor.execute('''
                UPDATE deudas
                SET estado = 'ANULADA', fecha_anulacion = ?, motivo_anulacion = ?
                WHERE id_deuda = ?
            ''', (fecha_anulacion, motivo, id_deuda))

        deudas_recalculadas = []
        for id_deuda in ids_deudas_recalcular:
            resultado = _sincronizar_deuda_revertida(cursor, id_deuda)
            if resultado:
                deudas_recalculadas.append(resultado)

        # Una cuota detallada debe quedar sincronizada incluso si la operación
        # era a cuenta y no contenía todavía un pago.
        for detalle in detalles:
            if detalle["tipo_detalle"] != "CUOTA" or not detalle["id_referencia"]:
                continue
            cursor.execute('''
                SELECT id_cliente, tipo_cuota, anio
                FROM cuotas_asociados
                WHERE id_cuota = ?
            ''', (detalle["id_referencia"],))
            cuota = cursor.fetchone()
            if not cuota:
                continue
            cursor.execute('''
                UPDATE cuotas_asociados
                SET estado_pago = 'PENDIENTE', fecha_pago = NULL
                WHERE id_cuota = ?
            ''', (detalle["id_referencia"],))
            if cuota["tipo_cuota"] == "Anual":
                _restaurar_mensualidades_exentas(
                    cursor,
                    cuota["id_cliente"],
                    cuota["anio"],
                )

        conexion.commit()
        return {
            "estatus": "exito",
            "mensaje": "Operación anulada correctamente.",
            "id_operacion": id_operacion,
            "folio": operacion["folio"],
            "estado": "ANULADA",
            "fecha_anulacion": fecha_anulacion,
            "motivo": motivo,
            "reversos_creados": reversos_creados,
            "stock_restituido": stock_restituido,
            "inscripciones_canceladas": len(ids_inscripciones),
            "deudas_anuladas": len(ids_deudas_anular),
            "deudas_recalculadas": deudas_recalculadas,
        }
    except HTTPException:
        conexion.rollback()
        raise
    except sqlite3.IntegrityError as exc:
        conexion.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"No se pudo anular porque ya existe una reversa relacionada: {exc}",
        )
    except Exception as exc:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Error al anular la operación: {exc}")
    finally:
        conexion.close()
