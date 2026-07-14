"""
Migración: Sistema de Deudas Centralizado
Crea las tablas `deudas` y `pagos_deudas` y migra los datos existentes.
"""
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "sistema_colegio.db")


def get_conn():
    return sqlite3.connect(DB_PATH, timeout=15.0)


def crear_tablas(cursor):
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deudas (
            id_deuda INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cliente INTEGER NOT NULL,
            tipo_deuda TEXT NOT NULL,
            id_referencia INTEGER,
            concepto TEXT NOT NULL,
            monto_total REAL NOT NULL,
            estado TEXT DEFAULT 'PENDIENTE',
            fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_cliente) REFERENCES clientes(id_cliente)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pagos_deudas (
            id_pago_deuda INTEGER PRIMARY KEY AUTOINCREMENT,
            id_deuda INTEGER NOT NULL,
            id_cliente INTEGER NOT NULL,
            monto_pagado REAL NOT NULL,
            metodo_pago TEXT NOT NULL,
            fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
            observacion TEXT,
            FOREIGN KEY(id_deuda) REFERENCES deudas(id_deuda),
            FOREIGN KEY(id_cliente) REFERENCES clientes(id_cliente)
        )
    ''')
    print("[OK] Tablas 'deudas' y 'pagos_deudas' verificadas/creadas.")


def migrar_inscripciones(cursor):
    """Migra inscripciones de cursos a la tabla deudas, y sus pagos_transacciones a pagos_deudas."""
    cursor.execute('''
        SELECT i.id_inscripcion, i.id_cliente, i.monto_total, i.saldo_pendiente,
               i.estado_pago, i.fecha_registro, cu.nombre
        FROM inscripciones i
        LEFT JOIN cursos cu ON i.id_curso = cu.id_curso
    ''')
    inscripciones = cursor.fetchall()

    migradas = 0
    omitidas = 0
    pagos_migrados = 0

    for (id_ins, id_cliente, monto_total, saldo_pendiente,
         estado_pago, fecha_registro, nombre_curso) in inscripciones:

        # Omitir inscripciones sin cliente (no se pueden crear deudas sin id_cliente)
        if id_cliente is None:
            omitidas += 1
            continue

        # Evitar duplicados
        cursor.execute(
            "SELECT id_deuda FROM deudas WHERE tipo_deuda = 'CURSO' AND id_referencia = ?",
            (id_ins,)
        )
        existente = cursor.fetchone()
        if existente:
            id_deuda = existente[0]
        else:
            estado_deuda = 'PAGADO' if (saldo_pendiente is not None and saldo_pendiente == 0 and estado_pago == 'PAGADO') else 'PENDIENTE'
            concepto = f"Curso: {nombre_curso or 'Sin nombre'}"
            cursor.execute('''
                INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
                VALUES (?, 'CURSO', ?, ?, ?, ?, ?)
            ''', (id_cliente, id_ins, concepto, monto_total, estado_deuda, fecha_registro))
            id_deuda = cursor.lastrowid
            migradas += 1

        # Migrar pagos_transacciones asociados
        cursor.execute(
            "SELECT id_pago, monto_pagado, metodo_pago, fecha_pago, observacion FROM pagos_transacciones WHERE id_inscripcion = ?",
            (id_ins,)
        )
        pagos = cursor.fetchall()
        for (id_pago_orig, monto, metodo, fecha, obs) in pagos:
            tag = f"[Migrado PT-{id_pago_orig}]"
            cursor.execute(
                "SELECT 1 FROM pagos_deudas WHERE id_deuda = ? AND observacion LIKE ?",
                (id_deuda, f"%PT-{id_pago_orig}]")
            )
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (id_deuda, id_cliente, monto, metodo or 'No especificado', fecha,
                      f"{obs or ''} {tag}".strip()))
                pagos_migrados += 1

        # Reconciliar saldos históricos aunque no existan pagos_transacciones completos.
        esperado_pagado = round((monto_total or 0) - (saldo_pendiente or 0), 2)
        cursor.execute(
            "SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_deudas WHERE id_deuda = ?",
            (id_deuda,)
        )
        pagado_migrado = round(cursor.fetchone()[0] or 0, 2)
        ajuste = round(esperado_pagado - pagado_migrado, 2)

        if ajuste > 0:
            tag_ajuste = f"[Ajuste migracion INS-{id_ins}]"
            cursor.execute(
                "SELECT 1 FROM pagos_deudas WHERE id_deuda = ? AND observacion LIKE ?",
                (id_deuda, f"%INS-{id_ins}]")
            )
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion)
                    VALUES (?, ?, ?, 'Migracion', ?, ?)
                ''', (id_deuda, id_cliente, ajuste, fecha_registro, tag_ajuste))
                pagos_migrados += 1

        estado_final = 'PAGADO' if (saldo_pendiente or 0) == 0 else 'PENDIENTE'
        cursor.execute("UPDATE deudas SET estado = ? WHERE id_deuda = ?", (estado_final, id_deuda))

    print(f"[OK] Inscripciones migradas: {migradas} deudas, {pagos_migrados} pagos. (Omitidas sin cliente: {omitidas})")


