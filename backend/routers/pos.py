from database import get_db_connection, generar_folio
from routers.pagos import (
    _calcular_saldo_deuda,
    _crear_deuda_cuota_si_falta,
    _crear_deuda_curso_si_falta,
    _registrar_abono_deuda,
)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

router = APIRouter(
    prefix="/api/pos",
    tags=["POS"],
)


class ItemCheckout(BaseModel):
    id: int
    type: str
    name: str = ""
    price: float
    quantity: int = 1


class MetodoPagoMonto(BaseModel):
    metodo_pago: str
    monto: float


class CheckoutPOS(BaseModel):
    id_cliente: Optional[int] = None
    tipo_pago: str
    metodo_pago: Optional[str] = "efectivo"
    monto_total: float
    items: List[ItemCheckout]
    fecha_pago: Optional[str] = None
    observacion: Optional[str] = ""
    descuento_porcentaje: Optional[float] = 0.0
    descuento_monto: Optional[float] = 0.0
    monto_base: Optional[float] = None
    subtotal: Optional[float] = None
    aplica_iva: Optional[bool] = False
    iva_porcentaje: Optional[float] = 0.0
    iva_monto: Optional[float] = 0.0
    pagos: Optional[List[MetodoPagoMonto]] = None


def _obtener_cliente(cursor, id_cliente: Optional[int]):
    if id_cliente is None:
        return None

    cursor.execute(
        "SELECT id_cliente, nombre, tipo_cliente FROM clientes WHERE id_cliente = ? AND estatus = 1",
        (id_cliente,)
    )
    cliente = cursor.fetchone()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado o inactivo.")
    return cliente


def _obtener_o_crear_publico_general(cursor):
    cursor.execute("SELECT id_cliente, nombre, tipo_cliente FROM clientes WHERE nombre = 'Público General'")
    row = cursor.fetchone()
    if row:
        return row
    cursor.execute('''
        INSERT INTO clientes (nombre, telefono, correo, tipo_cliente, estatus, estatus_operativo, sector)
        VALUES ('Público General', '0000000000', 'publico@general.com', 'General', 1, 'Activo', 'Normal')
    ''')
    id_cliente = cursor.lastrowid
    return (id_cliente, 'Público General', 'General')


