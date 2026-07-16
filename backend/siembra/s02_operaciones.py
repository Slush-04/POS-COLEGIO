"""
s02_operaciones.py — Simulación de operaciones reales
=====================================================
Usa los endpoints reales del backend (vía TestClient) para simular
operaciones como las haría un usuario: ventas POS, inscripciones a
cursos, pagos de cuotas y abonos a deudas.

Todas las fechas quedan entre enero y julio de 2026.
"""

import os
import sys
import sqlite3
import glob

# Asegurar que el paquete backend sea importable
backend_dir = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, backend_dir)

# Asegurar que el venv del backend esté disponible
venv_site = glob.glob(os.path.join(backend_dir, "venv", "lib", "python*", "site-packages"))
if venv_site:
    sys.path.insert(0, venv_site[0])

from database import get_db_connection
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ============================================================
# HELPERS
# ============================================================

def _obtener_clientes():
    """Devuelve todos los clientes activos."""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id_cliente, nombre, tipo_cliente FROM clientes WHERE estatus = 1 ORDER BY id_cliente")
    clientes = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return clientes


def _obtener_cursos_pasados():
    """Devuelve cursos cuya fecha_inicio ya pasó (aptos para inscripciones históricas)."""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id_curso, nombre, precio_general, precio_asociado,
               precio_asociado_externo, precio_estudiante, precio_colaborador,
               fecha_inicio
        FROM cursos
        WHERE date(fecha_inicio) <= date('now')
          AND estatus = 'ACTIVO'
        ORDER BY fecha_inicio ASC
    """)
    cursos = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return cursos


def _obtener_inventario():
    """Devuelve artículos de inventario activos con stock disponible."""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, nombre, precio_venta, stock_actual FROM inventario WHERE estatus = 1 AND stock_actual > 0")
    items = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return items


def _obtener_deudas_pendientes():
    """Devuelve deudas pendientes con saldo > 0."""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.id_deuda, d.id_cliente, d.tipo_deuda, d.concepto, d.monto_total,
               COALESCE(d.saldo_perdonado, 0) as saldo_perdonado,
               COALESCE((SELECT SUM(pd.monto_pagado) FROM pagos_deudas pd WHERE pd.id_deuda = d.id_deuda), 0) as total_pagado
        FROM deudas d
        WHERE d.estado = 'PENDIENTE'
        ORDER BY d.fecha_generacion ASC
    """)
    deudas = []
    for r in cursor.fetchall():
        d = dict(r)
        saldo = round(d["monto_total"] - d["saldo_perdonado"] - d["total_pagado"], 2)
        if saldo > 0:
            d["saldo_restante"] = saldo
            deudas.append(d)
    conn.close()
    return deudas


def _precio_por_tarifa(curso, tipo_cliente):
    """Devuelve el precio según tipo de cliente."""
    mapa = {
        "Asociado": "precio_asociado",
        "Asociado Externo": "precio_asociado_externo",
        "Estudiante": "precio_estudiante",
        "Colaborador": "precio_colaborador",
    }
    campo = mapa.get(tipo_cliente, "precio_general")
    return curso.get(campo, curso["precio_general"])


def _tarifa_por_tipo(tipo_cliente):
    """Devuelve la clave de tarifa para inscripciones."""
    mapa = {
        "Asociado": "asociado",
        "Asociado Externo": "asociado_externo",
        "Estudiante": "estudiante",
        "Colaborador": "colaborador",
    }
    return mapa.get(tipo_cliente, "general")


# ============================================================
# SIMULACIÓN DE VENTAS POS (CONTADO)
# ============================================================

