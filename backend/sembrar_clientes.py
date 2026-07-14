from database import get_db_connection
import sqlite3
from datetime import date

MONTO_CUOTA_MENSUAL = 500.0
MONTO_CUOTA_ANUAL = 5000.0


CLIENTES_PRUEBA = [
    {
        "nombre": "Roberto Campos Ruiz",
        "telefono": "5511223344",
        "correo": "roberto.campos@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2025-11-12",
        "escenario_cuotas": "adeudo_atrasado",
        "sector": "Normal",
    },
    {
        "nombre": "Diana Morales Vega",
        "telefono": "5522334455",
        "correo": "diana.morales@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2026-01-20",
        "escenario_cuotas": "al_corriente",
        "sector": "Normal",
    },
    {
        "nombre": "Carlos Medina Flores",
        "telefono": "5533445566",
        "correo": "carlos.medina@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2026-03-08",
        "escenario_cuotas": "parcial",
        "sector": "Normal",
    },
    {
        "nombre": "Sofia Herrera Castro",
        "telefono": "5544556677",
        "correo": "sofia.herrera@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2026-02-15",
        "escenario_cuotas": "anual_pagada",
        "sector": "Normal",
    },
    {
        "nombre": "Miguel Ortega Sanchez",
        "telefono": "5555667788",
        "correo": "miguel.ortega@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2025-09-01",
        "escenario_cuotas": "inactivo_con_deuda",
        "estatus_operativo": "Inactivo",
        "sector": "Normal",
    },
    {
        "nombre": "Laura Paredes Nunez",
        "telefono": "5566778899",
        "correo": "laura.paredes@example.com",
        "tipo_cliente": "General",
        "fecha_registro": "2026-05-17",
        "sector": "Normal",
    },
    {
        "nombre": "Ana Salazar Ibarra",
        "telefono": "5577889900",
        "correo": "ana.salazar@example.com",
        "tipo_cliente": "Estudiante",
        "fecha_registro": "2026-06-03",
        "sector": "Educativo",
    },
    {
        "nombre": "Jorge Valdez Rios",
        "telefono": "5588990011",
        "correo": "jorge.valdez@example.com",
        "tipo_cliente": "Asociado Externo",
        "fecha_registro": "2026-04-22",
        "sector": "Empresarial",
    },
    {
        "nombre": "Patricia Lozano Cruz",
        "telefono": "5599001122",
        "correo": "patricia.lozano@example.com",
        "tipo_cliente": "Colaborador",
        "fecha_registro": "2026-02-28",
        "sector": "Interno",
    },
    {
        "nombre": "Fernando Aguilar Soto",
        "telefono": "5510101010",
        "correo": "fernando.aguilar@example.com",
        "tipo_cliente": "General",
        "fecha_registro": "2026-01-10",
        "sector": "Normal",
    },
]


def _rfc_prueba(indice: int, nombre: str) -> str:
    partes = nombre.upper().split()
    base = "".join(p[0] for p in partes[:4]).ljust(4, "X")
    return f"{base}900101{indice:03d}"


def _curp_prueba(indice: int, nombre: str) -> str:
    partes = nombre.upper().split()
    base = "".join(p[0] for p in partes[:4]).ljust(4, "X")
    return f"{base}900101HDFXXX{indice:02d}"


def _meses_desde(fecha_registro: str):
    inicio = date.fromisoformat(fecha_registro)
    actual = date.today()
    meses = []
    total = (actual.year - inicio.year) * 12 + (actual.month - inicio.month)

    for offset in range(total + 1):
        mes_base = inicio.month + offset
        anio = inicio.year + (mes_base - 1) // 12
        mes = ((mes_base - 1) % 12) + 1
        meses.append((anio, mes))

    return meses


def _insertar_deuda(cursor, id_cliente, tipo_deuda, id_referencia, concepto, monto, estado, fecha_generacion):
    cursor.execute('''
        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (id_cliente, tipo_deuda, id_referencia, concepto, monto, estado, fecha_generacion))
    return cursor.lastrowid


def _insertar_pago(cursor, id_deuda, id_cliente, monto, metodo, fecha_pago, observacion):
    cursor.execute('''
        INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (id_deuda, id_cliente, monto, metodo, fecha_pago, observacion))


