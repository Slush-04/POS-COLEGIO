from database import get_db_connection
import sqlite3

def update():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if we already have nombre_participante to avoid errors
    cursor.execute("PRAGMA table_info(inscripciones)")
    cols = [col[1] for col in cursor.fetchall()]
    if 'nombre_participante' in cols:
        print("Schema already updated.")
        return
        
    cursor.execute("ALTER TABLE inscripciones RENAME TO inscripciones_old")
    cursor.execute('''
        CREATE TABLE inscripciones (
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
    cursor.execute('''
        INSERT INTO inscripciones (
            id_inscripcion, id_cliente, id_curso, tipo_tarifa, monto_total, 
            saldo_pendiente, estado_pago, facturado, fecha_registro
        )
        SELECT 
            id_inscripcion, id_cliente, id_curso, tipo_tarifa, monto_total, 
            saldo_pendiente, estado_pago, facturado, fecha_registro 
        FROM inscripciones_old
    ''')
    cursor.execute("DROP TABLE inscripciones_old")
    conn.commit()
    conn.close()
    print("Database schema updated successfully.")

if __name__ == '__main__':
    update()