def migrar_cuotas(cursor):
    """Migra cuotas_asociados a la tabla deudas, y sus pagos_cuotas a pagos_deudas."""
    cursor.execute('''
        SELECT id_cuota, id_cliente, tipo_cuota, anio, mes, monto, estado_pago, fecha_pago
        FROM cuotas_asociados
        WHERE estado_pago IN ('PENDIENTE', 'PAGADO')
    ''')
    cuotas = cursor.fetchall()

    migradas = 0
    pagos_migrados = 0

    for (id_cuota, id_cliente, tipo_cuota, anio, mes, monto, estado_pago, fecha_pago) in cuotas:
        tipo_deuda = 'CUOTA_MENSUAL' if tipo_cuota == 'Mensual' else 'CUOTA_ANUAL'

        if tipo_cuota == 'Mensual' and mes:
            concepto = f"Cuota mensual {mes:02d}/{anio}"
        else:
            concepto = f"Cuota anual {anio}"

        cursor.execute(
            "SELECT id_deuda FROM deudas WHERE tipo_deuda = ? AND id_referencia = ?",
            (tipo_deuda, id_cuota)
        )
        existente = cursor.fetchone()
        if existente:
            id_deuda = existente[0]
        else:
            estado_deuda = 'PAGADO' if estado_pago == 'PAGADO' else 'PENDIENTE'
            fecha_gen = f"{anio}-{(mes or 1):02d}-01"
            cursor.execute('''
                INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, fecha_generacion)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (id_cliente, tipo_deuda, id_cuota, concepto, monto, estado_deuda, fecha_gen))
            id_deuda = cursor.lastrowid
            migradas += 1

        # Migrar pagos_cuotas asociados
        cursor.execute(
            "SELECT id_pago_cuota, monto_pagado, metodo_pago, fecha_pago, observacion FROM pagos_cuotas WHERE id_cuota = ?",
            (id_cuota,)
        )
        pagos = cursor.fetchall()
        for (id_pago_orig, monto_p, metodo, fecha, obs) in pagos:
            cursor.execute(
                "SELECT 1 FROM pagos_deudas WHERE id_deuda = ? AND observacion LIKE ?",
                (id_deuda, f"%PC-{id_pago_orig}]")
            )
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (id_deuda, id_cliente, monto_p, metodo or 'No especificado', fecha,
                      f"{obs or ''} [Migrado PC-{id_pago_orig}]".strip()))
                pagos_migrados += 1

        esperado_pagado = monto if estado_pago == 'PAGADO' else 0
        if estado_pago == 'PENDIENTE':
            cursor.execute("SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_cuotas WHERE id_cuota = ?", (id_cuota,))
            esperado_pagado = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_deudas WHERE id_deuda = ?",
            (id_deuda,)
        )
        pagado_migrado = round(cursor.fetchone()[0] or 0, 2)
        ajuste = round((esperado_pagado or 0) - pagado_migrado, 2)

        if ajuste > 0:
            tag_ajuste = f"[Ajuste migracion CUOTA-{id_cuota}]"
            cursor.execute(
                "SELECT 1 FROM pagos_deudas WHERE id_deuda = ? AND observacion LIKE ?",
                (id_deuda, f"%CUOTA-{id_cuota}]")
            )
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion)
                    VALUES (?, ?, ?, 'Migracion', ?, ?)
                ''', (id_deuda, id_cliente, ajuste, fecha_pago or f"{anio}-{(mes or 1):02d}-01", tag_ajuste))
                pagos_migrados += 1

        cursor.execute("UPDATE deudas SET estado = ? WHERE id_deuda = ?", ('PAGADO' if estado_pago == 'PAGADO' else 'PENDIENTE', id_deuda))

    print(f"[OK] Cuotas migradas: {migradas} deudas, {pagos_migrados} pagos.")


def main():
    print(f"Conectando a: {DB_PATH}")
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")

    crear_tablas(cursor)
    migrar_inscripciones(cursor)
    migrar_cuotas(cursor)

    conn.commit()
    conn.close()
    print("[OK] Migracion completada exitosamente.")


if __name__ == "__main__":
    main()
