import sqlite3
import os

# Obtener la ruta absoluta de la raíz del proyecto (un directorio arriba de backend)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "sistema_colegio.db")

def get_db_connection():
    # Retorna la conexión a la base de datos usando una ruta absoluta.
    conexion = sqlite3.connect(DB_PATH, timeout=15.0)
    conexion.execute("PRAGMA foreign_keys = ON")
    return conexion


def generar_folio(clave: str, cursor=None) -> str:
    """Reserva un folio PREFIJO-YYMM#### dentro de la transacción actual."""
    from datetime import datetime

    conexion_propia = cursor is None
    conexion = None
    if conexion_propia:
        conexion = get_db_connection()
        conexion.execute("BEGIN IMMEDIATE")
        cursor = conexion.cursor()

    try:
        periodo = datetime.now().strftime("%y%m")
        # Al cambiar el mes se reserva 0001 y se deja preparado 0002. Esta
        # escritura atómica impide que dos cajas reciban el mismo consecutivo.
        cursor.execute('''
            UPDATE configuracion_folios
            SET siguiente_numero = CASE
                    WHEN periodo_actual = ? THEN siguiente_numero + 1
                    ELSE 2
                END,
                periodo_actual = ?,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE clave = ? AND activo = 1
            RETURNING prefijo, siguiente_numero - 1
        ''', (periodo, periodo, clave))
        configuracion = cursor.fetchone()
        if not configuracion:
            # Compatibilidad defensiva para una instalación que todavía no haya
            # ejecutado la migración de configuración.
            return f"{clave}-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

        prefijo, numero = configuracion
        numero = int(numero)
        while True:
            if numero > 9999:
                raise ValueError(f"La serie {clave} alcanzó el límite mensual de 9,999 folios.")
            folio = f"{str(prefijo).upper()}-{periodo}{numero:04d}"
            cursor.execute("SELECT 1 FROM operaciones WHERE folio = ?", (folio,))
            if not cursor.fetchone():
                break
            cursor.execute('''
                UPDATE configuracion_folios
                SET siguiente_numero = siguiente_numero + 1,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE clave = ?
                RETURNING siguiente_numero - 1
            ''', (clave,))
            numero = int(cursor.fetchone()[0])
        if conexion_propia:
            conexion.commit()
        return folio
    except Exception:
        if conexion_propia and conexion:
            conexion.rollback()
        raise
    finally:
        if conexion_propia and conexion:
            conexion.close()

