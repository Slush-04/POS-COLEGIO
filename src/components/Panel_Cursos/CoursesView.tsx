import { ClipboardList, Download, UserPlus, DollarSign, Plus, Edit2, FileSpreadsheet } from "lucide-react";
import { useState, useEffect } from "react";
import { ModalNuevoCurso } from "./ModalNuevoCurso";
import { ModalPago } from "../Panel_Deudas/modalpagos_v1";
import { ModalInscripcionManual } from "./ModalInscripcionManual";
import { ModalImportarExcel } from "./ModalImportarExcel";
import { Paginacion } from "../ui/Paginacion";

export function CoursesView() {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [añoSeleccionado, setAñoSeleccionado] = useState(currentYear);
  const [mesSeleccionado, setMesSeleccionado] = useState(currentMonth);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<any>(null);
  const [participantesCurso, setParticipantesCurso] = useState<any[]>([]);

  const [listaCursos, setListaCursos] = useState<any[]>([]);

  const [isNuevoCursoOpen, setIsNuevoCursoOpen] = useState(false);
  const [cursoAEditar, setCursoAEditar] = useState<any>(null);
  const [isPagoOpen, setIsPagoOpen] = useState(false);
  const [selectedPaymentName, setSelectedPaymentName] = useState("");
  const [selectedPaymentAmount, setSelectedPaymentAmount] = useState("");
  const [selectedPaymentDeudaId, setSelectedPaymentDeudaId] = useState<number | null>(null);
  const [isInscripcionManualOpen, setIsInscripcionManualOpen] = useState(false);
  const [isImportarExcelOpen, setIsImportarExcelOpen] = useState(false);
  const [paginaParticipantes, setPaginaParticipantes] = useState(1);
  const itemsPorPaginaParticipantes = 10;

  const cargarParticipantes = () => {
    if (cursoSeleccionado && cursoSeleccionado.id_curso) {
      fetch(`http://127.0.0.1:8000/api/cursos/${cursoSeleccionado.id_curso}/participantes`)
        .then(respuesta => respuesta.json())
        .then(datos => setParticipantesCurso(datos))
        .catch(error => console.error("Error de red:", error));
    }
  };

  const cargarCursos = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cursos");
      if (res.ok) {
        const data = await res.json();
        setListaCursos(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  useEffect(() => {
    cargarParticipantes();
    setPaginaParticipantes(1);
  }, [cursoSeleccionado]);

  const actualizarFacturado = async (idInscripcion: number, facturado: number) => {
    const valorAnterior = participantesCurso.find(p => p.id_inscripcion === idInscripcion)?.facturado ?? 0;

    setParticipantesCurso(prev => prev.map(p =>
      p.id_inscripcion === idInscripcion ? { ...p, facturado } : p
    ));

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cursos/inscripciones/${idInscripcion}/facturado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facturado }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "No se pudo guardar el estado de facturación.");
      }
    } catch (error) {
      setParticipantesCurso(prev => prev.map(p =>
        p.id_inscripcion === idInscripcion ? { ...p, facturado: valorAnterior } : p
      ));
      alert(error instanceof Error ? error.message : "No se pudo guardar el estado de facturación.");
    }
  };

  const cursosFiltrados = listaCursos.filter(curso => {
    if (!curso.fecha_inicio) return false;
    const [año, mes, dia] = curso.fecha_inicio.split("-");
    return año === añoSeleccionado && mes === mesSeleccionado;
  });

  const totalPaginasParticipantes = Math.ceil(participantesCurso.length / itemsPorPaginaParticipantes) || 1;
  const startIdx = (paginaParticipantes - 1) * itemsPorPaginaParticipantes;
  const endIdx = Math.min(startIdx + itemsPorPaginaParticipantes, participantesCurso.length);
  const participantesPaginados = participantesCurso.slice(startIdx, endIdx);

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          PROYECTOS & CURSOS
        </h1>
        <div className="flex gap-3">
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="bg-zinc-900 border border-border-table text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-8 relative cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A1A1AA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
          >
            <option value="01">Enero</option>
            <option value="02">Febrero</option>
            <option value="03">Marzo</option>
            <option value="04">Abril</option>
            <option value="05">Mayo</option>
            <option value="06">Junio</option>
            <option value="07">Julio</option>
            <option value="08">Agosto</option>
            <option value="09">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(e.target.value)}
            className="bg-zinc-900 border border-border-table text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-8 relative cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A1A1AA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
          >
            <option value={(parseInt(currentYear) - 1).toString()}>{(parseInt(currentYear) - 1).toString()}</option>
            <option value={currentYear}>{currentYear}</option>
            <option value={(parseInt(currentYear) + 1).toString()}>{(parseInt(currentYear) + 1).toString()}</option>
            <option value="add" className="font-bold text-blue-400 bg-zinc-900">+ Añadir más</option>
          </select>
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Create Course Card */}
        <button
          onClick={() => { setCursoAEditar(null); setIsNuevoCursoOpen(true); }}
          className="bg-zinc-900/10 border-2 border-dashed border-zinc-700 p-5 rounded-custom flex flex-col items-center justify-center hover:bg-zinc-900/30 hover:border-zinc-500 transition-colors group cursor-pointer h-full min-h-[180px]">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors mb-3">
            <Plus className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
          </div>
          <span className="text-zinc-400 font-medium group-hover:text-white transition-colors">Nuevo Curso</span>
        </button>

        {cursosFiltrados.map((curso, index) => {
          const courseId = curso.id_curso || index;

          // Calcular porcentajes con protección contra división por cero
          const pctRecaudacion = curso.recaudacion_esperada > 0
            ? (curso.recaudacion_cobrada / curso.recaudacion_esperada) * 100
            : 0;
          const pctAsociados = curso.total_participantes > 0
            ? (curso.total_asociados / curso.total_participantes) * 100
            : 0;
          const estatusCurso = (curso.estatus || 'ACTIVO').toUpperCase();
          const estatusClase = estatusCurso === 'CERRADO'
            ? 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'
            : estatusCurso === 'PENDIENTE'
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

          return (
            <div
              key={courseId}
              onClick={() => setCursoSeleccionado(curso)}
              className={`bg-zinc-900/30 border p-5 rounded-custom flex flex-col transition-all cursor-pointer ${cursoSeleccionado?.id_curso === courseId ? 'border-blue-500 ring-1 ring-blue-500' : 'border-border-table hover:border-white/20'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-lg font-bold text-white leading-tight">{curso.nombre}</h3>
                <div className="flex items-center gap-2">
                  {cursoSeleccionado?.id_curso === courseId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCursoAEditar(curso); setIsNuevoCursoOpen(true); }}
                      className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${estatusClase}`}>
                    {estatusCurso}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mb-6">{curso.fecha_inicio} al {curso.fecha_fin}</p>

              <div className="space-y-4 mt-auto">
                <div>
                  <div className="flex justify-between text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    <span>Ponente</span>
                    <span className="font-mono text-zinc-300">{curso.ponente || 'No asignado'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                      style={{ width: `${pctAsociados}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    <span>RECAUDACIÓN</span>
                    <span className="font-mono text-zinc-300">${curso.recaudacion_cobrada} / ${curso.recaudacion_esperada}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                      style={{ width: `${pctRecaudacion}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <hr className="border-border-table my-8" />

      {/* Selected Course Detail Container */}
      {cursoSeleccionado ? (
        <div className="bg-zinc-900/30 border border-border-table rounded-custom overflow-hidden">

          {/* Detail Header & Pricing */}
          <div className="p-6 border-b border-border-table flex flex-col lg:flex-row justify-between gap-6 lg:items-center bg-black/20">
            <div className="flex gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{cursoSeleccionado.nombre}</h2>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>{cursoSeleccionado.fecha_inicio} al {cursoSeleccionado.fecha_fin}</span>
                  <span>•</span>
                  <span className="font-mono text-xs">Ponente: {cursoSeleccionado.ponente || 'No asignado'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-zinc-900 border border-border-table rounded px-3 py-2 text-center">
                <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5">GENERAL</div>
                <div className="text-sm font-bold text-white font-mono">${cursoSeleccionado.precio_general}</div>
              </div>
              <div className="bg-zinc-900 border border-border-table rounded px-3 py-2 text-center">
                <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5">ASOCIADO</div>
                <div className="text-sm font-bold text-white font-mono">${cursoSeleccionado.precio_asociado}</div>
              </div>
              <div className="bg-zinc-900 border border-border-table rounded px-3 py-2 text-center overflow-hidden">
                <div className="text-[9px] sm:text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5 truncate">ASOCIADO EXTERNO</div>
                <div className="text-sm font-bold text-white font-mono">${cursoSeleccionado.precio_asociado_externo}</div>
              </div>
              <div className="bg-zinc-900 border border-border-table rounded px-3 py-2 text-center overflow-hidden">
                <div className="text-[9px] sm:text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5 truncate">ESTUDIANTE NO ASOCIADO</div>
                <div className="text-sm font-bold text-white font-mono">${cursoSeleccionado.precio_estudiante}</div>
              </div>
              <div className="bg-zinc-900 border border-border-table rounded px-3 py-2 text-center overflow-hidden">
                <div className="text-[9px] sm:text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5 truncate">COLABORADORES</div>
                <div className="text-sm font-bold text-white font-mono">${cursoSeleccionado.precio_colaborador}</div>
              </div>
            </div>
          </div>

          {/* Participants Roster Section */}
          <div className="p-6 border-b border-border-table flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Lista de Participantes</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setIsImportarExcelOpen(true)}
                disabled={(cursoSeleccionado.estatus || 'ACTIVO').toUpperCase() === 'CERRADO'}
                title={(cursoSeleccionado.estatus || 'ACTIVO').toUpperCase() === 'CERRADO' ? 'El curso está cerrado' : undefined}
                className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-custom text-sm font-medium transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Importar Excel
              </button>
              <button
                onClick={() => setIsInscripcionManualOpen(true)}
                disabled={(cursoSeleccionado.estatus || 'ACTIVO').toUpperCase() === 'CERRADO'}
                title={(cursoSeleccionado.estatus || 'ACTIVO').toUpperCase() === 'CERRADO' ? 'El curso está cerrado' : undefined}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 disabled:text-zinc-300 disabled:cursor-not-allowed text-black rounded-md text-sm font-bold transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Inscripción Manual
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">NOMBRE DEL PARTICIPANTE</th>
                  <th className="px-6 py-4">RFC</th>
                  <th className="px-6 py-4">TIPO DE TARIFA</th>
                  <th className="px-6 py-4 text-center">FACTURADO</th>
                  <th className="px-6 py-4 text-right">SALDO PEND.</th>
                  <th className="px-6 py-4">ESTADO</th>
                  <th className="px-6 py-4 text-right">PAGO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-table">
                {participantesCurso.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                      No hay participantes registrados en este curso aún.
                    </td>
                  </tr>
                ) : (
                  participantesPaginados.map((p, idx) => (
                    <tr key={p.id_inscripcion || idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-white font-medium">{p.nombre_participante}</td>
                      <td className="px-6 py-4 text-zinc-400 font-mono">{p.rfc || 'S/N'}</td>
                      <td className="px-6 py-4 text-zinc-300 capitalize">{p.tipo_tarifa}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-block relative">
                          <select
                            className="bg-zinc-900/50 border border-border-table text-zinc-300 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-6 cursor-pointer"
                            value={p.facturado === 1 ? "si" : "no"}
                            onChange={(e) => actualizarFacturado(p.id_inscripcion, e.target.value === "si" ? 1 : 0)}
                          >
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none text-zinc-500">
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-white font-mono">
                        ${p.saldo_pendiente?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                          de ${p.monto_total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${p.saldo_pendiente === 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                          {p.saldo_pendiente === 0 ? 'PAGADO' : (p.estado_pago || 'PENDIENTE')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(p.saldo_pendiente > 0 || p.estado_pago !== 'PAGADO') && (
                          <button
                            onClick={() => { setSelectedPaymentName(p.nombre_participante); setSelectedPaymentAmount(p.saldo_pendiente?.toString() || p.monto_total?.toString() || "0"); setSelectedPaymentDeudaId(p.id_deuda || null); setIsPagoOpen(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-border-table hover:bg-zinc-800 text-zinc-300 rounded text-xs font-medium transition-colors ml-auto">
                            <DollarSign className="w-3.5 h-3.5" />
                            PAGO
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <Paginacion
            currentPage={paginaParticipantes}
            totalPages={totalPaginasParticipantes}
            totalItems={participantesCurso.length}
            itemsPerPage={itemsPorPaginaParticipantes}
            isLoading={false}
            onPageChange={(nuevaPagina) => setPaginaParticipantes(nuevaPagina)}
          />

        </div>
      ) : (
        <div className="text-zinc-500 text-center py-10 border border-dashed border-zinc-800 rounded-custom bg-black/20">
          Selecciona un curso para ver sus detalles y participantes.
        </div>
      )}

      <ModalNuevoCurso isOpen={isNuevoCursoOpen} onClose={() => setIsNuevoCursoOpen(false)} onSuccess={cargarCursos} cursoAEditar={cursoAEditar} />
      <ModalPago isOpen={isPagoOpen} onClose={() => setIsPagoOpen(false)} participantName={selectedPaymentName} amount={selectedPaymentAmount} deudaIds={selectedPaymentDeudaId ? [selectedPaymentDeudaId] : []} onSuccess={cargarParticipantes} />
      <ModalInscripcionManual isOpen={isInscripcionManualOpen} onClose={() => setIsInscripcionManualOpen(false)} onSuccess={cargarParticipantes} curso={cursoSeleccionado} />
      <ModalImportarExcel isOpen={isImportarExcelOpen} onClose={() => setIsImportarExcelOpen(false)} onSuccess={cargarParticipantes} curso={cursoSeleccionado} />
    </div>
  );
}
