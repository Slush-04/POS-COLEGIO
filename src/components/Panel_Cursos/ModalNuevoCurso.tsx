import { useState, useEffect, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { X } from "lucide-react";

interface ModalNuevoCursoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cursoAEditar?: any;
}

export function ModalNuevoCurso({ isOpen, onClose, onSuccess, cursoAEditar }: ModalNuevoCursoProps) {
  const [nombre, setNombre] = useState("");
  const [ponente, setPonente] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estatus, setEstatus] = useState("ACTIVO");

  // Cambiados a string para poder mostrar valores vacíos y formatear con comas
  const [precioGeneral, setPrecioGeneral] = useState("");
  const [precioAsociado, setPrecioAsociado] = useState("");
  const [precioAsociadoExterno, setPrecioAsociadoExterno] = useState("");
  const [precioEstudiante, setPrecioEstudiante] = useState("");
  const [precioColaborador, setPrecioColaborador] = useState("");

  // Limpiar o cargar datos cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (cursoAEditar) {
        setNombre(cursoAEditar.nombre || "");
        setPonente(cursoAEditar.ponente || "");
        setFechaInicio(cursoAEditar.fecha_inicio || "");
        setFechaFin(cursoAEditar.fecha_fin || "");
        setEstatus(cursoAEditar.estatus || "ACTIVO");
        setPrecioGeneral(cursoAEditar.precio_general?.toString() || "");
        setPrecioAsociado(cursoAEditar.precio_asociado?.toString() || "");
        setPrecioAsociadoExterno(cursoAEditar.precio_asociado_externo?.toString() || "");
        setPrecioEstudiante(cursoAEditar.precio_estudiante?.toString() || "");
        setPrecioColaborador(cursoAEditar.precio_colaborador?.toString() || "");
      } else {
        setNombre("");
        setPonente("");
        setFechaInicio("");
        setFechaFin("");
        setEstatus("ACTIVO");
        setPrecioGeneral("");
        setPrecioAsociado("");
        setPrecioAsociadoExterno("");
        setPrecioEstudiante("");
        setPrecioColaborador("");
      }
    }
  }, [isOpen, cursoAEditar]);

  if (!isOpen) return null;

  // Helper para manejar el cambio de precio (remueve comas y no-números)
  const handlePriceChange = (setter: Dispatch<SetStateAction<string>>) => (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setter(rawValue);
  };

  // Helper para mostrar con comas
  const formatPrice = (val: string) => {
    if (!val) return "";
    return Number(val).toLocaleString("en-US");
  };

  const handleGuardarCurso = async () => {
    try {
      // Validaciones básicas
      if (!nombre || !fechaInicio) {
        alert("Por favor completa el nombre y la fecha de inicio del curso.");
        return;
      }

      const url = cursoAEditar ? `http://127.0.0.1:8000/api/cursos/${cursoAEditar.id_curso}` : "http://127.0.0.1:8000/api/cursos";
      const method = cursoAEditar ? "PUT" : "POST";

      const respuesta = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre,
          ponente: ponente,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          capacidad_max: 100, // Valor por defecto
          precio_general: Number(precioGeneral) || 0,
          precio_asociado: Number(precioAsociado) || 0,
          precio_asociado_externo: Number(precioAsociadoExterno) || 0,
          precio_estudiante: Number(precioEstudiante) || 0,
          precio_colaborador: Number(precioColaborador) || 0,
          estatus,
        })
      });

      if (respuesta.ok) {
        alert(cursoAEditar ? "¡Curso modificado con éxito!" : "¡Curso guardado con éxito!");
        onClose(); // Cierra el modal
        if (onSuccess) onSuccess(); // Llama a tu función cargarCursos() para que la pantalla se actualice sola
      } else {
        const errorData = await respuesta.json();
        alert(`Error al guardar: ${errorData.detail || 'Verifica los datos enviados.'}`);
      }
    } catch (error) {
      console.error("Fallo al guardar el curso", error);
      alert("Hubo un error de red o el servidor no está corriendo. Revisa la consola.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/[0.045] backdrop-blur-xl border border-white/12 rounded-xl shadow-[0_16px_45px_rgba(0,0,0,0.22)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{cursoAEditar ? "Modificar Curso" : "Nuevo Curso"}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Detalles Generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Nombre del curso</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ej. Seminario de Actualización"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Nombre del ponente</label>
                <input
                  type="text"
                  value={ponente}
                  onChange={(e) => setPonente(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ej. Dr. Juan Pérez"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Fecha de inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Fecha de fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Estatus del curso</label>
                <select
                  value={estatus}
                  onChange={(e) => setEstatus(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="CERRADO">Cerrado</option>
                </select>
                <p className="text-xs text-zinc-500">Los cursos de meses anteriores se actualizan automáticamente según los pagos pendientes.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Precios por tipo de participante</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">General</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="text"
                    value={formatPrice(precioGeneral)}
                    onChange={handlePriceChange(setPrecioGeneral)}
                    className="w-full pl-7 pr-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Asociado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="text"
                    value={formatPrice(precioAsociado)}
                    onChange={handlePriceChange(setPrecioAsociado)}
                    className="w-full pl-7 pr-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Asociado Externo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="text"
                    value={formatPrice(precioAsociadoExterno)}
                    onChange={handlePriceChange(setPrecioAsociadoExterno)}
                    className="w-full pl-7 pr-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Estudiante No Aso.</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="text"
                    value={formatPrice(precioEstudiante)}
                    onChange={handlePriceChange(setPrecioEstudiante)}
                    className="w-full pl-7 pr-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Colaboradores</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="text"
                    value={formatPrice(precioColaborador)}
                    onChange={handlePriceChange(setPrecioColaborador)}
                    className="w-full pl-7 pr-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGuardarCurso}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-bold shadow-sm transition-colors"
          >
            {cursoAEditar ? "Guardar Cambios" : "Crear Curso"}
          </button>
        </div>
      </div>
    </div>
  );
}
