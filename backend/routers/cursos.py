from database import get_db_connection, generar_folio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
from datetime import date, datetime

router = APIRouter(
    prefix="/api/cursos",
    tags=["Cursos"],
)

# ==========================================
# MÓDULO 2: CATÁLOGO DE CURSOS E INVENTARIO
# ==========================================
ESTATUS_CURSOS = {"ACTIVO", "PENDIENTE", "CERRADO"}


class DatosCurso(BaseModel):
    nombre: str
    ponente: str = ""
    fecha_inicio: str  # Formato YYYY-MM-DD
    fecha_fin: str     # Formato YYYY-MM-DD
    capacidad_max: int
    precio_general: float
    precio_asociado: float
    precio_asociado_externo: float
    precio_estudiante: float
    precio_colaborador: float
    estatus: str = "ACTIVO"


def _normalizar_estatus(estatus: str) -> str:
    estatus_normalizado = (estatus or "ACTIVO").strip().upper()
    if estatus_normalizado not in ESTATUS_CURSOS:
        raise HTTPException(status_code=400, detail="El estatus debe ser Activo, Pendiente o Cerrado.")
    return estatus_normalizado


def _actualizar_estatus_automaticos(cursor):
    """Actualiza cursos de meses anteriores, salvo los cerrados manualmente."""
    inicio_mes_actual = date.today().replace(day=1).isoformat()
    cursor.execute('''
        SELECT id_curso FROM cursos
        WHERE date(fecha_inicio) < date(?)
          AND UPPER(COALESCE(estatus, 'ACTIVO')) != 'CERRADO'
    ''', (inicio_mes_actual,))

    for (id_curso,) in cursor.fetchall():
        cursor.execute('''
            SELECT COUNT(i.id_inscripcion), COALESCE(SUM(CASE
                WHEN d.id_deuda IS NOT NULL THEN CASE
                    WHEN d.estado = 'PAGADO' OR d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                        SELECT SUM(pd.monto_pagado) FROM pagos_deudas pd
                        WHERE pd.id_deuda = d.id_deuda
                    ), 0) <= 0.005 THEN 1 ELSE 0 END
                WHEN i.estado_pago = 'PAGADO' OR i.saldo_pendiente <= 0.005 THEN 1
                ELSE 0
            END), 0)
            FROM inscripciones i
            LEFT JOIN deudas d ON d.tipo_deuda = 'CURSO' AND d.id_referencia = i.id_inscripcion
            WHERE i.id_curso = ?
              AND COALESCE(i.estado_inscripcion, 'ACTIVA') = 'ACTIVA'
        ''', (id_curso,))
        total_participantes, participantes_pagados = cursor.fetchone()
        nuevo_estatus = 'CERRADO' if total_participantes > 0 and total_participantes == participantes_pagados else 'PENDIENTE'
        cursor.execute("UPDATE cursos SET estatus = ? WHERE id_curso = ?", (nuevo_estatus, id_curso))


def _obtener_curso_inscribible(cursor, id_curso: int):
    cursor.execute("SELECT nombre, estatus FROM cursos WHERE id_curso = ?", (id_curso,))
    curso = cursor.fetchone()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado.")
    if (curso[1] or 'ACTIVO').upper() == 'CERRADO':
        raise HTTPException(status_code=400, detail="El curso está cerrado y ya no acepta participantes.")
    return curso


