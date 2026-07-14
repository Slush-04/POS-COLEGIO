from database import inicializar_base_datos
from sembrar_clientes import sembrar_clientes
from sembrar_cursos import sembrar_cursos_y_participantes
from sembrar_inventario import sembrar_inventario


def sembrar_datos_prueba():
    inicializar_base_datos()
    sembrar_clientes()
    sembrar_cursos_y_participantes()
    sembrar_inventario()
    print("Exito: base de prueba lista con el modelo nuevo.")


if __name__ == "__main__":
    sembrar_datos_prueba()
