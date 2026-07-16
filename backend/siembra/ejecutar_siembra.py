"""
ejecutar_siembra.py — Orquestador principal de siembra de datos
===============================================================
Coordina la ejecución de los módulos de siembra en orden:
  1. Catálogos base (clientes, cursos, inventario)
  2. Simulación de operaciones reales (ventas, inscripciones, pagos)

USO:
  python backend/siembra/ejecutar_siembra.py          → Siembra solo si la base está vacía
  python backend/siembra/ejecutar_siembra.py --reset   → Borra la base y siembra desde cero

IMPORTANTE:
  Este script NO elimina la base de datos automáticamente.
  Solo se elimina con el flag --reset de forma explícita.
"""

import os
import sys
import argparse
import glob

# Asegurar que el paquete backend sea importable
backend_dir = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, backend_dir)

# Asegurar que el venv del backend esté disponible
venv_site = glob.glob(os.path.join(backend_dir, "venv", "lib", "python*", "site-packages"))
if venv_site:
    sys.path.insert(0, venv_site[0])

from database import inicializar_base_datos, get_db_connection, DB_PATH


def base_tiene_datos() -> bool:
    """Verifica si la base de datos ya contiene registros en las tablas principales."""
    if not os.path.exists(DB_PATH):
        return False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clientes")
        total_clientes = cursor.fetchone()[0]
        conn.close()
        return total_clientes > 0
    except Exception:
        return False


def ejecutar_siembra(forzar_reset: bool = False):
    """Ejecuta el proceso completo de siembra de datos iniciales."""

    print("=" * 60)
    print(" SISTEMA DE SIEMBRA DE DATOS INICIALES")
    print("=" * 60)

    # Paso 1: Reset explícito si se solicitó
    if forzar_reset:
        if os.path.exists(DB_PATH):
            try:
                os.remove(DB_PATH)
                print(f"\n[RESET] Base de datos eliminada: {DB_PATH}")
            except Exception as e:
                print(f"\n[ERROR] No se pudo eliminar la base: {e}")
                return
        else:
            print(f"\n[RESET] No existía base de datos previa.")

    # Paso 2: Inicializar esquema (crea tablas si no existen)
    inicializar_base_datos()
    print("[OK] Esquema de base de datos verificado.")

    # Paso 3: Verificar si ya hay datos
    if base_tiene_datos() and not forzar_reset:
        print("\n[INFO] La base de datos ya contiene registros.")
        print("       No se sembrarán datos duplicados.")
        print("       Para reiniciar, usa: python backend/siembra/ejecutar_siembra.py --reset")
        return

    # Paso 4: Sembrar catálogos
    from siembra.s01_catalogos import sembrar_catalogos
    sembrar_catalogos()

    # Paso 5: Simular operaciones reales
    from siembra.s02_operaciones import simular_operaciones
    simular_operaciones()

    # Paso 6: Resumen final
    print("\n" + "=" * 60)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM clientes")
    n_clientes = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM cursos")
    n_cursos = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM inventario")
    n_inventario = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM operaciones")
    n_operaciones = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM deudas WHERE estado = 'PENDIENTE'")
    n_deudas = cursor.fetchone()[0]
    conn.close()

    print(f" SIEMBRA COMPLETADA")
    print(f"   Clientes:     {n_clientes}")
    print(f"   Cursos:       {n_cursos}")
    print(f"   Inventario:   {n_inventario}")
    print(f"   Operaciones:  {n_operaciones}")
    print(f"   Deudas pend.: {n_deudas}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Siembra de datos iniciales del sistema.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Elimina la base de datos existente y siembra desde cero.",
    )
    args = parser.parse_args()
    ejecutar_siembra(forzar_reset=args.reset)
