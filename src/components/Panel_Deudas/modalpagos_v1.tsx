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
    const [editableTotal, setEditableTotal] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState('0');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);
    const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originalTotal = Number.parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const baseTotal = Number.parseFloat(editableTotal) || 0;
    const discountRate = Math.min(100, Math.max(0, Number.parseFloat(discountPercentage) || 0));
    const discountAmount = Math.round(baseTotal * (discountRate / 100) * 100) / 100;
    const totalToPay = Math.round((baseTotal - discountAmount) * 100) / 100;
    const deudaIdsKey = deudaIds.join(',');

    useEffect(() => {
        if (!isOpen) return;
        setSelectedMethods([]);
        setAmounts({});
        setObservation('');
        setPaymentDate(new Date().toISOString().slice(0, 10));
        setEditableTotal(originalTotal.toFixed(2));
        setDiscountPercentage('0');
        setResultado(null);
    }, [isOpen, amount, deudaIdsKey, originalTotal]);

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
    const isComplete = (totalToPay === 0 && discountAmount > 0)
        || (totalToPay > 0 && selectedMethods.length > 0 && totalReceived > 0);

    if (!isOpen) return null;

    const handleProcesarPago = async () => {
        if (!isComplete) {
            setResultado({ tipo: 'error', mensaje: 'Completa el monto con un método de pago o aplica una condonación total.' });
            return;
        }
        const actualAmount = Math.round(Math.min(totalReceived, totalToPay) * 100) / 100;
        const totalApplied = Math.round(appliedPayments.reduce((total, pago) => total + pago.monto, 0) * 100) / 100;
        if (Math.abs(totalApplied - actualAmount) > 0.05) {
            setResultado({ tipo: 'error', mensaje: 'Los montos registrados no coinciden con el total recibido.' });
            return;
        }
        if (actualAmount > 0 && selectedMethods.length === 0) {
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
                    monto_total: actualAmount,
                    metodo_pago: appliedPayments[0].metodo_pago,
                    pagos: appliedPayments,
                    fecha_pago: paymentDate,
                    observacion: observation,
                    monto_perdonado: discountAmount,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setResultado({
                    tipo: 'exito',
                    mensaje: `${data.mensaje} ${(data.pagos_aplicados.length + data.condonaciones_aplicadas.length)} concepto(s) procesado(s).`,
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
        setSelectedMethods((methods) => [...methods, methodId]);
        // Inicializar el nuevo método con un string vacío (input limpio).
        setAmounts((current) => ({
            ...current,
            [methodId]: "",
        }));
    };

    const handleAmountChange = (methodId: string, value: string) => {
        setAmounts((current) => ({ ...current, [methodId]: value }));
    };

    const handleEditableTotalChange = (value: string) => {
        const sanitized = value.replace(/[^0-9.]/g, '');
        const [integer = '', ...decimals] = sanitized.split('.');
        setEditableTotal(decimals.length ? `${integer}.${decimals.join('')}` : integer);
    };

    const handleDiscountPercentageChange = (value: string) => {
        const sanitized = value.replace(/[^0-9.]/g, '');
        const [integer = '', ...decimals] = sanitized.split('.');
        const normalized = decimals.length ? `${integer}.${decimals.join('')}` : integer;
        const numericValue = Number.parseFloat(normalized);
        setDiscountPercentage(Number.isFinite(numericValue) && numericValue > 100 ? '100' : normalized);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-pago-title">
            <div className="bg-white/[0.045] backdrop-blur-xl border border-white/12 rounded-xl shadow-[0_16px_45px_rgba(0,0,0,0.22)] w-full max-w-4xl my-auto">
                <div className="flex items-center justify-between py-4 px-6 border-b border-white/10">
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

                <div className="p-6 space-y-5">
                    {resultado && (
                        <div className={`p-3 rounded-lg text-sm font-medium border ${resultado.tipo === 'exito' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {resultado.mensaje}
                        </div>
                    )}

                    <div className="bg-black/30 border border-white/5 rounded-xl py-4 px-6 text-center space-y-3">
                        <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Total a cobrar</p>
                        <p className="text-5xl font-black text-white font-mono tracking-tight">${totalToPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-xs font-medium text-emerald-400/80 uppercase tracking-widest pt-2">{numeroALetras(totalToPay)}</p>
                        <div className="pt-3">
                            {selectedMethods.length === 0 ? (
                                <p className="text-sm text-zinc-500">Selecciona un método de pago para capturar el importe.</p>
                            ) : (
                                <div className="flex flex-wrap justify-center gap-3">
                                    {selectedMethods.map((methodId) => {
                                        const method = PAYMENT_METHODS.find((item) => item.id === methodId);
                                        const Icon = method?.icon;
                                        return (
                                            <div key={methodId} className="flex min-w-[190px] flex-1 items-center gap-3 rounded-lg border border-blue-500/30 bg-black/40 px-3 py-2 text-left">
                                                {Icon && <Icon className="h-5 w-5 shrink-0 text-blue-400" />}
                                                <div className="relative min-w-0 flex-1">
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={amounts[methodId] || ""}
                                                        onChange={(event) => handleAmountChange(methodId, event.target.value.replace(/[^0-9.]/g, ''))}
                                                        disabled={isProcessing}
                                                        className="w-full border-0 bg-transparent py-1 pl-5 pr-1 font-mono font-bold text-white outline-none placeholder:text-zinc-600"
                                                        placeholder="0.00"
                                                        aria-label={`Monto pagado con ${method?.name || methodId}`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-end justify-between">
                            <label className="text-sm font-medium text-zinc-300">Métodos de pago</label>
                            <span className="text-xs text-zinc-500">{selectedMethods.length}/3 seleccionados</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            {PAYMENT_METHODS.map((method) => {
                                const selected = selectedMethods.includes(method.id);
                                const Icon = method.icon;
                                return (
                                    <button
                                        key={method.id}
                                        onClick={() => handleToggleMethod(method.id)}
                                        disabled={isProcessing || (!selected && selectedMethods.length >= 3)}
                                        className={cn(
                                            "flex flex-col items-center justify-center rounded-xl border p-3 transition-all duration-200",
                                            selected ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-black/30 border-white/5 hover:border-white/20",
                                            !selected && selectedMethods.length >= 3 && "cursor-not-allowed opacity-40 hover:border-white/5",
                                        )}
                                    >
                                        <div className="relative mb-2">
                                            <Icon className={cn("h-6 w-6", selected ? "text-blue-400" : "text-zinc-400")} />
                                            {selected && <div className="absolute -right-2 -top-1 rounded-full bg-blue-500 p-0.5 text-white"><Check className="h-3 w-3" /></div>}
                                        </div>
                                        <span className={cn("text-xs font-medium", selected ? "text-blue-400" : "text-zinc-400")}>{method.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1.5 md:order-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400">Total recibido:</span>
                                <span className="font-mono font-bold text-white">${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
                                <span className="text-zinc-400">Saldo perdonado ({discountRate}%):</span>
                                <span className="font-mono font-bold text-amber-400">-${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
                                <span className={cn("font-medium", change >= 0 ? "text-emerald-400" : "text-red-400")}>{change >= 0 ? 'Cambio a devolver:' : 'Restante:'}</span>
                                <span className={cn("font-mono font-bold", change >= 0 ? "text-emerald-400" : "text-red-400")}>${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 md:order-1">
                            <label className="block space-y-1.5">
                                <span className="text-xs font-medium text-zinc-400">Monto base</span>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                    <input type="text" inputMode="decimal" value={editableTotal} onChange={(event) => handleEditableTotalChange(event.target.value)} disabled={isProcessing} className="w-full rounded-lg border border-white/10 bg-black/50 py-2 pl-7 pr-3 font-mono font-bold text-white focus:border-blue-500 focus:outline-none" placeholder="0.00" />
                                </div>
                            </label>
                            <label className="block space-y-1.5">
                                <span className="text-xs font-medium text-zinc-400">Condonación de saldo (%)</span>
                                <div className="relative">
                                    <input type="text" inputMode="decimal" value={discountPercentage} onChange={(event) => handleDiscountPercentageChange(event.target.value)} disabled={isProcessing} className="w-full rounded-lg border border-white/10 bg-black/50 py-2 pl-3 pr-8 font-mono font-bold text-white focus:border-blue-500 focus:outline-none" placeholder="0" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-400">Observación</label>
                        <input type="text" value={observation} onChange={(event) => setObservation(event.target.value)} disabled={isProcessing} className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="Opcional..." />
                    </div>
                </div>

                <div className="py-4 px-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                    <button onClick={handleCerrar} disabled={isProcessing} className="px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        onClick={handleProcesarPago}
                        disabled={isProcessing}
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
