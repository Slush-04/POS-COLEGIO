"""
s01_catalogos.py — Siembra de catálogos base
=============================================
Puebla las tablas de clientes, cursos e inventario con registros iniciales.
No genera operaciones, deudas ni movimientos financieros.

Las cuotas históricas de asociados se generan aquí como inserts directos
porque no existe un endpoint para crear cuotas retroactivas.
"""

import os
import sys
import sqlite3
from datetime import date, datetime

# Asegurar que el paquete backend sea importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from database import get_db_connection, generar_folio

# ============================================================
# CONSTANTES
# ============================================================
MONTO_CUOTA_MENSUAL = 500.0
MONTO_CUOTA_ANUAL = 5000.0
FECHA_LIMITE = date(2026, 6, 30)  # Último mes con cuotas históricas

# ============================================================
# CATÁLOGO DE CLIENTES (25)
# ============================================================
CLIENTES = [
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
        "sector": "Normal",
    },
    {
        "nombre": "Miguel Ortega Sanchez",
        "telefono": "5555667788",
        "correo": "miguel.ortega@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2025-09-01",
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
    {
        "nombre": "Gabriela Mendez Ruiz",
        "telefono": "5512345678",
        "correo": "gabriela.mendez@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2025-10-05",
        "sector": "Normal",
    },
    {
        "nombre": "Alejandro Rios Gomez",
        "telefono": "5523456789",
        "correo": "alejandro.rios@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2026-02-10",
        "sector": "Normal",
    },
    {
        "nombre": "Beatriz Luna Torres",
        "telefono": "5534567890",
        "correo": "beatriz.luna@example.com",
        "tipo_cliente": "Estudiante",
        "fecha_registro": "2026-03-15",
        "sector": "Educativo",
    },
    {
        "nombre": "Daniel Castillo Pena",
        "telefono": "5545678901",
        "correo": "daniel.castillo@example.com",
        "tipo_cliente": "General",
        "fecha_registro": "2026-04-01",
        "sector": "Normal",
    },
    {
        "nombre": "Elena Vargas Martinez",
        "telefono": "5556789012",
        "correo": "elena.vargas@example.com",
        "tipo_cliente": "Colaborador",
        "fecha_registro": "2026-01-20",
        "sector": "Interno",
    },
    {
        "nombre": "Francisco Perez Lopez",
        "telefono": "5567890123",
        "correo": "francisco.perez@example.com",
        "tipo_cliente": "Asociado Externo",
        "fecha_registro": "2025-12-01",
        "sector": "Empresarial",
    },
    {
        "nombre": "Gloria Flores Diaz",
        "telefono": "5578901234",
        "correo": "gloria.flores@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2026-02-01",
        "sector": "Normal",
    },
    {
        "nombre": "Hector Ramirez Ortiz",
        "telefono": "5589012345",
        "correo": "hector.ramirez@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2025-08-15",
        "sector": "Normal",
    },
    {
        "nombre": "Irene Jimenez Silva",
        "telefono": "5590123456",
        "correo": "irene.jimenez@example.com",
        "tipo_cliente": "General",
        "fecha_registro": "2026-05-01",
        "sector": "Normal",
    },
    {
        "nombre": "Julio Castro Mora",
        "telefono": "5501234567",
        "correo": "julio.castro@example.com",
        "tipo_cliente": "Estudiante",
        "fecha_registro": "2026-06-10",
        "sector": "Educativo",
    },
    {
        "nombre": "Karla Navarrete Rivas",
        "telefono": "5511121314",
        "correo": "karla.navarrete@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2025-07-22",
        "sector": "Normal",
    },
    {
        "nombre": "Luis Alvarez Guzman",
        "telefono": "5522232425",
        "correo": "luis.alvarez@example.com",
        "tipo_cliente": "Colaborador",
        "fecha_registro": "2026-03-01",
        "sector": "Interno",
    },
    {
        "nombre": "Monica Reyes Pineda",
        "telefono": "5533343536",
        "correo": "monica.reyes@example.com",
        "tipo_cliente": "Asociado Externo",
        "fecha_registro": "2026-04-10",
        "sector": "Empresarial",
    },
    {
        "nombre": "Oscar Mendez Fuentes",
        "telefono": "5544454647",
        "correo": "oscar.mendez@example.com",
        "tipo_cliente": "General",
        "fecha_registro": "2026-05-20",
        "sector": "Normal",
    },
    {
        "nombre": "Paulina Soto Rojas",
        "telefono": "5555565758",
        "correo": "paulina.soto@example.com",
        "tipo_cliente": "Asociado",
        "fecha_registro": "2026-01-05",
        "sector": "Normal",
    },
]