@router.get("")
def obtener_cursos():
    """Ventanilla para leer cursos."""
    try:
        conexion = get_db_connection()
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        _actualizar_estatus_automaticos(cursor)
        conexion.commit()
        cursor.execute('''
            SELECT 
                c.*,
                COALESCE(SUM(i.monto_total), 0) AS recaudacion_esperada,
                COALESCE(SUM(COALESCE((
                    SELECT
                        CASE
                            WHEN d.estado = 'PAGADO' THEN d.monto_total
                            ELSE COALESCE(SUM(pd.monto_pagado), 0)
                        END
                    FROM deudas d
                    LEFT JOIN pagos_deudas pd ON pd.id_deuda = d.id_deuda
                    WHERE d.tipo_deuda = 'CURSO'
                      AND d.id_referencia = i.id_inscripcion
                ), i.monto_total - i.saldo_pendiente)), 0) AS recaudacion_cobrada,
                COALESCE(COUNT(i.id_inscripcion), 0) AS total_participantes,
                COALESCE(SUM(CASE WHEN i.tipo_tarifa = 'asociado' THEN 1 ELSE 0 END), 0) AS total_asociados
            FROM cursos c
            LEFT JOIN inscripciones i ON c.id_curso = i.id_curso
                AND COALESCE(i.estado_inscripcion, 'ACTIVA') = 'ACTIVA'
            GROUP BY c.id_curso
            ORDER BY c.fecha_inicio DESC
        ''')
        cursos = [dict(row) for row in cursor.fetchall()]
        conexion.close()
        return cursos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def crear_curso(curso: DatosCurso):
    """Ventanilla para registrar nuevos cursos vacíos."""
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        estatus = _normalizar_estatus(curso.estatus)
        cursor.execute('''
            INSERT INTO cursos (
                nombre, ponente, fecha_inicio, fecha_fin, capacidad_max,
                precio_general, precio_asociado, precio_asociado_externo,
                precio_estudiante, precio_colaborador, estatus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            curso.nombre, curso.ponente, curso.fecha_inicio, curso.fecha_fin, curso.capacidad_max,
            curso.precio_general, curso.precio_asociado, curso.precio_asociado_externo,
            curso.precio_estudiante, curso.precio_colaborador, estatus
        ))
        conexion.commit()
        conexion.close()
        return {"estatus": "éxito", "mensaje": "Curso creado exitosamente sin participantes."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id_curso}")
def actualizar_curso(id_curso: int, curso: DatosCurso):
    """Ventanilla para modificar un curso existente."""
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        estatus = _normalizar_estatus(curso.estatus)
        cursor.execute('''
            UPDATE cursos SET
                nombre = ?, ponente = ?, fecha_inicio = ?, fecha_fin = ?, capacidad_max = ?,
                precio_general = ?, precio_asociado = ?, precio_asociado_externo = ?,
                precio_estudiante = ?, precio_colaborador = ?, estatus = ?
            WHERE id_curso = ?
        ''', (
            curso.nombre, curso.ponente, curso.fecha_inicio, curso.fecha_fin, curso.capacidad_max,
            curso.precio_general, curso.precio_asociado, curso.precio_asociado_externo,
            curso.precio_estudiante, curso.precio_colaborador, estatus,
            id_curso
        ))
        conexion.commit()

        if cursor.rowcount == 0:
            conexion.close()
            raise HTTPException(status_code=404, detail="Curso no encontrado.")

        conexion.close()
        return {"estatus": "éxito", "mensaje": "Curso actualizado correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# MÓDULO 3: ROSTER Y ESTADOS DE FACTURACIÓN
# ==========================================
class EstadoFacturacion(BaseModel):
    facturado: int  # Recibirá 0 (No) o 1 (Sí)


@router.patch("/inscripciones/{id_inscripcion}/facturado")
def actualizar_facturado_inscripcion(id_inscripcion: int, estado: EstadoFacturacion):
    if estado.facturado not in (0, 1):
        raise HTTPException(status_code=400, detail="El valor de facturado debe ser 0 o 1.")

    conexion = get_db_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute(
            "UPDATE inscripciones SET facturado = ? WHERE id_inscripcion = ?",
            (estado.facturado, id_inscripcion)
        )

        if cursor.rowcount == 0:
            conexion.rollback()
            raise HTTPException(status_code=404, detail="Inscripción no encontrada.")

        conexion.commit()
        return {
            "estatus": "exito",
            "mensaje": "Estado de facturación actualizado correctamente.",
            "id_inscripcion": id_inscripcion,
            "facturado": estado.facturado,
        }
    except HTTPException:
        raise
    except Exception as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar facturación: {str(e)}")
    finally:
        conexion.close()


@router.get("/{id_curso}/participantes")
def obtener_participantes_curso(id_curso: int):
    """Ventanilla que une los tickets de un curso con el nombre del cliente e id_deuda."""
    try:
        conexion = get_db_connection()
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()

        cursor.execute('''
            SELECT 
                i.id_inscripcion,
                c.id_cliente,
                COALESCE(c.nombre, i.nombre_participante) AS nombre_participante,
                c.rfc,
                i.tipo_tarifa,
                i.facturado,
                i.monto_total,
                d.id_deuda,
                CASE
                    WHEN d.estado = 'PAGADO' THEN d.monto_total
                    ELSE COALESCE((
                        SELECT SUM(pd.monto_pagado) FROM pagos_deudas pd WHERE pd.id_deuda = d.id_deuda
                    ), 0)
                END AS abonado,
                CASE
                    WHEN d.estado = 'PAGADO' THEN 0
                    ELSE COALESCE(d.monto_total - COALESCE(d.saldo_perdonado, 0) - COALESCE((
                        SELECT SUM(pd.monto_pagado) FROM pagos_deudas pd WHERE pd.id_deuda = d.id_deuda
                    ), 0), i.saldo_pendiente)
                END AS saldo_pendiente,
                COALESCE(d.estado, i.estado_pago) AS estado_pago
            FROM inscripciones i
            LEFT JOIN clientes c ON i.id_cliente = c.id_cliente
            LEFT JOIN deudas d ON d.tipo_deuda = 'CURSO' AND d.id_referencia = i.id_inscripcion
            WHERE i.id_curso = ?
              AND COALESCE(i.estado_inscripcion, 'ACTIVA') = 'ACTIVA'
        ''', (id_curso,))

        participantes = [dict(row) for row in cursor.fetchall()]
        conexion.close()
        return participantes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from typing import Optional, List

class DatosInscripcion(BaseModel):
    id_cliente: Optional[int] = None
    nombre: str
    rfc: str = ""
    telefono: str = ""
    tipo_tarifa: str
    monto_total: float
    saldo_pendiente: float
    estado_pago: str
    facturado: int = 0

@router.post("/{id_curso}/inscripciones")
def inscribir_participante(id_curso: int, inscripcion: DatosInscripcion):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        
        id_cliente = inscripcion.id_cliente
        # Si no hay id_cliente, intentamos vincular por RFC
        if not id_cliente and inscripcion.rfc:
            cursor.execute("SELECT id_cliente FROM clientes WHERE rfc = ?", (inscripcion.rfc,))
            row = cursor.fetchone()
            if row:
                id_cliente = row[0]

        curso_row = _obtener_curso_inscribible(cursor, id_curso)
        nombre_curso = curso_row[0]

        # ── Crear operación ──
        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        folio = generar_folio('CU', cursor)
        cursor.execute('''
            INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
            VALUES (?, 'CURSO', ?, ?, 'COMPLETADA', ?)
        ''', (folio, id_cliente, inscripcion.monto_total, fecha_actual))
        id_operacion = cursor.lastrowid
                
        cursor.execute('''
            INSERT INTO inscripciones (
                id_cliente, id_curso, nombre_participante, tipo_tarifa, monto_total,
                saldo_pendiente, estado_pago, facturado, id_operacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            id_cliente, id_curso, inscripcion.nombre, inscripcion.tipo_tarifa, inscripcion.monto_total,
            inscripcion.saldo_pendiente, inscripcion.estado_pago, inscripcion.facturado, id_operacion
        ))
        id_inscripcion = cursor.lastrowid

        # Auto-crear deuda si hay id_cliente (evitar duplicados)
        id_deuda_det = None
        if id_cliente:
            cursor.execute(
                "SELECT 1 FROM deudas WHERE tipo_deuda = 'CURSO' AND id_referencia = ?",
                (id_inscripcion,)
            )
            if not cursor.fetchone():
                estado_deuda = 'PAGADO' if inscripcion.saldo_pendiente == 0 and inscripcion.estado_pago == 'PAGADO' else 'PENDIENTE'
                cursor.execute('''
                    INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, id_operacion)
                    VALUES (?, 'CURSO', ?, ?, ?, ?, ?)
                ''', (id_cliente, id_inscripcion, f"Curso: {nombre_curso}", inscripcion.monto_total, estado_deuda, id_operacion))
                id_deuda_det = cursor.lastrowid

                # Si ya viene pagada, registrar en pagos_deudas
                if estado_deuda == 'PAGADO':
                    cursor.execute('''
                        INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion,
                                                  id_operacion, tipo_movimiento, fecha_evento, fecha_registro_mov, estado)
                        VALUES (?, ?, ?, 'No especificado', date('now'), 'Pago inicial de inscripción',
                                ?, 'PAGO', ?, ?, 'ACTIVO')
                    ''', (id_deuda_det, id_cliente, inscripcion.monto_total,
                          id_operacion, fecha_actual, fecha_actual))

        # Detalle de operación
        cursor.execute('''
            INSERT INTO operacion_detalles
            (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad,
             precio_unitario, descuento, iva, importe_total, id_deuda, id_inscripcion)
            VALUES (?, 'CURSO', ?, ?, 1, ?, 0, 0, ?, ?, ?)
        ''', (id_operacion, id_curso, nombre_curso, inscripcion.monto_total,
              inscripcion.monto_total, id_deuda_det, id_inscripcion))
        
        conexion.commit()
        conexion.close()
        return {"estatus": "éxito", "mensaje": "Participante inscrito correctamente.",
                "id_operacion": id_operacion, "folio": folio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BulkInscripciones(BaseModel):
    inscripciones: List[DatosInscripcion]

@router.post("/{id_curso}/inscripciones/bulk")
def inscribir_participantes_bulk(id_curso: int, payload: BulkInscripciones):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()

        curso_row = _obtener_curso_inscribible(cursor, id_curso)
        nombre_curso = curso_row[0]

        # ── Crear operación grupal ──
        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        total_op = round(sum(i.monto_total for i in payload.inscripciones), 2)
        folio = generar_folio('CU', cursor)
        cursor.execute('''
            INSERT INTO operaciones (folio, tipo_operacion, id_cliente, total, estado, fecha_evento)
            VALUES (?, 'CURSO', ?, ?, 'COMPLETADA', ?)
        ''', (folio, None, total_op, fecha_actual))
        id_operacion = cursor.lastrowid
        
        registrados = 0
        for inscripcion in payload.inscripciones:
            id_cliente = inscripcion.id_cliente
            if not id_cliente and inscripcion.rfc:
                cursor.execute("SELECT id_cliente FROM clientes WHERE rfc = ?", (inscripcion.rfc,))
                row = cursor.fetchone()
                if row:
                    id_cliente = row[0]
                    
            cursor.execute('''
                INSERT INTO inscripciones (
                    id_cliente, id_curso, nombre_participante, tipo_tarifa, monto_total,
                    saldo_pendiente, estado_pago, facturado, id_operacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                id_cliente, id_curso, inscripcion.nombre, inscripcion.tipo_tarifa, inscripcion.monto_total,
                inscripcion.saldo_pendiente, inscripcion.estado_pago, inscripcion.facturado, id_operacion
            ))
            id_inscripcion = cursor.lastrowid
            registrados += 1

            # Auto-crear deuda si hay id_cliente
            id_deuda_det = None
            if id_cliente:
                cursor.execute(
                    "SELECT 1 FROM deudas WHERE tipo_deuda = 'CURSO' AND id_referencia = ?",
                    (id_inscripcion,)
                )
                if not cursor.fetchone():
                    estado_deuda = 'PAGADO' if inscripcion.saldo_pendiente == 0 and inscripcion.estado_pago == 'PAGADO' else 'PENDIENTE'
                    cursor.execute('''
                        INSERT INTO deudas (id_cliente, tipo_deuda, id_referencia, concepto, monto_total, estado, id_operacion)
                        VALUES (?, 'CURSO', ?, ?, ?, ?, ?)
                    ''', (id_cliente, id_inscripcion, f"Curso: {nombre_curso}", inscripcion.monto_total, estado_deuda, id_operacion))
                    id_deuda_det = cursor.lastrowid
                    if estado_deuda == 'PAGADO':
                        cursor.execute('''
                            INSERT INTO pagos_deudas (id_deuda, id_cliente, monto_pagado, metodo_pago, fecha_pago, observacion,
                                                      id_operacion, tipo_movimiento, fecha_evento, fecha_registro_mov, estado)
                            VALUES (?, ?, ?, 'No especificado', date('now'), 'Pago inicial de inscripción',
                                    ?, 'PAGO', ?, ?, 'ACTIVO')
                        ''', (id_deuda_det, id_cliente, inscripcion.monto_total,
                              id_operacion, fecha_actual, fecha_actual))

            # Detalle de operación
            cursor.execute('''
                INSERT INTO operacion_detalles
                (id_operacion, tipo_detalle, id_referencia, descripcion, cantidad,
                 precio_unitario, descuento, iva, importe_total, id_deuda, id_inscripcion)
                VALUES (?, 'CURSO', ?, ?, 1, ?, 0, 0, ?, ?, ?)
            ''', (id_operacion, id_curso, nombre_curso, inscripcion.monto_total,
                  inscripcion.monto_total, id_deuda_det, id_inscripcion))
            
        conexion.commit()
        conexion.close()
        return {"estatus": "éxito", "mensaje": f"{registrados} participantes inscritos correctamente.",
                "id_operacion": id_operacion, "folio": folio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
