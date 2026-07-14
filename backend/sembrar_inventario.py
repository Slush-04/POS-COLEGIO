from database import get_db_connection
import sqlite3


INVENTARIO_PRUEBA = [
    ("Manual de Reformas Fiscales 2026", "Producto", "Libros", 250.0, 450.0, 18, 5),
    ("Guia Practica de ISR", "Producto", "Libros", 180.0, 320.0, 12, 4),
    ("Agenda Fiscal Profesional", "Producto", "Papeleria", 90.0, 180.0, 25, 8),
    ("Constancia Digital de Curso", "Servicio", "Servicios", 0.0, 150.0, 999, 0),
    ("Reposicion de Credencial", "Servicio", "Servicios", 40.0, 120.0, 50, 5),
]


def sembrar_inventario():
    conexion = None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.executemany('''
            INSERT INTO inventario (
                nombre, tipo, categoria, precio_costo, precio_venta,
                stock_actual, stock_minimo, estatus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ''', INVENTARIO_PRUEBA)
        conexion.commit()
        print(f"Exito: se sembraron {len(INVENTARIO_PRUEBA)} articulos de inventario.")
    except sqlite3.IntegrityError as e:
        if conexion:
            conexion.rollback()
        print(f"Error de integridad al sembrar inventario: {e}")
    except Exception as e:
        if conexion:
            conexion.rollback()
        print(f"Error inesperado al sembrar inventario: {e}")
    finally:
        if conexion:
            conexion.close()


if __name__ == "__main__":
    sembrar_inventario()
