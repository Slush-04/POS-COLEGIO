import os
from database import inicializar_base_datos, DB_PATH
from sembrar_clientes import sembrar_clientes
from sembrar_cursos import sembrar_cursos_y_participantes
from sembrar_inventario import sembrar_inventario


def sembrar_datos_prueba():
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print(f"Base de datos antigua eliminada en: {DB_PATH}")
        except Exception as e:
            print(f"Advertencia al eliminar base de datos anterior: {e}")
            
    inicializar_base_datos()
    sembrar_clientes()
    sembrar_cursos_y_participantes()
    sembrar_inventario()
    print("Exito: base de prueba lista con el modelo nuevo.")


if __name__ == "__main__":
    sembrar_datos_prueba()

