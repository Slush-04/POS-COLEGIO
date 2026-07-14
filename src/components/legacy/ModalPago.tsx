import { X, DollarSign, CreditCard, Smartphone, Banknote, Receipt, Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface ModalPagoProps {
  isOpen: boolean;
  onClose: () => void;
  participantName?: string;
  amount?: string;
  deudaIds?: number[];
  inscripcionIds?: number[];
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { id: 'efectivo', name: 'Efectivo', icon: Banknote },
  { id: 'transferencia', name: 'Transferencia', icon: Smartphone },
  { id: 'debito', name: 'T. Débito', icon: CreditCard },
  { id: 'credito', name: 'T. Crédito', icon: CreditCard },
  { id: 'terminal', name: 'Terminal', icon: Receipt },
];

function numeroALetras(num: number): string {
  if (num === 0) return "CERO PESOS 00/100 M.N.";
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const decena = (n: number) => n < 10 ? unidades[n] : n < 20 ? decenas[n - 10] : n === 20 ? "VEINTE" : n < 30 ? `VEINTI${unidades[n - 20]}` : `${decenas[Math.floor(n / 10) + 8]}${n % 10 ? ` Y ${unidades[n % 10]}` : ""}`;
  const centena = (n: number) => n === 100 ? "CIEN" : `${centenas[Math.floor(n / 100)]}${n % 100 ? ` ${decena(n % 100)}` : ""}`.trim();
  const entero = Math.floor(num);
  const letras = entero >= 1000 ? `${entero === 1000 ? "MIL" : `${centena(Math.floor(entero / 1000))} MIL`} ${entero % 1000 ? centena(entero % 1000) : ""}`.trim() : entero >= 100 ? centena(entero) : decena(entero);
  return `${letras} PESOS ${Math.round((num - entero) * 100).toString().padStart(2, '0')}/100 M.N.`;
}

export function ModalPago({ isOpen, onClose, participantName, amount = "0", deudaIds = [], onSuccess }: ModalPagoProps) {
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [observation, setObservation] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalToPay = Number.parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const deudaIdsKey = deudaIds.join(',');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMethods([]);
    setAmounts({});
    setObservation('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setResultado(null);
  }, [isOpen, amount, deudaIdsKey]);

  useEffect(() => () => {
    if (successTimeout.current) clearTimeout(successTimeout.current);
  }, []);

  const totalReceived = useMemo(
    () => (Object.values(amounts) as string[]).reduce<number>((total, value) => total + (Number.parseFloat(value) || 0), 0),
    [amounts],
  );
  const change = totalReceived - totalToPay;
  const appliedPayments = useMemo(() => {
    let remaining = totalToPay;
    return selectedMethods.flatMap((method) => {
      const applied = Math.min(Number.parseFloat(amounts[method]) || 0, Math.max(remaining, 0));
      remaining = Math.round((remaining - applied) * 100) / 100;
      return applied > 0 ? [{ metodo_pago: method, monto: Math.round(applied * 100) / 100 }] : [];
    });
  }, [amounts, selectedMethods, totalToPay]);
  const isComplete = totalToPay > 0 && selectedMethods.length > 0 && totalReceived >= totalToPay;

  if (!isOpen) return null;

  const handleProcesarPago = async () => {
    if (!isComplete || appliedPayments.length === 0) {
      setResultado({ tipo: 'error', mensaje: 'Completa el monto con al menos un método de pago.' });
      return;
    }
    if (appliedPayments.reduce((total, pago) => total + pago.monto, 0) !== totalToPay) {
      setResultado({ tipo: 'error', mensaje: 'Los montos registrados no coinciden con el total a cobrar.' });
      return;
    }
    if (selectedMethods.length === 0) {
      setResultado({ tipo: 'error', mensaje: 'Selecciona un método de pago.' });
      return;
    }

    if (deudaIds.length === 0) {
      setResultado({ tipo: 'error', mensaje: 'No hay deudas seleccionadas para pagar.' });
      return;
    }

    setIsProcessing(true);
    setResultado(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/pagos/deudas/abonos-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deuda_ids: deudaIds,
          monto_total: totalToPay,
          metodo_pago: appliedPayments[0].metodo_pago,
          pagos: appliedPayments,
          fecha_pago: paymentDate,
          observacion: observation,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResultado({
          tipo: 'exito',
          mensaje: `${data.mensaje} ${data.pagos_aplicados.length} concepto(s) procesado(s).`,
        });
        successTimeout.current = setTimeout(() => {
          onSuccess?.();
          handleCerrar();
        }, 1500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setResultado({ tipo: 'error', mensaje: errorData.detail || 'No se pudo procesar el pago.' });
      }
    } catch {
      setResultado({ tipo: 'error', mensaje: 'Error inesperado al procesar el pago.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCerrar = () => {
    if (successTimeout.current) clearTimeout(successTimeout.current);
    setSelectedMethods([]);
    setAmounts({});
    setObservation('');
    setResultado(null);
    setIsProcessing(false);
    onClose();
  };

  const handleToggleMethod = (methodId: string) => {
    if (selectedMethods.includes(methodId)) {
      setSelectedMethods((methods) => methods.filter((id) => id !== methodId));
      setAmounts((current) => {
        const next = { ...current };
        delete next[methodId];
        return next;
      });
      return;
    }
    if (selectedMethods.length >= 3) return;
    const remaining = Math.max(0, totalToPay - totalReceived);
    setSelectedMethods((methods) => [...methods, methodId]);
    setAmounts((current) => ({ ...current, [methodId]: remaining.toFixed(2) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-pago-title">
      <div className="bg-zinc-900 border border-border-table rounded-xl shadow-2xl w-full max-w-2xl my-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 id="modal-pago-title" className="text-xl font-bold text-white">Registrar Pago</h2>
            {participantName && <p className="text-sm text-zinc-400 mt-1">{participantName}</p>}
          </div>
          <div className="flex items-center gap-4">
            <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} disabled={isProcessing} className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm" />
            <button onClick={handleCerrar} disabled={isProcessing} aria-label="Cerrar" className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-50">
            <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {resultado && (
            <div className={`p-3 rounded-lg text-sm font-medium border ${resultado.tipo === 'exito' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {resultado.mensaje}
            </div>
          )}

          <div className="bg-black/30 border border-white/5 rounded-xl p-6 text-center space-y-2">
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Total a cobrar</p>
            <p className="text-5xl font-black text-white font-mono tracking-tight">${totalToPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs font-medium text-emerald-400/80 uppercase tracking-widest pt-2">{numeroALetras(totalToPay)}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end"><label className="text-sm font-medium text-zinc-300">Métodos de pago</label><span className="text-xs text-zinc-500">{selectedMethods.length}/3 seleccionados</span></div>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const selected = selectedMethods.includes(method.id);
                  const Icon = method.icon;
                  return <button key={method.id} onClick={() => handleToggleMethod(method.id)} disabled={isProcessing || (!selected && selectedMethods.length >= 3)} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200", selected ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-black/30 border-white/5 hover:border-white/20", (!selected && selectedMethods.length >= 3) && "opacity-40 cursor-not-allowed hover:border-white/5")}><div className="relative mb-2"><Icon className={cn("w-6 h-6", selected ? "text-blue-400" : "text-zinc-400")} />{selected && <div className="absolute -top-1 -right-2 bg-blue-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}</div><span className={cn("text-xs font-medium", selected ? "text-blue-400" : "text-zinc-400")}>{method.name}</span></button>;
                })}
              </div>
            </div>
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-3 min-h-[160px]">
                {selectedMethods.length === 0 ? <div className="h-full flex items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.02]"><p className="text-sm text-zinc-500">Selecciona al menos un método de pago.</p></div> : selectedMethods.map((methodId) => {
                  const method = PAYMENT_METHODS.find((item) => item.id === methodId);
                  const Icon = method?.icon;
                  return <div key={methodId} className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0">{Icon && <Icon className="w-5 h-5 text-blue-400" />}</div><div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span><input type="number" min="0" step="0.01" value={amounts[methodId] || ''} onChange={(event) => setAmounts((current) => ({ ...current, [methodId]: event.target.value }))} disabled={isProcessing} className="w-full pl-8 pr-3 py-2.5 bg-black/50 border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono font-bold" placeholder="0.00" /></div></div>;
                })}
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2"><div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Total recibido:</span><span className="font-mono font-bold text-white">${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div className="flex justify-between items-center text-sm pt-2 border-t border-white/5"><span className={cn("font-medium", change >= 0 ? "text-emerald-400" : "text-red-400")}>{change >= 0 ? 'Cambio a devolver:' : 'Restante:'}</span><span className={cn("font-mono font-bold", change >= 0 ? "text-emerald-400" : "text-red-400")}>${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div></div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-zinc-400">Observación</label>
            <input type="text" value={observation} onChange={(event) => setObservation(event.target.value)} disabled={isProcessing} className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="Opcional..." />
          </div>

        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
          <button onClick={handleCerrar} disabled={isProcessing} className="px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button 
            onClick={handleProcesarPago}
            disabled={isProcessing || !isComplete}
            className="px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 disabled:text-emerald-100/50 disabled:cursor-not-allowed text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                Registrar Pago
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