# ============================================================
# CATÁLOGO DE CURSOS (25)
# Fechas fijas relativas al año 2026 para evitar datos futuros
# ============================================================
CURSOS = [
    {"nombre": "Reformas Fiscales 2026",                       "ponente": "C.P. Alejandro Moran",       "fecha_inicio": "2026-01-12", "duracion": 2,  "capacidad_max": 40, "precio_general": 2000.0},
    {"nombre": "Contabilidad Electronica Avanzada",             "ponente": "Dra. Patricia Ortiz",         "fecha_inicio": "2026-01-26", "duracion": 3,  "capacidad_max": 35, "precio_general": 1800.0},
    {"nombre": "Declaracion Anual Personas Fisicas",            "ponente": "Mtro. Humberto Chavez",       "fecha_inicio": "2026-02-09", "duracion": 1,  "capacidad_max": 50, "precio_general": 1200.0},
    {"nombre": "Nomina Digital y CFDI 4.0",                     "ponente": "Lic. Claudia Ledesma",        "fecha_inicio": "2026-02-23", "duracion": 2,  "capacidad_max": 45, "precio_general": 1500.0},
    {"nombre": "Planeacion Fiscal Empresarial",                 "ponente": "C.P. Ricardo Benitez",        "fecha_inicio": "2026-03-09", "duracion": 4,  "capacidad_max": 30, "precio_general": 2500.0},
    {"nombre": "Excel Aplicado a Auditoria",                    "ponente": "Mtro. Sergio Villalobos",     "fecha_inicio": "2026-03-23", "duracion": 2,  "capacidad_max": 25, "precio_general": 1000.0},
    {"nombre": "Auditoria de Estados Financieros",              "ponente": "C.P. Martin Guzman",          "fecha_inicio": "2026-04-06", "duracion": 3,  "capacidad_max": 30, "precio_general": 2200.0},
    {"nombre": "Estrategias de Defensa Fiscal",                 "ponente": "Abog. Sofia Ruiz",            "fecha_inicio": "2026-04-20", "duracion": 2,  "capacidad_max": 40, "precio_general": 2400.0},
    {"nombre": "Taller de Devolucion de IVA",                   "ponente": "C.P. Laura Castro",           "fecha_inicio": "2026-05-04", "duracion": 1,  "capacidad_max": 50, "precio_general": 1300.0},
    {"nombre": "Regimen Simplificado de Confianza (RESICO)",    "ponente": "Mtro. Hector Ramos",          "fecha_inicio": "2026-05-18", "duracion": 2,  "capacidad_max": 45, "precio_general": 1100.0},
    {"nombre": "Precios de Transferencia Basico",               "ponente": "Dra. Monica Silva",           "fecha_inicio": "2026-06-01", "duracion": 2,  "capacidad_max": 20, "precio_general": 2800.0},
    {"nombre": "Finanzas para No Financieros",                  "ponente": "Lic. Daniel Torres",          "fecha_inicio": "2026-06-15", "duracion": 3,  "capacidad_max": 60, "precio_general": 900.0},
    {"nombre": "Impuestos Internacionales",                     "ponente": "Mtro. Javier Reyes",          "fecha_inicio": "2026-06-29", "duracion": 3,  "capacidad_max": 25, "precio_general": 3200.0},
    {"nombre": "Taller de CFDI de Traslado y Carta Porte",      "ponente": "Lic. Estela Perez",           "fecha_inicio": "2026-07-07", "duracion": 1,  "capacidad_max": 50, "precio_general": 1400.0},
    {"nombre": "Analisis e Interpretacion de Estados Financieros","ponente": "C.P. Ignacio Mora",          "fecha_inicio": "2026-07-21", "duracion": 2,  "capacidad_max": 35, "precio_general": 1600.0},
    {"nombre": "Costos para la Toma de Decisiones",             "ponente": "Mtra. Alicia Gomez",          "fecha_inicio": "2026-08-04", "duracion": 2,  "capacidad_max": 30, "precio_general": 1700.0},
    {"nombre": "Prevencion de Lavado de Dinero (PLD)",          "ponente": "Lic. Roberto Franco",         "fecha_inicio": "2026-08-18", "duracion": 3,  "capacidad_max": 40, "precio_general": 2600.0},
    {"nombre": "Taller de ISR Sueldos y Salarios",              "ponente": "C.P. Teresa Mendoza",         "fecha_inicio": "2026-09-01", "duracion": 1,  "capacidad_max": 45, "precio_general": 1250.0},
    {"nombre": "Introduccion a las NIIF/IFRS",                  "ponente": "Dr. Fernando Rios",           "fecha_inicio": "2026-09-15", "duracion": 4,  "capacidad_max": 30, "precio_general": 3000.0},
    {"nombre": "Fiscalidad en Comercio Exterior",               "ponente": "Lic. Gabriela Solis",         "fecha_inicio": "2026-09-29", "duracion": 2,  "capacidad_max": 35, "precio_general": 2100.0},
    {"nombre": "Cierre Fiscal Personas Morales",                "ponente": "Mtro. Arturo Luna",           "fecha_inicio": "2026-10-13", "duracion": 3,  "capacidad_max": 50, "precio_general": 2500.0},
    {"nombre": "Valuacion de Empresas",                         "ponente": "Lic. Mario Pineda",           "fecha_inicio": "2026-10-27", "duracion": 2,  "capacidad_max": 25, "precio_general": 2700.0},
    {"nombre": "Auditoria Forense Aplicada",                    "ponente": "Dra. Sandra Ortiz",           "fecha_inicio": "2026-11-10", "duracion": 3,  "capacidad_max": 30, "precio_general": 2900.0},
    {"nombre": "Regimen Fiscal de Plataformas Digitales",       "ponente": "C.P. Oscar Chavez",           "fecha_inicio": "2026-11-24", "duracion": 1,  "capacidad_max": 40, "precio_general": 1350.0},
    {"nombre": "Taller Practico de Rellenado de Declaraciones", "ponente": "Mtra. Claudia Vega",          "fecha_inicio": "2026-12-07", "duracion": 2,  "capacidad_max": 45, "precio_general": 1050.0},
]