def simular_ventas_contado():
    """Simula 6 ventas de contado a través del POS usando el endpoint real."""
    print("\n  ── Ventas de Contado (POS) ──")
    clientes = _obtener_clientes()
    inventario = _obtener_inventario()

    if not inventario:
        print("    [SKIP] No hay inventario disponible para ventas.")
        return

    # Escenarios de venta variados
    ventas = [
        {
            "desc": "Venta de 1 Manual a cliente general",
            "id_cliente": next((c["id_cliente"] for c in clientes if c["tipo_cliente"] == "General"), None),
            "items": [{"id": inventario[0]["id"], "type": "inventario", "name": inventario[0]["nombre"], "price": inventario[0]["precio_venta"], "quantity": 1}],
            "metodo": "efectivo",
        },
        {
            "desc": "Venta de 2 Guías a estudiante",
            "id_cliente": next((c["id_cliente"] for c in clientes if c["tipo_cliente"] == "Estudiante"), None),
            "items": [{"id": inventario[1]["id"], "type": "inventario", "name": inventario[1]["nombre"], "price": inventario[1]["precio_venta"], "quantity": 2}],
            "metodo": "tarjeta",
        },
        {
            "desc": "Venta de 3 Agendas sin cliente (público general)",
            "id_cliente": None,
            "items": [{"id": inventario[2]["id"], "type": "inventario", "name": inventario[2]["nombre"], "price": inventario[2]["precio_venta"], "quantity": 3}],
            "metodo": "efectivo",
        },
        {
            "desc": "Venta combinada (Manual + Agenda) a asociado",
            "id_cliente": next((c["id_cliente"] for c in clientes if c["tipo_cliente"] == "Asociado"), None),
            "items": [
                {"id": inventario[0]["id"], "type": "inventario", "name": inventario[0]["nombre"], "price": inventario[0]["precio_venta"], "quantity": 1},
                {"id": inventario[2]["id"], "type": "inventario", "name": inventario[2]["nombre"], "price": inventario[2]["precio_venta"], "quantity": 1},
            ],
            "metodo": "transferencia",
        },
        {
            "desc": "Venta de Constancia Digital",
            "id_cliente": next((c["id_cliente"] for c in clientes if c["tipo_cliente"] == "Colaborador"), None),
            "items": [{"id": inventario[3]["id"], "type": "inventario", "name": inventario[3]["nombre"], "price": inventario[3]["precio_venta"], "quantity": 1}],
            "metodo": "efectivo",
        },
        {
            "desc": "Venta de Reposición de Credencial",
            "id_cliente": next((c["id_cliente"] for c in clientes if c["tipo_cliente"] == "Asociado Externo"), None),
            "items": [{"id": inventario[4]["id"], "type": "inventario", "name": inventario[4]["nombre"], "price": inventario[4]["precio_venta"], "quantity": 1}],
            "metodo": "tarjeta",
        },
    ]

    exitos = 0
    for venta in ventas:
        subtotal = sum(i["price"] * i["quantity"] for i in venta["items"])
        total = round(subtotal, 2)

        payload = {
            "id_cliente": venta["id_cliente"],
            "tipo_pago": "pago",
            "metodo_pago": venta["metodo"],
            "monto_total": total,
            "subtotal": total,
            "monto_base": total,
            "descuento_porcentaje": 0.0,
            "descuento_monto": 0.0,
            "aplica_iva": False,
            "iva_porcentaje": 0.0,
            "iva_monto": 0.0,
            "items": venta["items"],
            "observacion": f"Siembra inicial: {venta['desc']}",
            "pagos": [{"metodo_pago": venta["metodo"], "monto": total}],
        }

        resp = client.post("/api/pos/checkout", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            print(f"    [OK] {venta['desc']} → Folio: {data.get('folio', '?')} | ${total:.2f}")
            exitos += 1
        else:
            print(f"    [FALLO] {venta['desc']} → {resp.status_code}: {resp.text[:120]}")

    print(f"    Resultado: {exitos}/{len(ventas)} ventas de contado exitosas.")


# ============================================================
# SIMULACIÓN DE VENTAS A CUENTA (POS)
# ============================================================

def simular_ventas_a_cuenta():
    """Simula 4 ventas a cuenta (crédito) a través del POS."""
    print("\n  ── Ventas a Cuenta (POS) ──")
    clientes = _obtener_clientes()
    inventario = _obtener_inventario()

    if not inventario:
        print("    [SKIP] No hay inventario disponible.")
        return

    # Elegir 4 clientes distintos con nombre
    clientes_cuenta = [c for c in clientes if c["tipo_cliente"] in ("General", "Asociado", "Asociado Externo", "Colaborador")][:4]

    if len(clientes_cuenta) < 4:
        print("    [SKIP] No hay suficientes clientes para ventas a cuenta.")
        return

    ventas = [
        {
            "desc": f"Venta a cuenta de Manual a {clientes_cuenta[0]['nombre']}",
            "id_cliente": clientes_cuenta[0]["id_cliente"],
            "items": [{"id": inventario[0]["id"], "type": "inventario", "name": inventario[0]["nombre"], "price": inventario[0]["precio_venta"], "quantity": 1}],
        },
        {
            "desc": f"Venta a cuenta de Guía a {clientes_cuenta[1]['nombre']}",
            "id_cliente": clientes_cuenta[1]["id_cliente"],
            "items": [{"id": inventario[1]["id"], "type": "inventario", "name": inventario[1]["nombre"], "price": inventario[1]["precio_venta"], "quantity": 1}],
        },
        {
            "desc": f"Venta a cuenta de 2 Agendas a {clientes_cuenta[2]['nombre']}",
            "id_cliente": clientes_cuenta[2]["id_cliente"],
            "items": [{"id": inventario[2]["id"], "type": "inventario", "name": inventario[2]["nombre"], "price": inventario[2]["precio_venta"], "quantity": 2}],
        },
        {
            "desc": f"Venta a cuenta combinada a {clientes_cuenta[3]['nombre']}",
            "id_cliente": clientes_cuenta[3]["id_cliente"],
            "items": [
                {"id": inventario[0]["id"], "type": "inventario", "name": inventario[0]["nombre"], "price": inventario[0]["precio_venta"], "quantity": 1},
                {"id": inventario[1]["id"], "type": "inventario", "name": inventario[1]["nombre"], "price": inventario[1]["precio_venta"], "quantity": 1},
            ],
        },
    ]

    exitos = 0
    for venta in ventas:
        subtotal = sum(i["price"] * i["quantity"] for i in venta["items"])
        total = round(subtotal, 2)

        payload = {
            "id_cliente": venta["id_cliente"],
            "tipo_pago": "cuenta",
            "metodo_pago": "efectivo",
            "monto_total": total,
            "subtotal": total,
            "monto_base": total,
            "descuento_porcentaje": 0.0,
            "descuento_monto": 0.0,
            "aplica_iva": False,
            "iva_porcentaje": 0.0,
            "iva_monto": 0.0,
            "items": venta["items"],
            "observacion": f"Siembra inicial: {venta['desc']}",
        }

        resp = client.post("/api/pos/checkout", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            print(f"    [OK] {venta['desc']} → Folio: {data.get('folio', '?')} | ${total:.2f}")
            exitos += 1
        else:
            print(f"    [FALLO] {venta['desc']} → {resp.status_code}: {resp.text[:120]}")

    print(f"    Resultado: {exitos}/{len(ventas)} ventas a cuenta exitosas.")


# ============================================================
# SIMULACIÓN DE INSCRIPCIONES A CURSOS
# ============================================================

def simular_inscripciones():
    """Simula 6 inscripciones a cursos pasados usando el endpoint real."""
    print("\n  ── Inscripciones a Cursos ──")
    clientes = _obtener_clientes()
    cursos = _obtener_cursos_pasados()

    if len(cursos) < 3:
        print("    [SKIP] No hay suficientes cursos pasados para inscripciones.")
        return

    # Seleccionar 3 cursos y 2 participantes por curso = 6 inscripciones
    inscripciones_plan = [
        # Curso 0: 2 clientes, pagados
        {"curso_idx": 0, "cliente_idx": 0, "pagado": True},
        {"curso_idx": 0, "cliente_idx": 5, "pagado": True},
        # Curso 1: 2 clientes, uno pendiente
        {"curso_idx": 1, "cliente_idx": 1, "pagado": True},
        {"curso_idx": 1, "cliente_idx": 6, "pagado": False},
        # Curso 2: 2 clientes, parcial
        {"curso_idx": 2, "cliente_idx": 2, "pagado": True},
        {"curso_idx": 2, "cliente_idx": 7, "pagado": False},
    ]

    exitos = 0
    for plan in inscripciones_plan:
        if plan["curso_idx"] >= len(cursos) or plan["cliente_idx"] >= len(clientes):
            continue

        curso = cursos[plan["curso_idx"]]
        cli = clientes[plan["cliente_idx"]]
        precio = _precio_por_tarifa(curso, cli["tipo_cliente"])
        tarifa = _tarifa_por_tipo(cli["tipo_cliente"])

        saldo = 0.0 if plan["pagado"] else precio
        estado = "PAGADO" if plan["pagado"] else "PENDIENTE"

        payload = {
            "id_cliente": cli["id_cliente"],
            "nombre": cli["nombre"],
            "tipo_tarifa": tarifa,
            "monto_total": precio,
            "saldo_pendiente": saldo,
            "estado_pago": estado,
            "facturado": 0,
        }

        resp = client.post(f"/api/cursos/{curso['id_curso']}/inscripciones", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            estado_txt = "pagada" if plan["pagado"] else "pendiente"
            print(f"    [OK] {cli['nombre']} → \"{curso['nombre']}\" ({estado_txt}) | ${precio:.2f}")
            exitos += 1
        else:
            print(f"    [FALLO] {cli['nombre']} → {curso['nombre']}: {resp.status_code}: {resp.text[:120]}")

    print(f"    Resultado: {exitos}/{len(inscripciones_plan)} inscripciones exitosas.")


# ============================================================
# SIMULACIÓN DE COBRO DE CUOTAS
# ============================================================

def simular_cobro_cuotas():
    """Simula el cobro de cuotas pendientes de asociados usando el endpoint real."""
    print("\n  ── Cobro de Cuotas de Asociados ──")

    # Buscar asociados activos con cuotas pendientes
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT ca.id_cliente, c.nombre
        FROM cuotas_asociados ca
        JOIN clientes c ON c.id_cliente = ca.id_cliente
        WHERE ca.estado_pago = 'PENDIENTE'
          AND c.estatus = 1
          AND c.estatus_operativo = 'Activo'
        LIMIT 3
    """)
    asociados_con_deuda = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not asociados_con_deuda:
        print("    [SKIP] No hay asociados con cuotas pendientes.")
        return

    exitos = 0
    for asociado in asociados_con_deuda:
        # Pagar 2 cuotas mensuales de este asociado
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) as pendientes, SUM(monto) as total_monto
            FROM cuotas_asociados
            WHERE id_cliente = ? AND tipo_cuota = 'Mensual' AND estado_pago = 'PENDIENTE'
        """, (asociado["id_cliente"],))
        info = dict(cur.fetchone())
        conn.close()

        cant_pagar = min(2, info["pendientes"])
        if cant_pagar == 0:
            continue

        monto_por_cuota = MONTO_CUOTA_MENSUAL = 500.0
        monto_total = cant_pagar * monto_por_cuota

        payload = {
            "id_cliente": asociado["id_cliente"],
            "tipo_cuota": "Mensual",
            "cantidad_a_pagar": cant_pagar,
            "monto_total": monto_total,
        }

        resp = client.post("/api/cuotas/pagar", json=payload)
        if resp.status_code == 200:
            print(f"    [OK] {asociado['nombre']}: {cant_pagar} cuota(s) pagada(s) | ${monto_total:.2f}")
            exitos += 1
        else:
            print(f"    [FALLO] {asociado['nombre']}: {resp.status_code}: {resp.text[:120]}")

    print(f"    Resultado: {exitos}/{len(asociados_con_deuda)} cobros de cuotas exitosos.")


# ============================================================
# SIMULACIÓN DE ABONOS A DEUDAS PENDIENTES
# ============================================================

def simular_abonos():
    """Simula 4 abonos parciales/totales a deudas pendientes usando el endpoint real."""
    print("\n  ── Abonos a Deudas Pendientes ──")
    deudas = _obtener_deudas_pendientes()

    if not deudas:
        print("    [SKIP] No hay deudas pendientes para abonar.")
        return

    # Tomar hasta 4 deudas distintas
    deudas_a_abonar = deudas[:4]
    exitos = 0

    for idx, deuda in enumerate(deudas_a_abonar):
        # Alternar entre abono parcial y total
        if idx % 2 == 0:
            # Abono parcial (50%)
            monto = round(deuda["saldo_restante"] * 0.5, 2)
            desc = "parcial (50%)"
        else:
            # Abono total
            monto = deuda["saldo_restante"]
            desc = "total"

        if monto <= 0:
            continue

        metodos = ["efectivo", "transferencia", "tarjeta", "efectivo"]
        payload = {
            "id_deuda": deuda["id_deuda"],
            "monto_abono": monto,
            "metodo_pago": metodos[idx % len(metodos)],
            "observacion": f"Siembra inicial: Abono {desc} a {deuda['concepto']}",
        }

        resp = client.post("/api/pagos/deudas/abono", json=payload)
        if resp.status_code == 200:
            print(f"    [OK] Abono {desc} a \"{deuda['concepto'][:40]}\" | ${monto:.2f} ({metodos[idx % len(metodos)]})")
            exitos += 1
        else:
            print(f"    [FALLO] Abono a deuda #{deuda['id_deuda']}: {resp.status_code}: {resp.text[:120]}")

    print(f"    Resultado: {exitos}/{len(deudas_a_abonar)} abonos exitosos.")


# ============================================================
# SIMULACIÓN DE COMPRAS (EGRESOS / ENTRADAS DE INVENTARIO)
# ============================================================

def simular_compras():
    """Simula 4 compras de inventario (egresos a proveedores).
    Se insertan directamente porque aún no existe endpoint de compras."""
    print("\n  ── Compras de Inventario ──")

    from database import generar_folio

    inventario = _obtener_inventario()
    if not inventario:
        print("    [SKIP] No hay inventario disponible.")
        return

    compras = [
        {"nombre": "Compra de 10 Manuales a proveedor", "id_inv": inventario[0]["id"], "cantidad": 10, "costo_unitario": 250.0},
        {"nombre": "Compra de 8 Guías a proveedor",     "id_inv": inventario[1]["id"], "cantidad": 8,  "costo_unitario": 180.0},
        {"nombre": "Compra de 15 Agendas a proveedor",  "id_inv": inventario[2]["id"], "cantidad": 15, "costo_unitario": 90.0},
        {"nombre": "Reposición de Credenciales",         "id_inv": inventario[4]["id"] if len(inventario) > 4 else inventario[0]["id"], "cantidad": 20, "costo_unitario": 40.0},
    ]

    conn = get_db_connection()
    exitos = 0
    try:
        cursor = conn.cursor()
        from datetime import datetime

        for compra in compras:
            total = round(compra["cantidad"] * compra["costo_unitario"], 2)
            folio = generar_folio('V', cursor)  # Usa serie V por ahora
            fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute('''
                INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
                VALUES (?, 'COMPRA', NULL, ?, 'COMPLETADA', ?)
            ''', (folio, total, fecha_actual))
            id_operacion = cursor.lastrowid

            cursor.execute('''
                INSERT INTO operacion_detalles (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad, precio_unitario, descuento, iva, importe_total)
                VALUES (?, 'INVENTARIO', ?, ?, ?, ?, 0, 0, ?)
            ''', (id_operacion, compra["id_inv"], compra["nombre"], compra["cantidad"], compra["costo_unitario"], total))

            # Actualizar stock
            cursor.execute("UPDATE inventario SET stock_actual = stock_actual + ? WHERE id = ?", (compra["cantidad"], compra["id_inv"]))

            # Registrar movimiento de inventario
            cursor.execute('''
                INSERT INTO movimientos_inventario (id_operacion, id_inventario, tipo_movimiento, cantidad, fecha_evento, observacion)
                VALUES (?, ?, 'ENTRADA', ?, ?, ?)
            ''', (id_operacion, compra["id_inv"], compra["cantidad"], fecha_actual, compra["nombre"]))

            print(f"    [OK] {compra['nombre']} → Folio: {folio} | ${total:.2f}")
            exitos += 1

        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"    [ERROR] {e}")
    finally:
        conn.close()

    print(f"    Resultado: {exitos}/{len(compras)} compras exitosas.")


# ============================================================
# EJECUTAR TODAS LAS SIMULACIONES
# ============================================================

def simular_operaciones():
    """Ejecuta la simulación completa de operaciones reales."""
    print("\n── Fase 2: Simulación de Operaciones ──")
    simular_ventas_contado()
    simular_ventas_a_cuenta()
    simular_inscripciones()
    simular_cobro_cuotas()
    simular_abonos()
    simular_compras()


if __name__ == "__main__":
    simular_operaciones()