def _crear_deuda_pos(cursor, id_cliente: int, concepto: str, monto_total: float):
    cursor.execute('''
        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
        VALUES (?, 'OTRO', NULL, ?, ?, 'PENDIENTE', ?)
    ''', (id_cliente, concepto, monto_total, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    return cursor.lastrowid


@router.post("/checkout")
def procesar_checkout_pos(checkout: CheckoutPOS):
    if not checkout.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío.")

    if checkout.tipo_pago not in ("pago", "cuenta"):
        raise HTTPException(status_code=400, detail="Tipo de pago inválido.")

    if checkout.tipo_pago == "cuenta" and checkout.id_cliente is None:
        raise HTTPException(status_code=400, detail="Selecciona un cliente antes de cargar una venta a cuenta.")

    for item in checkout.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"La cantidad de {item.name or item.id} debe ser mayor a 0.")
        if item.price < 0:
            raise HTTPException(status_code=400, detail=f"El precio de {item.name or item.id} no puede ser negativo.")

    # ── Recálculo autoritativo del backend (no confiar en frontend) ──
    subtotal_calculado = round(sum(item.price * item.quantity for item in checkout.items), 2)

    # Validar subtotal del frontend contra items
    subtotal_frontend = checkout.subtotal if checkout.subtotal is not None else (checkout.monto_base if checkout.monto_base is not None else subtotal_calculado)
    if abs(subtotal_calculado - round(subtotal_frontend, 2)) > 0.01:
        raise HTTPException(status_code=400, detail="El subtotal del carrito no coincide con el detalle de los items.")

    # Validar porcentaje de descuento (0–100)
    descuento_pct = checkout.descuento_porcentaje or 0.0
    if descuento_pct < 0 or descuento_pct > 100:
        raise HTTPException(status_code=400, detail="El porcentaje de descuento debe estar entre 0 y 100.")

    # Recalcular descuento desde porcentaje
    descuento_calculado = round(subtotal_calculado * (descuento_pct / 100), 2)
    if checkout.descuento_monto is not None and abs(descuento_calculado - checkout.descuento_monto) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"El descuento enviado (${checkout.descuento_monto:.2f}) no coincide con el calculado (${descuento_calculado:.2f})."
        )

    # Base gravable
    base_gravable = round(subtotal_calculado - descuento_calculado, 2)
    if base_gravable < 0:
        raise HTTPException(status_code=400, detail="El descuento no puede ser mayor que el subtotal.")

    # Recalcular IVA (16% solo si aplica)
    iva_calculado = round(base_gravable * 0.16, 2) if checkout.aplica_iva else 0.0
    if checkout.iva_monto is not None and abs(iva_calculado - checkout.iva_monto) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"El IVA enviado (${checkout.iva_monto:.2f}) no coincide con el calculado (${iva_calculado:.2f})."
        )

    # Total final (fuente de verdad del backend)
    total_final = round(base_gravable + iva_calculado, 2)
    if abs(checkout.monto_total - total_final) > 0.05:
        raise HTTPException(
            status_code=400,
            detail=f"El monto_total (${checkout.monto_total:.2f}) no coincide con el total calculado (${total_final:.2f})."
        )

    # Validar pagos contra total calculado (solo para tipo_pago pago)
    if checkout.tipo_pago == "pago":
        pagos_validar = checkout.pagos or [MetodoPagoMonto(metodo_pago=checkout.metodo_pago or "efectivo", monto=total_final)]
        total_pagos_anticipado = round(sum(p.monto for p in pagos_validar), 2)
        if abs(total_pagos_anticipado - total_final) > 0.05:
            raise HTTPException(
                status_code=400,
                detail=f"La suma de pagos (${total_pagos_anticipado:.2f}) no coincide con el total a cobrar (${total_final:.2f})."
            )

    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        
        # Obtener o crear cliente
        if checkout.id_cliente is not None:
            cliente = _obtener_cliente(cursor, checkout.id_cliente)
        elif checkout.tipo_pago == "pago":
            cliente = _obtener_o_crear_publico_general(cursor)
        else:
            cliente = None

        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        procesados = []
        deudas_a_pagar = []

        # ── Crear operación ──
        tipo_op = 'VENTA' if checkout.tipo_pago == 'pago' else 'VENTA_CUENTA'
        folio = generar_folio('V' if checkout.tipo_pago == 'pago' else 'VC', cursor)
        id_cliente_op = cliente[0] if cliente else None
        cursor.execute('''
            INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
            VALUES (?, ?, ?, ?, 'COMPLETADA', ?)
        ''', (folio, tipo_op, id_cliente_op, total_final, fecha_actual))
        id_operacion = cursor.lastrowid

        # Determinar la lista de pagos
        lista_pagos = checkout.pagos
        if not lista_pagos and checkout.tipo_pago == "pago":
            lista_pagos = [MetodoPagoMonto(metodo_pago=checkout.metodo_pago or "efectivo", monto=total_final)]

        # Distribuir el descuento e IVA proporcionalmente
        descuentos_items = {}
        ivas_items = {}
        descuento_acumulado = 0.0
        iva_acumulado = 0.0
        
        for i, item in enumerate(checkout.items):
            monto_item_base = round(item.price * item.quantity, 2)
            if i < len(checkout.items) - 1:
                if subtotal_calculado > 0:
                    descuento_item = round((monto_item_base / subtotal_calculado) * descuento_calculado, 2)
                else:
                    descuento_item = 0.0
                descuento_acumulado = round(descuento_acumulado + descuento_item, 2)
                
                # IVA del item
                monto_neto_sin_iva = round(monto_item_base - descuento_item, 2)
                if checkout.aplica_iva:
                    iva_item = round(monto_neto_sin_iva * 0.16, 2)
                else:
                    iva_item = 0.0
                iva_acumulado = round(iva_acumulado + iva_item, 2)
            else:
                descuento_item = round(descuento_calculado - descuento_acumulado, 2)
                if checkout.aplica_iva:
                    iva_item = round(iva_calculado - iva_acumulado, 2)
                else:
                    iva_item = 0.0
            
            descuentos_items[i] = descuento_item
            ivas_items[i] = iva_item

        for idx, item in enumerate(checkout.items):
            tipo_item = item.type.lower()
            cantidad = item.quantity
            monto_item = round(item.price * cantidad, 2)
            descuento_item = descuentos_items[idx]
            iva_item = ivas_items[idx]
            monto_neto_item = round(monto_item - descuento_item + iva_item, 2)

            if tipo_item == "curso":
                cursor.execute('''
                    SELECT nombre, capacidad_max, estatus,
                           (SELECT COUNT(*) FROM inscripciones WHERE id_curso = cursos.id_curso
                            AND COALESCE(estado_inscripcion, 'ACTIVA') = 'ACTIVA') AS inscritos
                    FROM cursos
                    WHERE id_curso = ?
                ''', (item.id,))
                curso = cursor.fetchone()
                if not curso:
                    raise HTTPException(status_code=404, detail=f"Curso no encontrado: {item.name or item.id}.")

                nombre_curso, capacidad_max, estatus_curso, inscritos = curso
                if (estatus_curso or 'ACTIVO').upper() == 'CERRADO':
                    raise HTTPException(status_code=400, detail=f"El curso {nombre_curso} está cerrado y ya no acepta participantes.")
                if capacidad_max is not None and inscritos + cantidad > capacidad_max:
                    raise HTTPException(status_code=400, detail=f"No hay cupo suficiente para {nombre_curso}.")

                # Distribuir el descuento e IVA unitarios entre los participantes
                descuento_unitario_acumulado = 0.0
                iva_unitario_acumulado = 0.0
                for q in range(cantidad):
                    if q < cantidad - 1:
                        descuento_unitario = round(descuento_item / cantidad, 2)
                        descuento_unitario_acumulado = round(descuento_unitario_acumulado + descuento_unitario, 2)
                        
                        iva_unitario = round(iva_item / cantidad, 2)
                        iva_unitario_acumulado = round(iva_unitario_acumulado + iva_unitario, 2)
                    else:
                        descuento_unitario = round(descuento_item - descuento_unitario_acumulado, 2)
                        iva_unitario = round(iva_item - iva_unitario_acumulado, 2)
                    
                    precio_neto_unitario = round(item.price - descuento_unitario + iva_unitario, 2)

                    id_cliente_db = cliente[0] if cliente else None
                    nombre_participante = cliente[1] if cliente else "Venta General"
                    tipo_tarifa = cliente[2] if cliente else "Público General"

                    if checkout.tipo_pago == "pago" and not cliente:
                        saldo_pendiente = 0
                        estado_pago = "PAGADO"
                    else:
                        saldo_pendiente = precio_neto_unitario
                        estado_pago = "PENDIENTE"

                    cursor.execute('''
                        INSERT INTO inscripciones (
                            id_cliente, id_curso, nombre_participante, tipo_tarifa,
                            monto_total, saldo_pendiente, estado_pago, facturado, id_operacion
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                    ''', (
                        id_cliente_db, item.id, nombre_participante, tipo_tarifa,
                        precio_neto_unitario, saldo_pendiente, estado_pago, id_operacion
                    ))
                    id_inscripcion = cursor.lastrowid

                    id_deuda_curso = None
                    if cliente:
                        id_deuda = _crear_deuda_curso_si_falta(cursor, id_inscripcion)
                        id_deuda_curso = id_deuda
                        cursor.execute('''
                            UPDATE deudas
                            SET monto_original = ?,
                                descuento = ?,
                                id_operacion = ?
                            WHERE id_deuda = ?
                        ''', (item.price, descuento_unitario, id_operacion, id_deuda))
                        
                        if checkout.tipo_pago == "pago" and precio_neto_unitario > 0:
                            deudas_a_pagar.append((id_deuda, precio_neto_unitario, f"Curso: {nombre_curso}"))

                    cursor.execute('''
                        INSERT INTO operacion_detalles
                        (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad,
                         precio_unitario, descuento, iva, importe_total, id_deuda, id_inscripcion)
                        VALUES (?, 'CURSO', ?, ?, 1, ?, ?, ?, ?, ?, ?)
                    ''', (id_operacion, item.id, nombre_curso, item.price, descuento_unitario,
                          iva_unitario, precio_neto_unitario, id_deuda_curso, id_inscripcion))

                procesados.append({"tipo": "curso", "id": item.id, "cantidad": cantidad})

            elif tipo_item == "inventario":
                cursor.execute(
                    "SELECT nombre, stock_actual, tipo FROM inventario WHERE id = ? AND estatus = 1",
                    (item.id,)
                )
                inventario = cursor.fetchone()
                if not inventario:
                    raise HTTPException(status_code=404, detail=f"Producto no encontrado: {item.name or item.id}.")

                nombre_producto, stock_actual, tipo_inventario = inventario
                if tipo_inventario == 'Producto':
                    if stock_actual < cantidad:
                        raise HTTPException(status_code=400, detail=f"No hay stock suficiente para {nombre_producto}.")
                    cursor.execute(
                        "UPDATE inventario SET stock_actual = stock_actual - ? WHERE id = ? AND stock_actual >= ?",
                        (cantidad, item.id, cantidad)
                    )
                    if cursor.rowcount == 0:
                        raise HTTPException(status_code=409, detail=f"Stock insuficiente para {nombre_producto} (conflicto de concurrencia).")

                    # Registrar movimiento de inventario
                    cursor.execute('''
                        INSERT INTO movimientos_inventario
                        (id_operacion, id_inventario, tipo_movimiento, cantidad, fecha_evento, observacion)
                        VALUES (?, ?, 'SALIDA_VENTA', ?, ?, ?)
                    ''', (id_operacion, item.id, cantidad, fecha_actual, f"Venta POS: {nombre_producto}"))

                id_deuda_inv = None
                if cliente and monto_neto_item > 0:
                    cursor.execute('''
                        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion, monto_original, descuento, id_operacion)
                        VALUES (?, 'OTRO', NULL, ?, ?, 'PENDIENTE', ?, ?, ?, ?)
                    ''', (cliente[0], f"Venta POS: {nombre_producto}", monto_neto_item, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), monto_item, descuento_item, id_operacion))
                    id_deuda_inv = cursor.lastrowid
                    
                    if checkout.tipo_pago == "pago":
                        deudas_a_pagar.append((id_deuda_inv, monto_neto_item, f"Producto: {nombre_producto}"))

                # Detalle de operación
                cursor.execute('''
                    INSERT INTO operacion_detalles
                    (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad,
                     precio_unitario, descuento, iva, importe_total, id_deuda)
                    VALUES (?, 'INVENTARIO', ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (id_operacion, item.id, nombre_producto, cantidad, item.price,
                      descuento_item, iva_item, monto_neto_item, id_deuda_inv))

                procesados.append({"tipo": "inventario", "id": item.id, "cantidad": cantidad})

            elif tipo_item == "cuota":
                if checkout.tipo_pago != "pago":
                    raise HTTPException(status_code=400, detail="Las cuotas pendientes deben cobrarse, no cargarse de nuevo a cuenta.")
                if not cliente:
                    raise HTTPException(status_code=400, detail="Selecciona un cliente para cobrar cuotas.")

                id_deuda = _crear_deuda_cuota_si_falta(cursor, item.id)
                
                # Obtener la deuda actual antes de modificarla
                cursor.execute("SELECT monto_total, descuento, monto_original FROM deudas WHERE id_deuda = ?", (id_deuda,))
                deuda_row = cursor.fetchone()
                if not deuda_row:
                    raise HTTPException(status_code=404, detail="Deuda de cuota no encontrada.")
                
                monto_orig = deuda_row[2] if (deuda_row[2] is not None) else deuda_row[0]
                nuevo_monto_total = round(monto_orig - descuento_item + iva_item, 2)
                
                # Actualizar la deuda con el nuevo descuento, IVA e id_operacion
                cursor.execute('''
                    UPDATE deudas
                    SET monto_original = ?,
                        descuento = ?,
                        monto_total = ?,
                        estado = 'PENDIENTE',
                        id_operacion = ?
                    WHERE id_deuda = ?
                ''', (monto_orig, descuento_item, nuevo_monto_total, id_operacion, id_deuda))

                # Propagar id_operacion a la cuota
                cursor.execute('UPDATE cuotas_asociados SET id_operacion = ? WHERE id_cuota = ?',
                               (id_operacion, item.id))
                
                saldo = _calcular_saldo_deuda(cursor, id_deuda)
                if saldo is None or saldo <= 0:
                    raise HTTPException(status_code=400, detail=f"La cuota {item.name or item.id} no tiene saldo pendiente.")

                if monto_neto_item > saldo + 0.01:
                    raise HTTPException(status_code=400, detail=f"El pago de {item.name or item.id} (${monto_neto_item:.2f}) excede su saldo pendiente (${saldo:.2f}).")

                deudas_a_pagar.append((id_deuda, monto_neto_item, f"Cuota: {item.name}"))

                # Detalle de operación
                cursor.execute('''
                    INSERT INTO operacion_detalles
                    (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad,
                     precio_unitario, descuento, iva, importe_total, id_deuda)
                    VALUES (?, 'CUOTA', ?, ?, 1, ?, ?, ?, ?, ?)
                ''', (id_operacion, item.id, item.name or f"Cuota #{item.id}", item.price,
                      descuento_item, iva_item, monto_neto_item, id_deuda))

                procesados.append({"tipo": "cuota", "id": item.id, "cantidad": cantidad})

            else:
                raise HTTPException(status_code=400, detail=f"Tipo de artículo inválido: {item.type}.")

        # Procesar los cobros con los métodos seleccionados
        if checkout.tipo_pago == "pago" and deudas_a_pagar:
            total_pagos = round(sum(p.monto for p in lista_pagos), 2)
            total_deudas = round(sum(d[1] for d in deudas_a_pagar), 2)
            
            if abs(total_pagos - total_deudas) > 0.05:
                raise HTTPException(
                    status_code=400,
                    detail=f"La suma de los pagos (${total_pagos:.2f}) no coincide con el total neto a cobrar (${total_deudas:.2f})."
                )

            fecha_pago_dt = None
            if checkout.fecha_pago:
                try:
                    fecha_pago_dt = date.fromisoformat(checkout.fecha_pago)
                except ValueError:
                    raise HTTPException(status_code=400, detail="Formato de fecha de pago inválido. Debe ser YYYY-MM-DD.")

            pagos_usados = [0.0] * len(lista_pagos)
            indice_pago = 0

            for id_deuda, monto_deuda, concepto_deuda in deudas_a_pagar:
                monto_restante_deuda = monto_deuda
                while monto_restante_deuda > 0 and indice_pago < len(lista_pagos):
                    pago = lista_pagos[indice_pago]
                    monto_disponible_pago = round(pago.monto - pagos_usados[indice_pago], 2)

                    if monto_disponible_pago <= 0:
                        indice_pago += 1
                        continue

                    monto_abono = round(min(monto_restante_deuda, monto_disponible_pago), 2)
                    if monto_abono > 0:
                        obs = f"Pago POS: {concepto_deuda}"
                        if checkout.observacion:
                            obs += f" - {checkout.observacion}"

                        _registrar_abono_deuda(
                            cursor,
                            id_deuda,
                            monto_abono,
                            pago.metodo_pago,
                            obs,
                            fecha_pago=fecha_pago_dt,
                            id_operacion=id_operacion
                        )
                        pagos_usados[indice_pago] = round(pagos_usados[indice_pago] + monto_abono, 2)
                        monto_restante_deuda = round(monto_restante_deuda - monto_abono, 2)

        conexion.commit()
        return {
            "estatus": "exito",
            "mensaje": "Venta registrada correctamente.",
            "id_operacion": id_operacion,
            "folio": folio,
            "total": total_final,
            "subtotal": subtotal_calculado,
            "descuento_porcentaje": descuento_pct,
            "descuento_monto": descuento_calculado,
            "aplica_iva": bool(checkout.aplica_iva),
            "iva_porcentaje": 16.0 if checkout.aplica_iva else 0.0,
            "iva_monto": iva_calculado,
            "procesados": procesados,
            "fecha": fecha_actual,
        }
    except HTTPException:
        conexion.rollback()
        raise
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar venta POS: {str(e)}")
    finally:
        conexion.close()