# ============================================================
# CATÁLOGO DE INVENTARIO (5)
# ============================================================
INVENTARIO = [
    ("Manual de Reformas Fiscales 2026", "Producto", "Libros",     250.0,  450.0, 18, 5),
    ("Guia Practica de ISR",             "Producto", "Libros",     180.0,  320.0, 12, 4),
    ("Agenda Fiscal Profesional",        "Producto", "Papeleria",   90.0,  180.0, 25, 8),
    ("Constancia Digital de Curso",      "Servicio", "Servicios",    0.0,  150.0, 999, 0),
    ("Reposicion de Credencial",         "Servicio", "Servicios",   40.0,  120.0, 50, 5),
]


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def _rfc_prueba(indice: int, nombre: str) -> str:
    partes = nombre.upper().split()
    base = "".join(p[0] for p in partes[:4]).ljust(4, "X")
    return f"{base}900101{indice:03d}"


def _curp_prueba(indice: int, nombre: str) -> str:
    partes = nombre.upper().split()
    base = "".join(p[0] for p in partes[:4]).ljust(4, "X")
    return f"{base}900101HDFXXX{indice:02d}"


def _meses_desde(fecha_registro: str):
    """Devuelve lista de tuplas (anio, mes) desde fecha_registro hasta FECHA_LIMITE."""
    inicio = date.fromisoformat(fecha_registro)
    if inicio > FECHA_LIMITE:
        return []
    meses = []
    total = (FECHA_LIMITE.year - inicio.year) * 12 + (FECHA_LIMITE.month - inicio.month)
    for offset in range(total + 1):
        mes_base = inicio.month + offset
        anio = inicio.year + (mes_base - 1) // 12
        mes = ((mes_base - 1) % 12) + 1
        meses.append((anio, mes))
    return meses


def _insertar_deuda(cursor, id_cliente, tipo_deuda, id_referencia, concepto, monto, estado, fecha_generacion, id_operacion):
    cursor.execute('''
        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion, monto_original, descuento, id_operacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?)
    ''', (id_cliente, tipo_deuda, id_referencia, concepto, monto, estado, fecha_generacion, monto, id_operacion))
    return cursor.lastrowid


def _insertar_pago(cursor, id_deuda, id_cliente, monto, metodo, fecha_pago, observacion, id_operacion):
    cursor.execute('''
        INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion, id_operacion, estado, tipo_movimiento)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO', 'PAGO')
    ''', (id_deuda, id_cliente, monto, metodo, fecha_pago, observacion, id_operacion))


