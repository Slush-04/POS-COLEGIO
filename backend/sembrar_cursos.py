from database import get_db_connection
import sqlite3
from datetime import date, timedelta


CURSOS_PRUEBA = [
    {
        "nombre": "Reformas Fiscales 2026",
        "ponente": "C.P. Alejandro Moran",
        "dias_inicio": -90,
        "duracion": 2,
        "capacidad_max": 40,
        "precio_general": 2000.0,
    },
    {
        "nombre": "Contabilidad Electronica Avanzada",
        "ponente": "Dra. Patricia Ortiz",
        "dias_inicio": -45,
        "duracion": 3,
        "capacidad_max": 35,
        "precio_general": 1800.0,
    },
    {
        "nombre": "Declaracion Anual Personas Fisicas",
        "ponente": "Mtro. Humberto Chavez",
        "dias_inicio": -15,
        "duracion": 1,
        "capacidad_max": 50,
        "precio_general": 1200.0,
    },
    {
        "nombre": "Nomina Digital y CFDI",
        "ponente": "Lic. Claudia Ledesma",
        "dias_inicio": 10,
        "duracion": 2,
        "capacidad_max": 45,
        "precio_general": 1500.0,
    },
    {
        "nombre": "Planeacion Fiscal Empresarial",
        "ponente": "C.P. Ricardo Benitez",
        "dias_inicio": 35,
        "duracion": 4,
        "capacidad_max": 30,
        "precio_general": 2500.0,
    },
    {
        "nombre": "Excel Aplicado a Auditoria",
        "ponente": "Mtro. Sergio Villalobos",
        "dias_inicio": 65,
        "duracion": 2,
        "capacidad_max": 25,
        "precio_general": 1000.0,
    },
]


def _precios(precio_general):
    return {
        "precio_general": precio_general,
        "precio_asociado": round(precio_general * 0.80, 2),
        "precio_asociado_externo": round(precio_general * 0.90, 2),
        "precio_estudiante": round(precio_general * 0.50, 2),
        "precio_colaborador": round(precio_general * 0.30, 2),
    }


def _tipo_tarifa(tipo_cliente):
    mapa = {
        "General": "general",
        "Asociado": "asociado",
        "Estudiante": "estudiante",
        "Asociado Externo": "asociado_externo",
        "Colaborador": "colaborador",
    }
    return mapa.get(tipo_cliente, "general")


def _monto_por_tarifa(curso, tipo_tarifa):
    if tipo_tarifa == "asociado":
        return curso["precio_asociado"]
    if tipo_tarifa == "asociado_externo":
        return curso["precio_asociado_externo"]
    if tipo_tarifa == "estudiante":
        return curso["precio_estudiante"]
    if tipo_tarifa == "colaborador":
        return curso["precio_colaborador"]
    return curso["precio_general"]


def _insertar_deuda_curso(cursor, id_cliente, id_inscripcion, nombre_curso, monto_total, estado, fecha_generacion):
    cursor.execute('''
        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
        VALUES (?, 'CURSO', ?, ?, ?, ?, ?)
    ''', (id_cliente, id_inscripcion, f"Curso: {nombre_curso}", monto_total, estado, fecha_generacion))
    return cursor.lastrowid


def _insertar_pago(cursor, id_deuda, id_cliente, monto, fecha_pago, observacion):
    cursor.execute('''
        INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion)
        VALUES (?, ?, ?, 'transferencia', ?, ?)
    ''', (id_deuda, id_cliente, monto, fecha_pago, observacion))


def _estado_para_inscripcion(indice_curso, indice_cliente):
    patron = (indice_curso + indice_cliente) % 4
    if patron == 0:
        return "PAGADO", 1.0
    if patron == 1:
        return "PENDIENTE", 0.0
    if patron == 2:
        return "PENDIENTE", 0.5
    return "PAGADO", 1.0


