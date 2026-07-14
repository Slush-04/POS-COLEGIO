import { X, DollarSign, ListChecks, History, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ModalPago } from "../modalpagos_v1";

interface Deuda {
  id_deuda: number;
  tipo_deuda: string;
  nombre_curso: string;
  fecha_registro: string;
  monto_total: number;
  abonado: number;
  saldo_pendiente: number;
  estado_pago: string;
}

interface Movimiento {
  id_pago: number;
  fecha_pago: string;
  nombre_curso: string;
  tipo_deuda: string;
  metodo_pago: string;
  monto_pagado: number;
  observacion: string;
}

interface ModalDetalleDeudaProps {
  isOpen: boolean;
  onClose: () => void;
  debtorName?: string;
  totalDebt?: string;
  clienteId?: number;
  /** Limita el detalle a los tipos de deuda indicados, sin afectar el uso general del modal. */
  debtTypes?: string[];
  onPaymentSuccess?: () => void;
}

export function ModalDetalleDeuda({ isOpen, onClose, debtorName, totalDebt, clienteId, debtTypes, onPaymentSuccess }: ModalDetalleDeudaProps) {
  const [isPagoOpen, setIsPagoOpen] = useState(false);
  const [pagoAmount, setPagoAmount] = useState("");
  const [pagoDeudaIds, setPagoDeudaIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'creditos' | 'movimientos'>('creditos');
  const [selectedCredits, setSelectedCredits] = useState<number[]>([]);

  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingCreditos, setLoadingCreditos] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  // Cargar inscripciones con saldo pendiente del cliente
  const fetchInscripciones = async () => {
    if (!clienteId) return;
    setLoadingCreditos(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/pagos/deudas/${clienteId}`);
      if (res.ok) {
        const data = await res.json();
        setDeudas(data);
      }
    } catch (error) {
      console.error("Error al cargar deudas:", error);
    } finally {
      setLoadingCreditos(false);
    }
  };

  // Cargar historial de movimientos del cliente
  const fetchMovimientos = async () => {
    if (!clienteId) return;
    setLoadingMovimientos(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/pagos/movimientos/${clienteId}`);
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data);
      }
    } catch (error) {
      console.error("Error al cargar movimientos:", error);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  useEffect(() => {
    if (isOpen && clienteId) {
      fetchInscripciones();
      fetchMovimientos();
      setSelectedCredits([]);
    }
  }, [isOpen, clienteId]);

  if (!isOpen) return null;

  const toggleCreditSelection = (id: number) => {
    setSelectedCredits(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const deudasVisibles = debtTypes
    ? deudas.filter((deuda) => debtTypes.includes(deuda.tipo_deuda))
    : deudas;
  const movimientosVisibles = debtTypes
    ? movimientos.filter((movimiento) => debtTypes.includes(movimiento.tipo_deuda))
    : movimientos;
  const esDetalleDeCuotas = debtTypes?.every((tipo) => tipo.startsWith('CUOTA_'));

  // Calcular la deuda total real únicamente con los conceptos visibles.
  const deudaTotalReal = deudasVisibles.reduce((acc, d) => acc + d.saldo_pendiente, 0);

  const handleAbonarMultiple = () => {
    const montoSeleccionado = deudasVisibles
      .filter(d => selectedCredits.includes(d.id_deuda))
      .reduce((acc, d) => acc + d.saldo_pendiente, 0);
    setPagoAmount(montoSeleccionado.toFixed(2));
    setPagoDeudaIds(selectedCredits);
    setIsPagoOpen(true);
  };

  const handleLiquidacionTotal = () => {
    // Ordena las deudas de más antigua a más nueva y las liquida todas
    const deudaIds = [...deudasVisibles]
      .sort((a, b) => new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime())
      .map(d => d.id_deuda);
    setPagoAmount(deudaTotalReal.toFixed(2));
    setPagoDeudaIds(deudaIds);
    setIsPagoOpen(true);
  };

  const handlePagarConcepto = (deuda: Deuda) => {
    setPagoAmount(deuda.saldo_pendiente.toFixed(2));
    setPagoDeudaIds([deuda.id_deuda]);
    setIsPagoOpen(true);
  };

  const handlePagoExitoso = () => {
    // Refrescar los datos del modal
    fetchInscripciones();
    fetchMovimientos();
    setSelectedCredits([]);
    // Notificar al componente padre (DeudasView) para refrescar su tabla
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return "N/A";
    try {
      const d = new Date(fecha);
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fecha;
    }
  };

  const formatMonto = (monto: number) => {
    return `$${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-border-table rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">{esDetalleDeCuotas ? 'Detalle de Cuotas' : 'Detalle de Deuda'}</h2>
              {debtorName && <p className="text-sm text-zinc-400 mt-1">{debtorName}</p>}
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-800/50 p-4 rounded-lg border border-white/5 gap-4">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Deuda Total</p>
                <p className="text-2xl font-bold text-red-400 font-mono">{formatMonto(deudaTotalReal)}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleAbonarMultiple}
                  disabled={selectedCredits.length === 0}
                  className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 border border-border-table hover:bg-zinc-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abonar ({selectedCredits.length})
                </button>
                <button 
                  onClick={handleLiquidacionTotal}
                  disabled={deudasVisibles.length === 0}
                  className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white rounded-md text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Liquidación Total
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border-table">
              <button 
                onClick={() => setActiveTab('creditos')}
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'creditos' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-white'}`}
              >
                <ListChecks className="w-4 h-4" />
                {esDetalleDeCuotas ? 'Desglose de cuotas' : 'Desglose de créditos'}
              </button>
              <button 
                onClick={() => { setActiveTab('movimientos'); fetchMovimientos(); }}
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'movimientos' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-white'}`}
              >
                <History className="w-4 h-4" />
                Desglose de movimientos
              </button>
            </div>

            <div className="pt-2">
              {activeTab === 'creditos' ? (
                <div className="bg-zinc-900/50 border border-border-table rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                        <th className="px-4 py-3 text-right">Abonado</th>
                        <th className="px-4 py-3 text-right">Restante</th>
                        <th className="px-4 py-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-table">
                      {loadingCreditos ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center">
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto" />
                          </td>
                        </tr>
                      ) : deudasVisibles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                            {esDetalleDeCuotas ? 'No hay cuotas pendientes para este asociado.' : 'No hay créditos pendientes para este cliente.'}
                          </td>
                        </tr>
                      ) : (
                        deudasVisibles.map((d) => (
                          <tr key={d.id_deuda} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <input 
                                type="checkbox" 
                                checked={selectedCredits.includes(d.id_deuda)}
                                onChange={() => toggleCreditSelection(d.id_deuda)}
                                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary focus:ring-offset-zinc-900"
                              />
                            </td>
                            <td className="px-4 py-3 text-white font-medium">{d.nombre_curso}</td>
                            <td className="px-4 py-3 text-zinc-400 text-xs">{formatFecha(d.fecha_registro)}</td>
                            <td className="px-4 py-3 text-right text-zinc-300 font-mono">{formatMonto(d.monto_total)}</td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-mono">{formatMonto(d.abonado)}</td>
                            <td className="px-4 py-3 text-right text-red-400 font-mono font-bold">{formatMonto(d.saldo_pendiente)}</td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => handlePagarConcepto(d)}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap"
                              >
                                Pagar Concepto
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-border-table rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Fecha de Pago</th>
                        <th className="px-4 py-3">Referencia / Concepto</th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3 text-right">Monto Abonado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-table">
                      {loadingMovimientos ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center">
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto" />
                          </td>
                        </tr>
                      ) : movimientosVisibles.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                            No hay movimientos registrados para este cliente.
                          </td>
                        </tr>
                      ) : (
                        movimientosVisibles.map((mov) => (
                          <tr key={mov.id_pago} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-zinc-300 text-xs">{formatFecha(mov.fecha_pago)}</td>
                            <td className="px-4 py-3 text-white font-medium">Abono - {mov.nombre_curso}</td>
                            <td className="px-4 py-3 text-zinc-400 capitalize">{mov.metodo_pago}</td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-mono font-bold">{formatMonto(mov.monto_pagado)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <ModalPago 
        isOpen={isPagoOpen} 
        onClose={() => setIsPagoOpen(false)} 
        participantName={debtorName} 
        amount={pagoAmount}
        deudaIds={pagoDeudaIds}
        onSuccess={handlePagoExitoso}
      />
    </>
  );
}