# ============================================================
# SIEMBRA DE CUOTAS HISTÓRICAS (inserts directos)
# ============================================================

def _crear_cuota_mensual(cursor, id_cliente, anio, mes, estado, monto=MONTO_CUOTA_MENSUAL, pago=0.0):
    fecha_pago = f"{anio}-{mes:02d}-05" if estado in ("PAGADO", "EXENTO") else None

    folio_op = generar_folio('QT', cursor)
    tipo_op = 'VENTA' if estado == 'PAGADO' else 'VENTA_CUENTA'
    fecha_evento = f"{anio}-{mes:02d}-01 08:00:00"

    cursor.execute('''
        INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
        VALUES (?, ?, ?, ?, 'COMPLETADA', ?)
    ''', (folio_op, tipo_op, id_cliente, monto, fecha_evento))
    id_operacion = cursor.lastrowid

    cursor.execute('''
        INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago, fecha_pago, id_operacion)
        VALUES (?, 'Mensual', ?, ?, ?, ?, ?, ?)
    ''', (id_cliente, anio, mes, monto, estado, fecha_pago, id_operacion))
    id_cuota = cursor.lastrowid

    if estado == "EXENTO":
        return id_cuota

    concepto = f"Cuota mensual {mes:02d}/{anio}"
    id_deuda = _insertar_deuda(cursor, id_cliente, "CUOTA_MENSUAL", id_cuota, concepto, monto, estado, f"{anio}-{mes:02d}-01", id_operacion)

    cursor.execute('''
        INSERT INTO operacion_detalles (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad, precio_unitario, descuento, iva, importe_total, id_deuda)
        VALUES (?, 'CUOTA', ?, ?, 1, ?, 0.0, 0.0, ?, ?)
    ''', (id_operacion, id_cuota, concepto, monto, monto, id_deuda))

    if pago > 0:
        folio_pago = generar_folio('PD', cursor)
        fecha_pago_evento = f"{anio}-{mes:02d}-05 10:00:00"
        cursor.execute('''
            INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
            VALUES (?, 'PAGO_DEUDA', ?, ?, 'COMPLETADA', ?)
        ''', (folio_pago, id_cliente, pago, fecha_pago_evento))
        id_op_pago = cursor.lastrowid
        _insertar_pago(cursor, id_deuda, id_cliente, pago, "efectivo", f"{anio}-{mes:02d}-05", f"Pago cuota mensual {mes:02d}/{anio}", id_op_pago)

    return id_cuota


def _crear_cuota_anual_pagada(cursor, id_cliente, anio):
    folio_op = generar_folio('QT', cursor)
    fecha_evento = f"{anio}-01-01 08:00:00"

    cursor.execute('''
        INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
        VALUES (?, 'VENTA', ?, ?, 'COMPLETADA', ?)
    ''', (folio_op, id_cliente, MONTO_CUOTA_ANUAL, fecha_evento))
    id_operacion = cursor.lastrowid

    cursor.execute('''
        INSERT INTO cuotas_asociados (id_cliente, tipo_cuota, anio, mes, monto, estado_pago, fecha_pago, id_operacion)
        VALUES (?, 'Anual', ?, NULL, ?, 'PAGADO', ?, ?)
    ''', (id_cliente, anio, MONTO_CUOTA_ANUAL, f"{anio}-02-05", id_operacion))
    id_cuota = cursor.lastrowid

    concepto = f"Cuota anual {anio}"
    id_deuda = _insertar_deuda(cursor, id_cliente, "CUOTA_ANUAL", id_cuota, concepto, MONTO_CUOTA_ANUAL, "PAGADO", f"{anio}-01-01", id_operacion)

    cursor.execute('''
        INSERT INTO operacion_detalles (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad, precio_unitario, descuento, iva, importe_total, id_deuda)
        VALUES (?, 'CUOTA', ?, ?, 1, ?, 0.0, 0.0, ?, ?)
    ''', (id_operacion, id_cuota, concepto, MONTO_CUOTA_ANUAL, MONTO_CUOTA_ANUAL, id_deuda))

    folio_pago = generar_folio('PD', cursor)
    fecha_pago_evento = f"{anio}-02-05 10:00:00"
    cursor.execute('''
        INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
        VALUES (?, 'PAGO_DEUDA', ?, ?, 'COMPLETADA', ?)
    ''', (folio_pago, id_cliente, MONTO_CUOTA_ANUAL, fecha_pago_evento))
    id_op_pago = cursor.lastrowid
    _insertar_pago(cursor, id_deuda, id_cliente, MONTO_CUOTA_ANUAL, "transferencia", f"{anio}-02-05", f"Pago cuota anual {anio}", id_op_pago)