def sembrar_cursos_y_participantes():
    conexion = None
    try:
        conexion = get_db_connection()
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT id_cliente, nombre, tipo_cliente
            FROM clientes
            WHERE estatus = 1
            ORDER BY id_cliente ASC
        """)
        clientes = [dict(row) for row in cursor.fetchall()]

        if not clientes:
            print("No hay clientes. Ejecuta primero backend/sembrar_clientes.py.")
            return

        hoy = date.today()
        cursos_creados = []

        for curso_base in CURSOS_PRUEBA:
            inicio = hoy + timedelta(days=curso_base["dias_inicio"])
            fin = inicio + timedelta(days=curso_base["duracion"])
            precios = _precios(curso_base["precio_general"])

            cursor.execute('''
                INSERT INTO cursos (
                    nombre, ponente, fecha_inicio, fecha_fin, capacidad_max,
                    precio_general, precio_asociado, precio_asociado_externo,
                    precio_estudiante, precio_colaborador, estatus
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
            ''', (
                curso_base["nombre"],
                curso_base["ponente"],
                inicio.isoformat(),
                fin.isoformat(),
                curso_base["capacidad_max"],
                precios["precio_general"],
                precios["precio_asociado"],
                precios["precio_asociado_externo"],
                precios["precio_estudiante"],
                precios["precio_colaborador"],
            ))

            cursos_creados.append({
                "id_curso": cursor.lastrowid,
                "nombre": curso_base["nombre"],
                "fecha_inicio": inicio.isoformat(),
                **precios,
            })

        total_inscripciones = 0
        for idx_curso, curso in enumerate(cursos_creados):
            participantes = clientes[idx_curso % len(clientes):] + clientes[:idx_curso % len(clientes)]
            participantes = participantes[:6]

            for idx_cliente, cliente in enumerate(participantes):
                tipo_tarifa = _tipo_tarifa(cliente["tipo_cliente"])
                monto_total = _monto_por_tarifa(curso, tipo_tarifa)
                estado_pago, proporcion_pagada = _estado_para_inscripcion(idx_curso, idx_cliente)
                monto_pagado = round(monto_total * proporcion_pagada, 2)
                saldo_pendiente = round(monto_total - monto_pagado, 2)
                estado_deuda = "PAGADO" if saldo_pendiente == 0 else "PENDIENTE"
                fecha_registro = curso["fecha_inicio"]

                cursor.execute('''
                    INSERT INTO inscripciones (
                        id_cliente, id_curso, nombre_participante, tipo_tarifa,
                        monto_total, saldo_pendiente, estado_pago, facturado, fecha_registro
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    cliente["id_cliente"],
                    curso["id_curso"],
                    cliente["nombre"],
                    tipo_tarifa,
                    monto_total,
                    saldo_pendiente,
                    estado_deuda,
                    1 if idx_cliente % 3 == 0 else 0,
                    fecha_registro,
                ))
                id_inscripcion = cursor.lastrowid

                id_deuda = _insertar_deuda_curso(
                    cursor,
                    cliente["id_cliente"],
                    id_inscripcion,
                    curso["nombre"],
                    monto_total,
                    estado_deuda,
                    fecha_registro,
                )

                if monto_pagado > 0:
                    _insertar_pago(
                        cursor,
                        id_deuda,
                        cliente["id_cliente"],
                        monto_pagado,
                        fecha_registro,
                        f"Pago de prueba por {curso['nombre']}",
                    )

                total_inscripciones += 1

        conexion.commit()
        print(f"Exito: se sembraron {len(cursos_creados)} cursos y {total_inscripciones} inscripciones con deudas/pagos.")

    except sqlite3.IntegrityError as e:
        if conexion:
            conexion.rollback()
        print(f"Error de integridad al sembrar cursos: {e}")
    except Exception as e:
        if conexion:
            conexion.rollback()
        print(f"Error inesperado al sembrar cursos: {e}")
    finally:
        if conexion:
            conexion.close()


if __name__ == "__main__":
    sembrar_cursos_y_participantes()