def inicializar_base_datos():
    conexion = get_db_connection()
    cursor = conexion.cursor()

    # 1. EL DIRECTORIO (Cajón de Clientes)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT,
            correo TEXT NOT NULL,
            razon_social TEXT,
            rfc TEXT UNIQUE,          
            curp TEXT,                
            regimen_fiscal TEXT,
            uso_cfdi TEXT DEFAULT 'G03', 
            tipo_cliente TEXT NOT NULL,  
            genero TEXT,
            fecha_nacimiento DATE,
            estatus INTEGER DEFAULT 1,   
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            estatus_operativo TEXT DEFAULT 'Activo',
            sector TEXT DEFAULT 'Normal'
        )
    ''')

    # 2. EL CATÁLOGO (Cajón de Cursos)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cursos (
            id_curso INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            ponente TEXT,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE,
            capacidad_max INTEGER,
            precio_general REAL DEFAULT 0,
            precio_asociado REAL DEFAULT 0,
            precio_asociado_externo REAL DEFAULT 0,
            precio_estudiante REAL DEFAULT 0,
            precio_colaborador REAL DEFAULT 0,
            estatus TEXT DEFAULT 'ACTIVO'
        )
    ''')

    # 3. INSCRIPCIONES A CURSOS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inscripciones (
            id_inscripcion INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cliente INTEGER, 
            id_curso INTEGER NOT NULL,
            nombre_participante TEXT,
            tipo_tarifa TEXT NOT NULL,      
            monto_total REAL NOT NULL,      
            saldo_pendiente REAL DEFAULT 0, 
            estado_pago TEXT DEFAULT 'PENDIENTE', 
            facturado INTEGER DEFAULT 0,    
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY(id_cliente) REFERENCES clientes(id_cliente),
            FOREIGN KEY(id_curso) REFERENCES cursos(id_curso)
        )
    ''')

    # 4. EL INVENTARIO (Productos y Servicios físicos/virtuales)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            tipo TEXT NOT NULL, -- 'Producto' o 'Servicio'
            categoria TEXT NOT NULL,
            precio_costo REAL DEFAULT 0,
            precio_venta REAL DEFAULT 0,
            stock_actual INTEGER DEFAULT 0,
            stock_minimo INTEGER DEFAULT 0,
            estatus INTEGER DEFAULT 1 -- 1: Activo, 0: Inactivo
        )
    ''')

    # 5. CUOTAS DE ASOCIADOS (Deudas periódicas)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cuotas_asociados (
            id_cuota INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cliente INTEGER NOT NULL,
            tipo_cuota TEXT NOT NULL, -- 'Mensual' o 'Anual'
            anio INTEGER NOT NULL,
            mes INTEGER, -- 1 a 12 (para cuotas mensuales), NULL para anuales
            monto REAL NOT NULL,
            estado_pago TEXT DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'PAGADO', 'EXENTO'
            fecha_pago DATETIME,
            
            FOREIGN KEY(id_cliente) REFERENCES clientes(id_cliente)
        )
    ''')

    # 6. DEUDAS GENERALES (Modelo contable unificado)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deudas (
            id_deuda INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cliente INTEGER NOT NULL,
            tipo_deuda TEXT NOT NULL, -- CURSO, CUOTA_MENSUAL, CUOTA_ANUAL, CUOTA_EXTRAORDINARIA, PRESTAMO, OTRO
            id_referencia INTEGER,    -- id_inscripcion para CURSO, id_cuota para CUOTA_*
            concepto TEXT NOT NULL,
            monto_total REAL NOT NULL,
            estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO
            fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            monto_original REAL,
            descuento REAL DEFAULT 0.0,
            saldo_perdonado REAL DEFAULT 0.0,
            motivo_perdon TEXT,
            fecha_perdon DATETIME,
            FOREIGN KEY(id_cliente) REFERENCES clientes(id_cliente)
        )
    ''')

    # 7. PAGOS DE DEUDAS GENERALES (Historial unificado de abonos)
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

    # 8. OPERACIONES (Encabezado de ticket / movimiento administrativo)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS operaciones (
            id_operacion       INTEGER PRIMARY KEY AUTOINCREMENT,
            folio              TEXT UNIQUE NOT NULL,
            tipo_operacion     TEXT NOT NULL,
            id_cliente         INTEGER,
            total              REAL NOT NULL DEFAULT 0,
            estado             TEXT NOT NULL DEFAULT 'COMPLETADA',
            fecha_evento       DATETIME NOT NULL,
            fecha_registro     DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_anulacion    DATETIME,
            motivo_anulacion   TEXT,
            id_operacion_origen INTEGER,
            FOREIGN KEY(id_cliente) REFERENCES clientes(id_cliente)
        )
    ''')

    # 9. OPERACION_DETALLES (Líneas del ticket)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS operacion_detalles (
            id_detalle        INTEGER PRIMARY KEY AUTOINCREMENT,
            id_operacion      INTEGER NOT NULL,
            tipo_detalle      TEXT NOT NULL,
            id_referencia     INTEGER,
            descripcion       TEXT,
            cantidad          INTEGER DEFAULT 1,
            precio_unitario   REAL DEFAULT 0,
            descuento         REAL DEFAULT 0,
            iva               REAL DEFAULT 0,
            importe_total     REAL DEFAULT 0,
            id_deuda          INTEGER,
            id_inscripcion    INTEGER,
            FOREIGN KEY(id_operacion) REFERENCES operaciones(id_operacion),
            FOREIGN KEY(id_deuda) REFERENCES deudas(id_deuda),
            FOREIGN KEY(id_inscripcion) REFERENCES inscripciones(id_inscripcion)
        )
    ''')

    # 10. MOVIMIENTOS_INVENTARIO (Bitácora de variaciones de stock)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movimientos_inventario (
            id_movimiento     INTEGER PRIMARY KEY AUTOINCREMENT,
            id_operacion      INTEGER NOT NULL,
            id_inventario     INTEGER NOT NULL,
            tipo_movimiento   TEXT NOT NULL,
            cantidad          INTEGER NOT NULL,
            fecha_evento      DATETIME NOT NULL,
            fecha_registro    DATETIME DEFAULT CURRENT_TIMESTAMP,
            observacion       TEXT,
            FOREIGN KEY(id_operacion) REFERENCES operaciones(id_operacion),
            FOREIGN KEY(id_inventario) REFERENCES inventario(id)
        )
    ''')

    # 11. CONFIGURACIÓN DE SERIES DE FOLIOS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS configuracion_folios (
            clave               TEXT PRIMARY KEY,
            nombre              TEXT NOT NULL,
            prefijo             TEXT NOT NULL,
            siguiente_numero    INTEGER NOT NULL DEFAULT 1,
            longitud            INTEGER NOT NULL DEFAULT 6,
            separador           TEXT NOT NULL DEFAULT '-',
            incluir_anio        INTEGER NOT NULL DEFAULT 1,
            periodo_actual      TEXT,
            activo              INTEGER NOT NULL DEFAULT 1,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 12. REGLAS OPERATIVAS GLOBALES
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS configuracion_operacion (
            id                         INTEGER PRIMARY KEY CHECK (id = 1),
            motivo_anulacion_minimo    INTEGER NOT NULL DEFAULT 5,
            fecha_actualizacion        DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        INSERT OR IGNORE INTO configuracion_operacion (id, motivo_anulacion_minimo)
        VALUES (1, 5)
    ''')

    for clave, nombre, prefijo in [
        ("V", "Ventas de contado", "V"),
        ("VC", "Ventas a cuenta", "VC"),
        ("CU", "Cursos e inscripciones", "CUR"),
        ("QT", "Cuotas", "CUO"),
        ("PD", "Pagos de deuda", "PAG"),
    ]:
        cursor.execute('''
            INSERT OR IGNORE INTO configuracion_folios
            (clave, nombre, prefijo, siguiente_numero, longitud, separador, incluir_anio, activo)
            VALUES (?, ?, ?, 1, 6, '-', 1, 1)
        ''', (clave, nombre, prefijo))

    # Migraciones automáticas para deudas existentes
    try:
        cursor.execute("ALTER TABLE clientes ADD COLUMN genero TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE clientes ADD COLUMN fecha_nacimiento DATE")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE deudas ADD COLUMN monto_original REAL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE deudas ADD COLUMN descuento REAL DEFAULT 0.0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE configuracion_folios ADD COLUMN periodo_actual TEXT")
    except sqlite3.OperationalError:
        pass
    # La condonación es distinta al descuento aplicado al crear una venta POS:
    # disminuye una cuenta por cobrar, pero nunca genera un ingreso.
    try:
        cursor.execute("ALTER TABLE deudas ADD COLUMN saldo_perdonado REAL DEFAULT 0.0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE deudas ADD COLUMN motivo_perdon TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE deudas ADD COLUMN fecha_perdon DATETIME")
    except sqlite3.OperationalError:
        pass

    # ── Paso 4: Ampliar pagos_deudas ──
    for col_sql in [
        "ALTER TABLE pagos_deudas ADD COLUMN id_operacion INTEGER",
        "ALTER TABLE pagos_deudas ADD COLUMN tipo_movimiento TEXT DEFAULT 'PAGO'",
        "ALTER TABLE pagos_deudas ADD COLUMN id_pago_origen INTEGER",
        "ALTER TABLE pagos_deudas ADD COLUMN fecha_evento DATETIME",
        "ALTER TABLE pagos_deudas ADD COLUMN fecha_registro_mov DATETIME",
        "ALTER TABLE pagos_deudas ADD COLUMN estado TEXT DEFAULT 'ACTIVO'",
    ]:
        try:
            cursor.execute(col_sql)
        except sqlite3.OperationalError:
            pass

    # Cada pago original sólo puede tener una reversa. Además de la validación
    # del endpoint, este índice protege la idempotencia ante peticiones
    # concurrentes.
    cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_reverso_origen
        ON pagos_deudas(id_pago_origen)
        WHERE id_pago_origen IS NOT NULL AND tipo_movimiento = 'REVERSO'
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_pagos_id_operacion
        ON pagos_deudas(id_operacion)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_detalles_id_operacion
        ON operacion_detalles(id_operacion)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_id_operacion
        ON movimientos_inventario(id_operacion)
    ''')

    # ── Paso 5: Ampliar deudas ──
    # (estado ya existe como TEXT y acepta 'ANULADA' sin migración)
    for col_sql in [
        "ALTER TABLE deudas ADD COLUMN id_operacion INTEGER",
        "ALTER TABLE deudas ADD COLUMN fecha_anulacion DATETIME",
        "ALTER TABLE deudas ADD COLUMN motivo_anulacion TEXT",
    ]:
        try:
            cursor.execute(col_sql)
        except sqlite3.OperationalError:
            pass

    # ── Paso 6: Ampliar inscripciones ──
    for col_sql in [
        "ALTER TABLE inscripciones ADD COLUMN id_operacion INTEGER",
        "ALTER TABLE inscripciones ADD COLUMN estado_inscripcion TEXT DEFAULT 'ACTIVA'",
        "ALTER TABLE inscripciones ADD COLUMN fecha_cancelacion DATETIME",
        "ALTER TABLE inscripciones ADD COLUMN motivo_cancelacion TEXT",
    ]:
        try:
            cursor.execute(col_sql)
        except sqlite3.OperationalError:
            pass

    # ── Paso 7: Ampliar cuotas_asociados ──
    try:
        cursor.execute("ALTER TABLE cuotas_asociados ADD COLUMN id_operacion INTEGER")
    except sqlite3.OperationalError:
        pass

    # Conceptos configurables de cuotas. Administración modifica sus precios
    # desde Catálogo / Inventario, sin tener que cambiar el código.
    for nombre, precio_venta in [
        ("Cuota mensual", 500.0),
        ("Cuota 2", 0.0),
        ("Cuota 3", 0.0),
        ("Cuota anual 1", 5000.0),
    ]:
        cursor.execute('''
            SELECT id FROM inventario
            WHERE LOWER(nombre) = LOWER(?) AND LOWER(categoria) = 'cuotas'
            LIMIT 1
        ''', (nombre,))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO inventario (
                    nombre, tipo, categoria, precio_costo, precio_venta,
                    stock_actual, stock_minimo, estatus
                ) VALUES (?, 'Servicio', 'Cuotas', 0, ?, 0, 0, 1)
            ''', (nombre, precio_venta))

    conexion.commit()
    conexion.close()
    print("Auditoría de Sistema: base limpia creada con el modelo unificado de deudas.")

if __name__ == "__main__":
    inicializar_base_datos()