def _sembrar_cuotas_asociado(cursor, id_cliente, fecha_registro, escenario):
    meses = _meses_desde(fecha_registro)

    if escenario == "anual_pagada":
        _crear_cuota_anual_pagada(cursor, id_cliente, FECHA_LIMITE.year)
        for anio, mes in meses:
            estado = "EXENTO" if anio == FECHA_LIMITE.year else "PAGADO"
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


# ============================================================
# FUNCIONES PÚBLICAS DE SIEMBRA
# ============================================================

def sembrar_clientes():
    """Inserta los 25 clientes base y genera cuotas históricas para los asociados."""
    conexion = None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()

        for indice, cliente in enumerate(CLIENTES, start=1):
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
                nombre, cliente["telefono"], cliente["correo"], nombre,
                rfc, curp, "612", "G03", cliente["tipo_cliente"],
                estatus_operativo, cliente.get("sector", "Normal"),
                cliente["fecha_registro"],
            ))
            id_cliente = cursor.lastrowid

            if cliente["tipo_cliente"] == "Asociado":
                _sembrar_cuotas_asociado(
                    cursor, id_cliente, cliente["fecha_registro"],
                    cliente.get("escenario_cuotas", "al_corriente"),
                )

        conexion.commit()
        print(f"  [OK] {len(CLIENTES)} clientes sembrados (con cuotas históricas para asociados).")

    except sqlite3.IntegrityError as e:
        if conexion:
            conexion.rollback()
        print(f"  [ERROR] Integridad al sembrar clientes: {e}")
    except Exception as e:
        if conexion:
            conexion.rollback()
        print(f"  [ERROR] Inesperado al sembrar clientes: {e}")
    finally:
        if conexion:
            conexion.close()


def sembrar_cursos():
    """Inserta los 25 cursos base con precios diferenciados por tipo de tarifa."""
    conexion = None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()

        from datetime import timedelta

        for curso in CURSOS:
            inicio = date.fromisoformat(curso["fecha_inicio"])
            fin = inicio + timedelta(days=curso["duracion"])
            pg = curso["precio_general"]

            cursor.execute('''
                INSERT INTO cursos (
                    nombre, ponente, fecha_inicio, fecha_fin, capacidad_max,
                    precio_general, precio_asociado, precio_asociado_externo,
                    precio_estudiante, precio_colaborador, estatus
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
            ''', (
                curso["nombre"], curso["ponente"],
                inicio.isoformat(), fin.isoformat(), curso["capacidad_max"],
                pg, round(pg * 0.80, 2), round(pg * 0.90, 2),
                round(pg * 0.50, 2), round(pg * 0.30, 2),
            ))

        conexion.commit()
        print(f"  [OK] {len(CURSOS)} cursos sembrados.")

    except sqlite3.IntegrityError as e:
        if conexion:
            conexion.rollback()
        print(f"  [ERROR] Integridad al sembrar cursos: {e}")
    except Exception as e:
        if conexion:
            conexion.rollback()
        print(f"  [ERROR] Inesperado al sembrar cursos: {e}")
    finally:
        if conexion:
            conexion.close()


def sembrar_inventario():
    """Inserta los 5 artículos de inventario base."""
    conexion = None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()

        cursor.executemany('''
            INSERT INTO inventario (
                nombre, tipo, categoria, precio_costo, precio_venta,
                stock_actual, stock_minimo, estatus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ''', INVENTARIO)

        conexion.commit()
        print(f"  [OK] {len(INVENTARIO)} artículos de inventario sembrados.")

    except sqlite3.IntegrityError as e:
        if conexion:
            conexion.rollback()
        print(f"  [ERROR] Integridad al sembrar inventario: {e}")
    except Exception as e:
        if conexion:
            conexion.rollback()
        print(f"  [ERROR] Inesperado al sembrar inventario: {e}")
    finally:
        if conexion:
            conexion.close()


def sembrar_catalogos():
    """Ejecuta la siembra completa de catálogos."""
    print("\n── Fase 1: Catálogos Base ──")
    sembrar_clientes()
    sembrar_cursos()
    sembrar_inventario()


if __name__ == "__main__":
    sembrar_catalogos()
