from database import get_db_connection
import sqlite3

def update_cuotas():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Agregar estatus_operativo y sector
    cursor.execute("PRAGMA table_info(clientes)")
    cols = [col[1] for col in cursor.fetchall()]
    
    if 'estatus_operativo' not in cols:
        cursor.execute("ALTER TABLE clientes ADD COLUMN estatus_operativo TEXT DEFAULT 'Activo'")
        print("Añadida columna estatus_operativo")
        
    if 'sector' not in cols:
        cursor.execute("ALTER TABLE clientes ADD COLUMN sector TEXT DEFAULT 'Normal'")
        print("Añadida columna sector")
        
    # Crear tabla de pagos parciales de cuotas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pagos_cuotas (
            id_pago_cuota INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cuota INTEGER NOT NULL,
            id_cliente INTEGER NOT NULL,
            monto_pagado REAL NOT NULL,
            metodo_pago TEXT NOT NULL,
            fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            observacion TEXT,
            
            FOREIGN KEY(id_cuota) REFERENCES cuotas_asociados(id_cuota),
            FOREIGN KEY(id_cliente) REFERENCES clientes(id_cliente)
        )
    ''')
    print("Tabla pagos_cuotas verificada/creada")
        
    conn.commit()
    conn.close()
    print("Database schema updated successfully for cuotas and clientes.")

if __name__ == '__main__':
    update_cuotas()
