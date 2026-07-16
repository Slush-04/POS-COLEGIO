import os
import sys
import sqlite3
from datetime import datetime

# Agregar la ruta actual al path para importar database y main
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def print_banner(msg):
    print("=" * 60)
    print(f" {msg}")
    print("=" * 60)

def main():
    print_banner("INICIANDO PRUEBAS DE INTEGRACIÓN DEL SISTEMA POS")
    
    # 1. Obtener estado inicial del Dashboard Financiero
    print("\n[Paso 1] Consultando estado inicial del Dashboard Financiero...")
    resp_dash_init = client.get("/api/pagos/dashboard")
    assert resp_dash_init.status_code == 200, f"Error al consultar dashboard inicial: {resp_dash_init.text}"
    dash_init = resp_dash_init.json()
    
    ingresos_init = dash_init["ingresos_mes"]
    cxc_init = dash_init["cuentas_por_cobrar"]
    cursos_activos_init = dash_init["cursos_activos"]
    participantes_init = dash_init["participantes_inscritos"]
    
    print(f"  Ingresos del Mes: ${ingresos_init:,.2f}")
    print(f"  Cuentas por Cobrar: ${cxc_init:,.2f}")
    print(f"  Cursos Activos: {cursos_activos_init}")
    print(f"  Participantes Inscritos: {participantes_init}")

    # 2. Obtener un cliente y un producto/servicio para probar
    print("\n[Paso 2] Consultando catálogo y base de datos para la prueba...")
    conexion = get_db_connection()
    cursor = conexion.cursor()
    
    # Obtener el cliente Roberto Campos Ruiz (id_cliente = 1 en base al seed)
    cursor.execute("SELECT id_cliente, nombre, tipo_cliente FROM clientes WHERE id_cliente = 1")
    cliente_test = cursor.fetchone()
    assert cliente_test is not None, "El cliente Roberto Campos Ruiz no se encontró en la base sembrada."
    id_cliente, nombre_cliente, tipo_cliente = cliente_test
    print(f"  Cliente de prueba seleccionado: {nombre_cliente} (ID: {id_cliente}, Tipo: {tipo_cliente})")
    
    # Obtener un producto del inventario para la venta (por ejemplo el primero)
    cursor.execute("SELECT id, nombre, precio_venta, stock_actual FROM inventario WHERE tipo = 'Producto' AND estatus = 1 LIMIT 1")
    producto_test = cursor.fetchone()
    assert producto_test is not None, "No hay productos activos en inventario."
    id_prod, nombre_prod, precio_prod, stock_prod = producto_test
    print(f"  Producto seleccionado para POS: {nombre_prod} (ID: {id_prod}, Precio Venta: ${precio_prod:,.2f}, Stock: {stock_prod})")

    # Obtener un curso activo para inscripción
    cursor.execute("SELECT id_curso, nombre, precio_general FROM cursos WHERE estatus = 'ACTIVO' LIMIT 1")
    curso_test = cursor.fetchone()
    assert curso_test is not None, "No hay cursos activos."
    id_curso, nombre_curso, precio_curso = curso_test
    print(f"  Curso seleccionado para POS: {nombre_curso} (ID: {id_curso}, Precio General: ${precio_curso:,.2f})")
    conexion.close()

    # 3. Realizar una Venta de Contado (Efectivo) en el POS (tipo_pago = "pago")
    print("\n[Paso 3] Realizando una venta de contado en el POS...")
    payload_venta_contado = {
        "id_cliente": id_cliente,
        "tipo_pago": "pago",
        "metodo_pago": "efectivo",
        "monto_total": float(precio_prod),
        "items": [
            {
                "id": id_prod,
                "type": "inventario",
                "name": nombre_prod,
                "price": float(precio_prod),
                "quantity": 1
            }
        ],
        "descuento_porcentaje": 0.0,
        "descuento_monto": 0.0,
        "subtotal": float(precio_prod),
        "aplica_iva": False,
        "iva_porcentaje": 0.0,
        "iva_monto": 0.0,
        "pagos": [
            {
                "metodo_pago": "efectivo",
                "monto": float(precio_prod)
            }
        ]
    }
    
    resp_venta = client.post("/api/pos/checkout", json=payload_venta_contado)
    assert resp_venta.status_code == 200, f"Error en checkout venta contado: {resp_venta.text}"
    venta_res = resp_venta.json()
    folio_venta = venta_res.get("folio")
    print(f"  Venta de contado procesada con éxito. Folio generado: {folio_venta}")

    # 4. Realizar una Venta a Cuenta de un Curso (tipo_pago = "cuenta")
    print("\n[Paso 4] Realizando una venta a cuenta (inscripción a curso) en el POS...")
    payload_venta_cuenta = {
        "id_cliente": id_cliente,
        "tipo_pago": "cuenta",
        "monto_total": float(precio_curso),
        "items": [
            {
                "id": id_curso,
                "type": "curso",
                "name": nombre_curso,
                "price": float(precio_curso),
                "quantity": 1
            }
        ],
        "descuento_porcentaje": 0.0,
        "descuento_monto": 0.0,
        "subtotal": float(precio_curso),
        "aplica_iva": False,
        "iva_porcentaje": 0.0,
        "iva_monto": 0.0
    }
    
    resp_cuenta = client.post("/api/pos/checkout", json=payload_venta_cuenta)
    assert resp_cuenta.status_code == 200, f"Error en checkout venta a cuenta: {resp_cuenta.text}"
    cuenta_res = resp_cuenta.json()
    folio_cuenta = cuenta_res.get("folio")
    print(f"  Venta a cuenta procesada con éxito. Folio generado: {folio_cuenta}")

    # 5. Verificar que el Dashboard se haya actualizado en tiempo real
    print("\n[Paso 5] Consultando nuevamente el Dashboard Financiero para verificar actualizaciones...")
    resp_dash_new = client.get("/api/pagos/dashboard")
    assert resp_dash_new.status_code == 200, f"Error al consultar dashboard final: {resp_dash_new.text}"
    dash_new = resp_dash_new.json()
    
    ingresos_new = dash_new["ingresos_mes"]
    cxc_new = dash_new["cuentas_por_cobrar"]
    cursos_activos_new = dash_new["cursos_activos"]
    participantes_new = dash_new["participantes_inscritos"]
    
    print(f"  NUEVOS Ingresos del Mes: ${ingresos_new:,.2f} (Incremento: ${ingresos_new - ingresos_init:,.2f})")
    print(f"  NUEVAS Cuentas por Cobrar: ${cxc_new:,.2f} (Incremento: ${cxc_new - cxc_init:,.2f})")
    print(f"  NUEVOS Cursos Activos: {cursos_activos_new}")
    print(f"  NUEVOS Participantes Inscritos: {participantes_new} (Incremento: {participantes_new - participantes_init})")
    
    # Validaciones matemáticas:
    # Ingresos mensuales debieron incrementar exactamente por el total de la venta de contado
    assert abs((ingresos_new - ingresos_init) - precio_prod) < 0.01, f"El incremento de ingresos (${ingresos_new - ingresos_init:.2f}) no coincide con el precio del producto (${precio_prod:.2f})"
    # Cuentas por cobrar debieron incrementar por el precio del curso cobrado a cuenta
    assert abs((cxc_new - cxc_init) - precio_curso) < 0.01, f"El incremento de CxC (${cxc_new - cxc_init:.2f}) no coincide con el precio del curso (${precio_curso:.2f})"
    # Participantes inscritos debieron incrementar en 1
    assert (participantes_new - participantes_init) == 1, "El número de inscritos no aumentó en 1."
    print("  => Las fórmulas matemáticas del Dashboard y flujos de datos son 100% correctos.")

    # 6. Verificar Historial de Transacciones
    print("\n[Paso 6] Verificando que las transacciones se muestren en el Historial...")
    # Buscamos la última operación para ver los detalles
    conexion = get_db_connection()
    cursor = conexion.cursor()
    cursor.execute("SELECT id_operacion, folio, tipo_operacion, total, estado FROM operaciones ORDER BY id_operacion DESC LIMIT 2")
    ops = cursor.fetchall()
    
    print("  Últimas operaciones registradas en DB:")
    for op in ops:
        id_op, fol, tipo_op, tot, est = op
        print(f"    - ID: {id_op}, Folio: {fol}, Tipo: {tipo_op}, Total: ${tot:,.2f}, Estado: {est}")
    
    # Comprobar que los folios coinciden
    folios_registrados = [op[1] for op in ops]
    assert folio_venta in folios_registrados, f"El folio de la venta de contado {folio_venta} no se encuentra registrado en operaciones."
    assert folio_cuenta in folios_registrados, f"El folio de la venta a cuenta {folio_cuenta} no se encuentra registrado en operaciones."
    
    # 7. Verificar el detalle de la operación de contado en base de datos
    print("\n[Paso 7] Verificando detalles de las transacciones (operacion_detalles)...")
    # Obtener detalles de la venta de contado
    cursor.execute("SELECT id_operacion FROM operaciones WHERE folio = ?", (folio_venta,))
    id_op_venta = cursor.fetchone()[0]
    
    cursor.execute("SELECT id_detalle, tipo_detalle, descripcion, precio_unitario, importe_total FROM operacion_detalles WHERE id_operacion = ?", (id_op_venta,))
    detalles = cursor.fetchall()
    print(f"  Detalle de la operación {folio_venta}:")
    for det in detalles:
        id_det, tipo_det, desc, precio_u, importe_t = det
        print(f"    - Detalle ID: {id_det}, Tipo: {tipo_det}, Descripción: {desc}, Precio Unitario: ${precio_u:,.2f}, Importe: ${importe_t:,.2f}")
        assert tipo_det == "INVENTARIO", "El tipo de detalle no es INVENTARIO."
        assert abs(importe_t - precio_prod) < 0.01, "El importe del detalle no coincide con el precio del producto."

    # 8. Verificar stock de inventario descontado
    print("\n[Paso 8] Verificando descuento de stock de inventario...")
    cursor.execute("SELECT stock_actual FROM inventario WHERE id = ?", (id_prod,))
    stock_final = cursor.fetchone()[0]
    print(f"  Stock Inicial: {stock_prod} | Stock Final: {stock_final}")
    assert stock_final == stock_prod - 1, "El stock no fue decrementado correctamente."
    print("  => Descuento de stock verificado correctamente.")

    # 9. Realizar pago de una cuota pendiente y ver si se asocia correctamente
    print("\n[Paso 9] Probando el pago de una cuota/deuda de la base sembrada...")
    # Obtener una deuda de cuota pendiente para el cliente Diana Morales Vega (id_cliente = 2)
    cursor.execute("SELECT id_deuda, concepto, monto_total FROM deudas WHERE id_cliente = 2 AND estado = 'PENDIENTE' LIMIT 1")
    deuda_pendiente = cursor.fetchone()
    assert deuda_pendiente is not None, "No se encontró deuda pendiente para Diana Morales Vega."
    id_deuda_pagar, concepto_deuda, monto_deuda = deuda_pendiente
    print(f"  Deuda a abonar: ID {id_deuda_pagar}, Concepto: {concepto_deuda}, Monto: ${monto_deuda:,.2f}")
    
    # Realizar abono por el total de la deuda
    payload_abono = {
        "id_deuda": id_deuda_pagar,
        "monto_abono": float(monto_deuda),
        "metodo_pago": "transferencia",
        "observacion": "Abono de prueba desde script de integración"
    }
    resp_abono = client.post("/api/pagos/deudas/abono", json=payload_abono)
    assert resp_abono.status_code == 200, f"Error al procesar abono: {resp_abono.text}"
    abono_res = resp_abono.json()
    print(f"  Abono procesado exitosamente: {abono_res}")
    
    # Verificar que el estado de la deuda ahora sea 'PAGADO'
    cursor.execute("SELECT estado FROM deudas WHERE id_deuda = ?", (id_deuda_pagar,))
    estado_final_deuda = cursor.fetchone()[0]
    print(f"  Nuevo estado de la deuda en DB: {estado_final_deuda}")
    assert estado_final_deuda == 'PAGADO', "La deuda no cambió de estado a PAGADO."
    
    # Verificar que se haya creado una operación de tipo PAGO_DEUDA y un detalle
    cursor.execute("SELECT id_operacion, folio, tipo_operacion, total FROM operaciones WHERE tipo_operacion = 'PAGO_DEUDA' ORDER BY id_operacion DESC LIMIT 1")
    op_pago = cursor.fetchone()
    assert op_pago is not None, "No se registró la operación de tipo PAGO_DEUDA."
    id_op_p, folio_op_p, tipo_op_p, total_op_p = op_pago
    print(f"  Operación de pago creada: ID: {id_op_p}, Folio: {folio_op_p}, Tipo: {tipo_op_p}, Total: ${total_op_p:,.2f}")
    assert abs(total_op_p - monto_deuda) < 0.01, "El total de la operación no coincide con el monto abonado."
    
    conexion.close()
    
    print_banner("TODAS LAS PRUEBAS SE COMPLETARON CON ÉXITO (100% OK)")

if __name__ == "__main__":
    main()
