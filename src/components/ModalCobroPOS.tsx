import { X, DollarSign, CreditCard, Smartphone, Banknote, Receipt, Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";

interface ModalCobroPOSProps {
    isOpen: boolean;
    onClose: () => void;
    clientName?: string;
    client?: any;
    amount: number;
    cartItems: any[];
    onSuccess: () => void;
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

export function ModalCobroPOS({ isOpen, onClose, clientName, client, amount = 0, cartItems = [], onSuccess }: ModalCobroPOSProps) {
    const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [observation, setObservation] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [discountPercentage, setDiscountPercentage] = useState('0');
    const [aplicaIva, setAplicaIva] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);
    const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const baseTotal = Number(amount) || 0;
    const discountRate = Math.min(100, Math.max(0, Number.parseFloat(discountPercentage) || 0));
    const discountAmount = Math.round(baseTotal * (discountRate / 100) * 100) / 100;
    const baseGravable = Math.round((baseTotal - discountAmount) * 100) / 100;
    const ivaAmount = aplicaIva ? Math.round(baseGravable * 0.16 * 100) / 100 : 0;
    const totalToPay = Math.round((baseGravable + ivaAmount) * 100) / 100;

    useEffect(() => {
        if (!isOpen) return;
        setSelectedMethods([]);
        setAmounts({});
        setObservation('');
        setPaymentDate(new Date().toISOString().slice(0, 10));
        setDiscountPercentage('0');
        setAplicaIva(false);
        setResultado(null);
    }, [isOpen, amount]);

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

    const handleProcesarOperacion = async (tipoOperacion: 'pago' | 'cuenta') => {
        if (cartItems.length === 0) {
            setResultado({ tipo: 'error', mensaje: 'El carrito está vacío.' });
            return;
        }
        if (totalToPay <= 0) {
            setResultado({ tipo: 'error', mensaje: 'El total a pagar debe ser mayor a cero.' });
            return;
        }

        if (tipoOperacion === 'cuenta') {
            if (!client) {
                setResultado({ tipo: 'error', mensaje: 'Selecciona un cliente antes de cargar la venta a cuenta.' });
                return;
            }
            if (cartItems.some(item => item.type === 'cuota')) {
                setResultado({
                    tipo: 'error',
                    mensaje: 'Las cuotas pendientes deben cobrarse directamente, no cargarse nuevamente a cuenta.'
                });
                return;
            }
        } else {
            // Validaciones para pago
            if (!isComplete || appliedPayments.length === 0) {
                setResultado({ tipo: 'error', mensaje: 'Completa el monto con al menos un método de pago.' });
                return;
            }
            if (Math.abs(appliedPayments.reduce((total, pago) => total + pago.monto, 0) - totalToPay) > 0.05) {
                setResultado({ tipo: 'error', mensaje: 'Los montos registrados no coinciden con el total a cobrar.' });
                return;
            }
        }

        setIsProcessing(true);
        setResultado(null);

        try {
            const payload = {
                id_cliente: client ? client.id_cliente : null,
                tipo_pago: tipoOperacion,
                metodo_pago: tipoOperacion === 'pago' ? appliedPayments[0].metodo_pago : 'cuenta',
                monto_total: totalToPay,
                items: cartItems.map(item => ({
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                })),
                fecha_pago: paymentDate,
                observacion: observation,
                descuento_porcentaje: discountRate,
                descuento_monto: discountAmount,
                subtotal: baseTotal,
                aplica_iva: aplicaIva,
                iva_porcentaje: aplicaIva ? 16.0 : 0.0,
                iva_monto: ivaAmount,
                monto_base: baseTotal,
                pagos: tipoOperacion === 'pago' ? appliedPayments : []
            };

            const res = await fetch("http://localhost:8000/api/pos/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setResultado({
                    tipo: 'exito',
                    mensaje: tipoOperacion === 'pago'
                        ? 'Venta cobrada y registrada correctamente.'
                        : 'Venta cargada a cuenta correctamente.',
                });
                successTimeout.current = setTimeout(() => {
                    onSuccess();
                    handleCerrar();
                }, 1500);
            } else {
                const errorData = await res.json().catch(() => ({}));
                setResultado({ tipo: 'error', mensaje: errorData.detail || 'No se pudo registrar la venta.' });
            }
        } catch {
            setResultado({ tipo: 'error', mensaje: 'Error inesperado al registrar el cobro.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCerrar = () => {
        if (successTimeout.current) clearTimeout(successTimeout.current);
        setSelectedMethods([]);
        setAmounts({});
        setObservation('');
        setAplicaIva(false);
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
        setAmounts((current) => ({
            ...current,
            [methodId]: "",
        }));
    };

    const handleAmountChange = (methodId: string, value: string) => {
        setAmounts((current) => ({ ...current, [methodId]: value }));
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
            <div className="bg-zinc-900 border border-border-table rounded-xl shadow-2xl w-full max-w-4xl my-auto">
                <div className="flex items-center justify-between py-4 px-6 border-b border-white/10">
                    <div>
                        <h2 id="modal-pago-title" className="text-xl font-bold text-white">Registrar Venta (Cobrar POS)</h2>
                        {clientName && <p className="text-sm text-zinc-400 mt-1">Cliente: {clientName}</p>}
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
                        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2 md:order-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400">Subtotal:</span>
                                <span className="font-mono font-semibold text-zinc-300">${baseTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
                                <span className="text-zinc-400">Descuento ({discountRate}%):</span>
                                <span className="font-mono font-bold text-amber-400">-${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
                                <span className="text-zinc-400">IVA (16%):</span>
                                <span className="font-mono font-bold text-blue-400">+{ivaAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-base font-bold">
                                <span className="text-white">Total:</span>
                                <span className="font-mono text-white">${totalToPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
                                <span className="text-zinc-400">Total recibido:</span>
                                <span className="font-mono font-semibold text-zinc-300">${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
                                <span className={cn("font-medium", change >= 0 ? "text-emerald-400" : "text-red-400")}>{change >= 0 ? 'Cambio a devolver:' : 'Restante:'}</span>
                                <span className={cn("font-mono font-bold", change >= 0 ? "text-emerald-400" : "text-red-400")}>${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3 md:order-1 flex flex-col gap-2">
                            <label className="block space-y-1.5">
                                <span className="text-xs font-medium text-zinc-400">Descuento (%)</span>
                                <div className="relative">
                                    <input type="text" inputMode="decimal" value={discountPercentage} onChange={(event) => handleDiscountPercentageChange(event.target.value)} disabled={isProcessing} className="w-full rounded-lg border border-white/10 bg-black/50 py-2 pl-3 pr-8 font-mono font-bold text-white focus:border-blue-500 focus:outline-none" placeholder="0" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                                </div>
                            </label>
                            <div className="border-t border-white/5 pt-2.5 mt-1">
                                <label className="flex items-center justify-between cursor-pointer py-1 select-none">
                                    <span className="text-xs font-medium text-zinc-400">Aplicar IVA (16%)</span>
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={aplicaIva}
                                            onChange={(event) => setAplicaIva(event.target.checked)}
                                            disabled={isProcessing}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white peer-disabled:opacity-50"></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-400">Observación</label>
                        <input type="text" value={observation} onChange={(event) => setObservation(event.target.value)} disabled={isProcessing} className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="Opcional..." />
                    </div>
                </div>

                <div className="py-4 px-6 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 bg-black/20">
                    <button onClick={handleCerrar} disabled={isProcessing} className="px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        onClick={() => handleProcesarOperacion('cuenta')}
                        disabled={isProcessing || cartItems.length === 0 || !client || totalToPay <= 0}
                        className="px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/30 disabled:text-amber-100/50 disabled:cursor-not-allowed text-white"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4" />
                                Cargar a Cuenta
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => handleProcesarOperacion('pago')}
                        disabled={isProcessing || cartItems.length === 0 || selectedMethods.length === 0 || !isComplete}
                        className="px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 disabled:text-emerald-100/50 disabled:cursor-not-allowed text-white"
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
