## ¿Cómo eliminar estos datos temporales?
Para facilitar la eliminación de estos datos ficticios sin afectar a tus registros reales o de producción, el script marca todos estos cursos de prueba con el estatus 'TEMPORAL' en la tabla cursos.

Si deseas eliminarlos en el futuro, puedes hacerlo ejecutando las siguientes sentencias SQL en tu gestor de base de datos (SQLite) en este orden para respetar la integridad de las relaciones:

1. Eliminar transacciones de pago asociadas a inscripciones temporales:

DELETE FROM pagos_transacciones 
WHERE id_inscripcion IN (
    SELECT id_inscripcion FROM inscripciones 
    WHERE id_curso IN (SELECT id_curso FROM cursos WHERE estatus = 'TEMPORAL')
);
2. Eliminar las inscripciones a los cursos temporales:

DELETE FROM inscripciones 
WHERE id_curso IN (SELECT id_curso FROM cursos WHERE estatus = 'TEMPORAL');

3. Eliminar los cursos temporales:

DELETE FROM cursos 
WHERE estatus = 'TEMPORAL';