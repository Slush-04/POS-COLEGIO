import { useState, useEffect, type FormEvent } from "react";
import { X, Search, Check, AlertCircle } from "lucide-react";

interface ModalInscripcionManualProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  curso: any; // El curso seleccionado
}

export function ModalInscripcionManual({ isOpen, onClose, onSuccess, curso }: ModalInscripcionManualProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientesResultados, setClientesResultados] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);

  // Form states
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoTarifa, setTipoTarifa] = useState("general");
  const [estadoPago, setEstadoPago] = useState("PENDIENTE");
  const [montoTotal, setMontoTotal] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    // Buscar clientes en vivo
    const searchTimer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        fetch(`http://127.0.0.1:8000/api/clientes/buscar?q=${searchTerm}`)
          .then(res => res.json())
          .then(data => {
            setClientesResultados(data);
            setIsSearching(false);
          })
          .catch(err => {
            console.error(err);
            setIsSearching(false);
          });
      } else {
        setClientesResultados([]);
      }
    }, 400); // debounce 400ms

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  // Actualizar monto total cuando cambie la tarifa
  useEffect(() => {
    if (curso) {
      switch (tipoTarifa) {
        case "general": setMontoTotal(curso.precio_general || 0); break;
        case "asociado": setMontoTotal(curso.precio_asociado || 0); break;
        case "asociado_externo": setMontoTotal(curso.precio_asociado_externo || 0); break;
        case "estudiante": setMontoTotal(curso.precio_estudiante || 0); break;
        case "colaborador": setMontoTotal(curso.precio_colaborador || 0); break;
        default: setMontoTotal(curso.precio_general || 0); break;
      }
    }
  }, [tipoTarifa, curso]);

  const resetForm = () => {
    setSearchTerm("");
    setClientesResultados([]);
    setClienteSeleccionado(null);
    setNombre("");
    setRfc("");
    setTelefono("");
    setTipoTarifa("general");
    setEstadoPago("PENDIENTE");
    if (curso) setMontoTotal(curso.precio_general || 0);
  };

  const seleccionarCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setNombre(cliente.nombre);
    setRfc(cliente.rfc || "");
    setTelefono(cliente.telefono || "");
    setSearchTerm("");
    setClientesResultados([]);

    // Inferir la tarifa basándonos en el tipo_cliente del backend (ej: "Asociado", "Estudiante", etc.)
    const tipo = cliente.tipo_cliente?.toLowerCase() || "";
    if (tipo.includes("asociado externo")) {
      setTipoTarifa("asociado_externo");
    } else if (tipo.includes("asociado")) {
      setTipoTarifa("asociado");
    } else if (tipo.includes("estudiante")) {
      setTipoTarifa("estudiante");
    } else if (tipo.includes("colaborador")) {
      setTipoTarifa("colaborador");
    } else {
      setTipoTarifa("general");
    }
  };

  const handleInscripcion = async (e: FormEvent) => {
    e.preventDefault();
    if (!curso) return;

    const payload = {
      id_cliente: clienteSeleccionado ? clienteSeleccionado.id_cliente : null,
      nombre,
      rfc,
      telefono,
      tipo_tarifa: tipoTarifa,
      monto_total: montoTotal,
      saldo_pendiente: estadoPago === "PENDIENTE" ? montoTotal : 0,
      estado_pago: estadoPago,
      facturado: 0
    };

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cursos/${curso.id_curso}/inscripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        alert("Error al inscribir: " + err.detail);
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/[0.045] backdrop-blur-xl border border-white/12 rounded-xl shadow-[0_16px_45px_rgba(0,0,0,0.22)] w-full max-w-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-border-table bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Inscripción Manual</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Curso: <span className="text-primary font-medium">{curso?.nombre}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleInscripcion}>
          <div className="p-6 space-y-6">
            
            {/* Buscador de Clientes */}
            <div className="relative">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Buscar Cliente Existente</label>
              <div className="relative">
                <Search className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, RFC o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-border-table rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
              
              {/* Resultados */}
              {clientesResultados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-border-table rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {clientesResultados.map((cli) => (
                    <button 
                      key={cli.id_cliente}
                      type="button"
                      onClick={() => seleccionarCliente(cli)}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-700 border-b border-border-table/50 last:border-0 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{cli.nombre}</p>
                        <p className="text-xs text-zinc-400">RFC: {cli.rfc || 'N/A'} | {cli.telefono}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-1 bg-zinc-900 rounded text-primary">
                        {cli.tipo_cliente}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {clienteSeleccionado && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-3">
                <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-400 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-400">Cliente Autocompletado</p>
                  <p className="text-xs text-emerald-500/70">Los datos se han vinculado con el cliente #{clienteSeleccionado.id_cliente}</p>
                </div>
                <button type="button" onClick={resetForm} className="ml-auto text-xs font-medium text-zinc-400 hover:text-white underline">
                  Limpiar
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Nombre del Participante *</label>
                <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-zinc-900 border border-border-table rounded py-2 px-3 text-sm text-white focus:border-primary" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">RFC</label>
                <input type="text" value={rfc} onChange={e => setRfc(e.target.value)} className="w-full bg-zinc-900 border border-border-table rounded py-2 px-3 text-sm text-white focus:border-primary uppercase" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Teléfono</label>
                <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full bg-zinc-900 border border-border-table rounded py-2 px-3 text-sm text-white focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-table">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Tipo de Tarifa</label>
                <select value={tipoTarifa} onChange={e => setTipoTarifa(e.target.value)} className="w-full bg-zinc-900 border border-border-table rounded py-2 px-3 text-sm text-white focus:border-primary">
                  <option value="general">Público General</option>
                  <option value="asociado">Asociado</option>
                  <option value="asociado_externo">Asociado Externo</option>
                  <option value="estudiante">Estudiante</option>
                  <option value="colaborador">Colaborador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Monto Total</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input type="number" readOnly value={montoTotal} className="w-full bg-black/40 border border-border-table rounded py-2 pl-7 pr-3 text-sm text-zinc-300 font-mono font-bold" />
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-lg border border-border-table">
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Estado de Pago</label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="pago" value="PENDIENTE" checked={estadoPago === "PENDIENTE"} onChange={() => setEstadoPago("PENDIENTE")} className="peer sr-only" />
                  <div className="p-3 text-center rounded border border-border-table text-zinc-400 font-medium text-sm peer-checked:bg-amber-500/10 peer-checked:border-amber-500/50 peer-checked:text-amber-500 transition-colors">
                    Pendiente
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="pago" value="PAGADO" checked={estadoPago === "PAGADO"} onChange={() => setEstadoPago("PAGADO")} className="peer sr-only" />
                  <div className="p-3 text-center rounded border border-border-table text-zinc-400 font-medium text-sm peer-checked:bg-emerald-500/10 peer-checked:border-emerald-500/50 peer-checked:text-emerald-400 transition-colors">
                    Pago Total
                  </div>
                </label>
              </div>
              {estadoPago === "PENDIENTE" && (
                <div className="mt-3 flex items-start gap-2 text-amber-500/80 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>Este participante será enviado al módulo de <strong>Cuentas por Cobrar (Deudas)</strong> y aparecerá allí automáticamente.</p>
                </div>
              )}
            </div>

          </div>

          <div className="p-6 border-t border-border-table flex justify-end gap-3 bg-zinc-900/50">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2">
              Inscribir Participante
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