def _crear_cuota_mensual(cursor, id_cliente, anio, mes, estado, monto=MONTO_CUOTA_MENSUAL, pago=0.0):
    fecha_pago = f"{anio}-{mes:02d}-05" if estado in ("PAGADO", "EXENTO") else None
    cursor.execute('''
        INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago, fecha_pago)
        VALUES (?, 'Mensual', ?, ?, ?, ?, ?)
    ''', (id_cliente, anio, mes, monto, estado, fecha_pago))
    id_cuota = cursor.lastrowid

    if estado == "EXENTO":
        return id_cuota

    concepto = f"Cuota mensual {mes:02d}/{anio}"
    id_deuda = _insertar_deuda(
        cursor,
        id_cliente,
        "CUOTA_MENSUAL",
        id_cuota,
        concepto,
        monto,
        estado,
        f"{anio}-{mes:02d}-01",
    )

    if pago > 0:
        _insertar_pago(
            cursor,
            id_deuda,
            id_cliente,
            pago,
            "efectivo",
            f"{anio}-{mes:02d}-05",
            f"Pago de prueba: {concepto}",
        )

    return id_cuota


def _crear_cuota_anual_pagada(cursor, id_cliente, anio):
    cursor.execute('''
        INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago, fecha_pago)
        VALUES (?, 'Anual', ?, NULL, ?, 'PAGADO', ?)
    ''', (id_cliente, anio, MONTO_CUOTA_ANUAL, f"{anio}-02-05"))
    id_cuota = cursor.lastrowid

    id_deuda = _insertar_deuda(
        cursor,
        id_cliente,
        "CUOTA_ANUAL",
        id_cuota,
        f"Cuota anual {anio}",
        MONTO_CUOTA_ANUAL,
        "PAGADO",
        f"{anio}-01-01",
    )
    _insertar_pago(
        cursor,
        id_deuda,
        id_cliente,
        MONTO_CUOTA_ANUAL,
        "transferencia",
        f"{anio}-02-05",
        f"Pago anual de prueba {anio}",
    )


def _sembrar_cuotas_asociado(cursor, id_cliente, fecha_registro, escenario):
    meses = _meses_desde(fecha_registro)
    actual = date.today()

    if escenario == "anual_pagada":
        _crear_cuota_anual_pagada(cursor, id_cliente, actual.year)
        for anio, mes in meses:
            estado = "EXENTO" if anio == actual.year else "PAGADO"
            pago = MONTO_CUOTA_MENSUAL if estado == "PAGADO" else 0.0
            _crear_cuota_mensual(cursor, id_cliente, anio, mes, estado, pago=pago)
        return

    total_meses = len(meses)
    for idx, (anio, mes) in enumerate(meses):
        estado = "PAGADO"
        pago = MONTO_CUOTA_MENSUAL

        if escenario == "adeudo_atrasado" and idx >= max(total_meses - 4, 0):
            estado = "PENDIENTE"
            pago = 0.0
        elif escenario == "parcial" and idx == total_meses - 2:
            estado = "PENDIENTE"
            pago = MONTO_CUOTA_MENSUAL / 2
        elif escenario == "parcial" and idx == total_meses - 1:
            estado = "PENDIENTE"
            pago = 0.0
        elif escenario == "inactivo_con_deuda" and idx >= max(total_meses - 6, 0):
            estado = "PENDIENTE"
            pago = 0.0

        _crear_cuota_mensual(cursor, id_cliente, anio, mes, estado, pago=pago)


def sembrar_clientes():
    conexion = None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()

        for indice, cliente in enumerate(CLIENTES_PRUEBA, start=1):
            nombre = cliente["nombre"]
            estatus_operativo = cliente.get("estatus_operativo", "Activo")
            rfc = _rfc_prueba(indice, nombre)
            curp = _curp_prueba(indice, nombre)

            cursor.execute('''
                INSERT INTO clientes (
                    nombre, telefono, correo, razon_social, rfc, curp,
                    regimen_fiscal, uso_cfdi, tipo_cliente, estatus_operativo,
                    sector, fecha_registro
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                nombre,
                cliente["telefono"],
                cliente["correo"],
                nombre,
                rfc,
                curp,
                "612",
                "G03",
                cliente["tipo_cliente"],
                estatus_operativo,
                cliente.get("sector", "Normal"),
                cliente["fecha_registro"],
            ))
            id_cliente = cursor.lastrowid

            if cliente["tipo_cliente"] == "Asociado":
                _sembrar_cuotas_asociado(
                    cursor,
                    id_cliente,
                    cliente["fecha_registro"],
                    cliente.get("escenario_cuotas", "al_corriente"),
                )

        conexion.commit()
        print(f"Exito: se sembraron {len(CLIENTES_PRUEBA)} clientes de prueba con cuotas historicas.")

    except sqlite3.IntegrityError as e:
        if conexion:
            conexion.rollback()
        print(f"Error de integridad al sembrar clientes: {e}")
    except Exception as e:
        if conexion:
            conexion.rollback()
        print(f"Error inesperado al sembrar clientes: {e}")
    finally:
        if conexion:
            conexion.close()


if __name__ == "__main__":
    sembrar_clientes()
