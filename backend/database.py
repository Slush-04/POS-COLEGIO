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
