from database import get_db_connection
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sqlite3

router = APIRouter(
    prefix="/api/inventario",
    tags=["Inventario"],
)

class ItemInventario(BaseModel):
    nombre: str
    tipo: str # 'Producto' o 'Servicio'
    categoria: str
    precio_costo: float = 0.0
    precio_venta: float = 0.0
    stock_actual: int = 0
    stock_minimo: int = 0
    estatus: int = 1

class AjusteStock(BaseModel):
    nuevo_stock: int

@router.post("")
def registrar_item(item: ItemInventario):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        stock_actual = 0 if item.tipo == 'Servicio' else item.stock_actual
        stock_minimo = 0 if item.tipo == 'Servicio' else item.stock_minimo
        cursor.execute('''
            INSERT INTO inventario (
                nombre, tipo, categoria, precio_costo, precio_venta, 
                stock_actual, stock_minimo, estatus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            item.nombre, item.tipo, item.categoria, item.precio_costo,
            item.precio_venta, stock_actual, stock_minimo, item.estatus
        ))
        conexion.commit()
        return {"estatus": "éxito", "mensaje": f"Ítem {item.nombre} registrado correctamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
    finally:
        conexion.close()

@router.get("")
def obtener_inventario(tipo: Optional[str] = None, categoria: Optional[str] = None):
    conexion = get_db_connection()
    try:
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        
        query = "SELECT * FROM inventario WHERE estatus = 1"
        params = []
        
        if tipo:
            query += " AND tipo = ?"
            params.append(tipo)
        if categoria:
            query += " AND categoria = ?"
            params.append(categoria)
            
        query += " ORDER BY nombre ASC"
        
        cursor.execute(query, params)
        items = [dict(row) for row in cursor.fetchall()]
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al leer base de datos: {str(e)}")
    finally:
        conexion.close()

@router.put("/{id_item}")
def actualizar_item(id_item: int, item: ItemInventario):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        stock_actual = 0 if item.tipo == 'Servicio' else item.stock_actual
        stock_minimo = 0 if item.tipo == 'Servicio' else item.stock_minimo
        cursor.execute('''
            UPDATE inventario SET
                nombre = ?, tipo = ?, categoria = ?, precio_costo = ?, 
                precio_venta = ?, stock_actual = ?, stock_minimo = ?, estatus = ?
            WHERE id = ?
        ''', (
            item.nombre, item.tipo, item.categoria, item.precio_costo,
            item.precio_venta, stock_actual, stock_minimo, item.estatus,
            id_item
        ))
        conexion.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ítem no encontrado.")
        return {"estatus": "éxito", "mensaje": f"Ítem {item.nombre} actualizado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
    finally:
        conexion.close()

@router.patch("/{id_item}/stock")
def ajustar_stock(id_item: int, ajuste: AjusteStock):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute("UPDATE inventario SET stock_actual = ? WHERE id = ?", (ajuste.nuevo_stock, id_item))
        conexion.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ítem no encontrado.")
        return {"estatus": "éxito", "mensaje": f"Stock actualizado a {ajuste.nuevo_stock}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
    finally:
        conexion.close()

@router.delete("/{id_item}")
def eliminar_item(id_item: int):
    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute("UPDATE inventario SET estatus = 0 WHERE id = ?", (id_item,))
        conexion.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ítem no encontrado.")
        return {"estatus": "éxito", "mensaje": "Ítem eliminado correctamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el sistema: {str(e)}")
    finally:
        conexion.close()
