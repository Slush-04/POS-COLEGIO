from database import get_db_connection, generar_folio
import sqlite3
from datetime import date, timedelta

CURSOS_PRUEBA = [
    {"nombre": "Reformas Fiscales 2026", "ponente": "C.P. Alejandro Moran", "dias_inicio": -180, "duracion": 2, "capacidad_max": 40, "precio_general": 2000.0},
    {"nombre": "Contabilidad Electronica Avanzada", "ponente": "Dra. Patricia Ortiz", "dias_inicio": -165, "duracion": 3, "capacidad_max": 35, "precio_general": 1800.0},
    {"nombre": "Declaracion Anual Personas Fisicas", "ponente": "Mtro. Humberto Chavez", "dias_inicio": -150, "duracion": 1, "capacidad_max": 50, "precio_general": 1200.0},
    {"nombre": "Nomina Digital y CFDI 4.0", "ponente": "Lic. Claudia Ledesma", "dias_inicio": -135, "duracion": 2, "capacidad_max": 45, "precio_general": 1500.0},
    {"nombre": "Planeacion Fiscal Empresarial", "ponente": "C.P. Ricardo Benitez", "dias_inicio": -120, "duracion": 4, "capacidad_max": 30, "precio_general": 2500.0},
    {"nombre": "Excel Aplicado a Auditoria", "ponente": "Mtro. Sergio Villalobos", "dias_inicio": -105, "duracion": 2, "capacidad_max": 25, "precio_general": 1000.0},
    {"nombre": "Auditoria de Estados Financieros", "ponente": "C.P. Martin Guzman", "dias_inicio": -90, "duracion": 3, "capacidad_max": 30, "precio_general": 2200.0},
    {"nombre": "Estrategias de Defensa Fiscal", "ponente": "Abog. Sofia Ruiz", "dias_inicio": -75, "duracion": 2, "capacidad_max": 40, "precio_general": 2400.0},
    {"nombre": "Taller de Devolucion de IVA", "ponente": "C.P. Laura Castro", "dias_inicio": -60, "duracion": 1, "capacidad_max": 50, "precio_general": 1300.0},
    {"nombre": "Regimen Simplificado de Confianza (RESICO)", "ponente": "Mtro. Hector Ramos", "dias_inicio": -45, "duracion": 2, "capacidad_max": 45, "precio_general": 1100.0},
    {"nombre": "Precios de Transferencia Basico", "ponente": "Dra. Monica Silva", "dias_inicio": -30, "duracion": 2, "capacidad_max": 20, "precio_general": 2800.0},
    {"nombre": "Finanzas para No Financieros", "ponente": "Lic. Daniel Torres", "dias_inicio": -15, "duracion": 3, "capacidad_max": 60, "precio_general": 900.0},
    {"nombre": "Impuestos Internacionales", "ponente": "Mtro. Javier Reyes", "dias_inicio": -5, "duracion": 3, "capacidad_max": 25, "precio_general": 3200.0},
    {"nombre": "Taller de CFDI de Traslado y Carta Porte", "ponente": "Lic. Estela Perez", "dias_inicio": 10, "duracion": 1, "capacidad_max": 50, "precio_general": 1400.0},
    {"nombre": "Analisis e Interpretacion de Estados Financieros", "ponente": "C.P. Ignacio Mora", "dias_inicio": 25, "duracion": 2, "capacidad_max": 35, "precio_general": 1600.0},
    {"nombre": "Costos para la Toma de Decisiones", "ponente": "Mtra. Alicia Gomez", "dias_inicio": 40, "duracion": 2, "capacidad_max": 30, "precio_general": 1700.0},
    {"nombre": "Prevencion de Lavado de Dinero (PLD)", "ponente": "Lic. Roberto Franco", "dias_inicio": 55, "duracion": 3, "capacidad_max": 40, "precio_general": 2600.0},
    {"nombre": "Taller de ISR Sueldos y Salarios", "ponente": "C.P. Teresa Mendoza", "dias_inicio": 70, "duracion": 1, "capacidad_max": 45, "precio_general": 1250.0},
    {"nombre": "Introduccion a las NIIF/IFRS", "ponente": "Dr. Fernando Rios", "dias_inicio": 85, "duracion": 4, "capacidad_max": 30, "precio_general": 3000.0},
    {"nombre": "Fiscalidad en Comercio Exterior", "ponente": "Lic. Gabriela Solis", "dias_inicio": 100, "duracion": 2, "capacidad_max": 35, "precio_general": 2100.0},
    {"nombre": "Cierre Fiscal Personas Morales", "ponente": "Mtro. Arturo Luna", "dias_inicio": 115, "duracion": 3, "capacidad_max": 50, "precio_general": 2500.0},
    {"nombre": "Valuacion de Empresas", "ponente": "Lic. Mario Pineda", "dias_inicio": 130, "duracion": 2, "capacidad_max": 25, "precio_general": 2700.0},
    {"nombre": "Auditoria Forense Aplicada", "ponente": "Dra. Sandra Ortiz", "dias_inicio": 140, "duracion": 3, "capacidad_max": 30, "precio_general": 2900.0},
    {"nombre": "Regimen Fiscal de Plataformas Digitales", "ponente": "C.P. Oscar Chavez", "dias_inicio": 150, "duracion": 1, "capacidad_max": 40, "precio_general": 1350.0},
    {"nombre": "Taller Practico de Rellenado de Declaraciones", "ponente": "Mtra. Claudia Vega", "dias_inicio": 160, "duracion": 2, "capacidad_max": 45, "precio_general": 1050.0},
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


def _insertar_deuda_curso(cursor, id_cliente, id_inscripcion, nombre_curso, monto_total, estado, fecha_generacion, id_operacion):
    cursor.execute('''
        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion, monto_original, descuento, id_operacion)
        VALUES (?, 'CURSO', ?, ?, ?, ?, ?, ?, 0.0, ?)
    ''', (id_cliente, id_inscripcion, f"Curso: {nombre_curso}", monto_total, estado, fecha_generacion, monto_total, id_operacion))
    return cursor.lastrowid


def _insertar_pago(cursor, id_deuda, id_cliente, monto, fecha_pago, observacion, id_operacion):
    cursor.execute('''
        INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion, id_operacion, estado, tipo_movimiento)
        VALUES (?, ?, ?, 'transferencia', ?, ?, ?, 'ACTIVO', 'PAGO')
    ''', (id_deuda, id_cliente, monto, fecha_pago, observacion, id_operacion))


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
        cursos_con_inscripciones = cursos_creados[:3]
        for idx_curso, curso in enumerate(cursos_con_inscripciones):
            participantes = clientes[idx_curso % len(clientes):] + clientes[:idx_curso % len(clientes)]
            participantes = participantes[:2]

            for idx_cliente, cliente in enumerate(participantes):
                tipo_tarifa = _tipo_tarifa(cliente["tipo_cliente"])
                monto_total = _monto_por_tarifa(curso, tipo_tarifa)
                estado_pago, proporcion_pagada = _estado_para_inscripcion(idx_curso, idx_cliente)
                monto_pagado = round(monto_total * proporcion_pagada, 2)
                saldo_pendiente = round(monto_total - monto_pagado, 2)
                estado_deuda = "PAGADO" if saldo_pendiente == 0 else "PENDIENTE"
                fecha_registro = curso["fecha_inicio"]

                # 1. Crear Folio y Operación para la venta del curso (inscripción)
                folio_op = generar_folio('CU', cursor)
                tipo_op = 'VENTA' if estado_deuda == 'PAGADO' else 'VENTA_CUENTA'
                fecha_evento = f"{fecha_registro} 09:00:00"
                
                cursor.execute('''
                    INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
                    VALUES (?, ?, ?, ?, 'COMPLETADA', ?)
                ''', (folio_op, tipo_op, cliente["id_cliente"], monto_total, fecha_evento))
                id_operacion = cursor.lastrowid

                # 2. Insertar inscripción vinculando id_operacion
                cursor.execute('''
                    INSERT INTO inscripciones (
                        id_cliente, id_curso, nombre_participante, tipo_tarifa,
                        monto_total, saldo_pendiente, estado_pago, facturado, fecha_registro, id_operacion
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    id_operacion
                ))
                id_inscripcion = cursor.lastrowid

                # 3. Crear deuda vinculada a la operación
                id_deuda = _insertar_deuda_curso(
                    cursor,
                    cliente["id_cliente"],
                    id_inscripcion,
                    curso["nombre"],
                    monto_total,
                    estado_deuda,
                    fecha_registro,
                    id_operacion
                )

                # 4. Registrar detalle de la operación
                cursor.execute('''
                    INSERT INTO operacion_detalles (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad, precio_unitario, descuento, iva, importe_total, id_deuda, id_inscripcion)
                    VALUES (?, 'CURSO', ?, ?, 1, ?, 0.0, 0.0, ?, ?, ?)
                ''', (id_operacion, id_inscripcion, f"Inscripción Curso: {curso['nombre']}", monto_total, monto_total, id_deuda, id_inscripcion))

                # 5. Si hay abono parcial o total, registrar la operación de pago
                if monto_pagado > 0:
                    folio_pago = generar_folio('PD', cursor)
                    fecha_pago_evento = f"{fecha_registro} 11:00:00"
                    
                    cursor.execute('''
                        INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
                        VALUES (?, ?, ?, ?, 'COMPLETADA', ?)
                    ''', (folio_pago, 'PAGO_DEUDA', cliente["id_cliente"], monto_pagado, fecha_pago_evento))
                    id_op_pago = cursor.lastrowid

                    _insertar_pago(
                        cursor,
                        id_deuda,
                        cliente["id_cliente"],
                        monto_pagado,
                        fecha_registro,
                        f"Pago de prueba por {curso['nombre']}",
                        id_op_pago
                    )

                total_inscripciones += 1

        conexion.commit()
        print(f"Exito: se sembraron {len(cursos_creados)} cursos y {total_inscripciones} inscripciones historicas en cursos pasados.")

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
