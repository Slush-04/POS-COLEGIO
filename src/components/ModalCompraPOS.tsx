import { useEffect, useRef, useState } from "react";
import {
    Banknote,
    Check,
    CreditCard,
    Loader2,
    Receipt,
    ShoppingBag,
    Smartphone,
    X,
} from "lucide-react";
import { cn } from "../lib/utils";

interface ModalCompraPOSProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const PAYMENT_METHODS = [
    { id: "efectivo", name: "Efectivo", icon: Banknote },
    { id: "transferencia", name: "Transferencia", icon: Smartphone },
    { id: "debito", name: "T. Débito", icon: CreditCard },
    { id: "credito", name: "T. Crédito", icon: CreditCard },
    { id: "terminal", name: "Terminal", icon: Receipt },
];

export function ModalCompraPOS({ isOpen, onClose, onSuccess }: ModalCompraPOSProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setDescription("");
        setAmount("");
        setPaymentMethod("");
        setPurchaseDate(new Date().toISOString().slice(0, 10));
        setResult(null);
        setIsProcessing(false);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isProcessing) handleClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isProcessing]);

    useEffect(() => () => {
        if (closeTimeout.current) clearTimeout(closeTimeout.current);
    }, []);

    if (!isOpen) return null;

    const numericAmount = Number.parseFloat(amount) || 0;
    const isValid = description.trim().length > 0 && numericAmount > 0 && Boolean(paymentMethod);

    function handleClose() {
        if (closeTimeout.current) clearTimeout(closeTimeout.current);
        if (!isProcessing) onClose();
    }

    const handleSubmit = async () => {
        if (!isValid) {
            setResult({ type: "error", message: "Completa la descripción, el monto y el método de pago." });
            return;
        }

        setIsProcessing(true);
        setResult(null);
        try {
            const response = await fetch("http://localhost:8000/api/compras", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    descripcion: description.trim(),
                    monto: numericAmount,
                    metodo_pago: paymentMethod,
                    fecha_compra: purchaseDate,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.detail || "No se pudo registrar la compra.");
            }

            setResult({
                type: "success",
                message: `Compra registrada correctamente con folio ${data.folio}.`,
            });
            closeTimeout.current = setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1200);
        } catch (error) {
            setResult({
                type: "error",
                message: error instanceof Error ? error.message : "No se pudo registrar la compra.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-compra-title"
        >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-red-500/20 blur-3xl" />
                <div className="absolute left-1/3 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/25 bg-zinc-950/70 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-[16px]">
                <div className="flex items-center justify-between border-b border-white/15 bg-white/[0.04] px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-red-400/25 bg-red-500/15 p-2.5 text-red-300 shadow-lg shadow-red-950/30">
                            <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 id="modal-compra-title" className="text-xl font-bold text-white">Registrar compra</h2>
                            <p className="mt-0.5 text-sm text-zinc-400">Captura un egreso para incluirlo en el historial.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isProcessing}
                        aria-label="Cerrar panel de compras"
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    {result && (
                        <div className={cn(
                            "rounded-xl border px-4 py-3 text-sm font-medium",
                            result.type === "success"
                                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                                : "border-red-400/25 bg-red-500/10 text-red-300",
                        )}>
                            {result.message}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
                        <label className="space-y-2">
                            <span className="text-sm font-medium text-zinc-200">Descripción de compra</span>
                            <input
                                autoFocus
                                type="text"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                disabled={isProcessing}
                                maxLength={300}
                                placeholder="Ej. Papelería y material de oficina"
                                className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400/70 focus:ring-2 focus:ring-red-500/15"
                            />
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-medium text-zinc-200">Fecha</span>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(event) => setPurchaseDate(event.target.value)}
                                disabled={isProcessing}
                                className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-3 text-white outline-none transition focus:border-red-400/70 focus:ring-2 focus:ring-red-500/15"
                            />
                        </label>
                    </div>

                    <label className="block space-y-2">
                        <span className="text-sm font-medium text-zinc-200">Monto de la compra</span>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-zinc-500">$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={(event) => {
                                    const value = event.target.value.replace(/[^0-9.]/g, "");
                                    const [integer = "", ...decimals] = value.split(".");
                                    setAmount(decimals.length ? `${integer}.${decimals.join("")}` : integer);
                                }}
                                disabled={isProcessing}
                                placeholder="0.00"
                                className="w-full rounded-xl border border-white/15 bg-black/35 py-4 pl-9 pr-4 font-mono text-3xl font-black text-white outline-none transition placeholder:text-zinc-700 focus:border-red-400/70 focus:ring-2 focus:ring-red-500/15"
                            />
                        </div>
                    </label>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-zinc-200">Método de pago</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            {PAYMENT_METHODS.map((method) => {
                                const Icon = method.icon;
                                const selected = paymentMethod === method.id;
                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => setPaymentMethod(method.id)}
                                        disabled={isProcessing}
                                        className={cn(
                                            "relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-red-500/30",
                                            selected
                                                ? "border-red-400/70 bg-red-500/15 text-red-300 shadow-lg shadow-red-950/20"
                                                : "border-white/10 bg-black/25 text-zinc-400 hover:border-white/25 hover:bg-white/[0.06]",
                                        )}
                                    >
                                        {selected && (
                                            <span className="absolute right-2 top-2 rounded-full bg-red-500 p-0.5 text-white">
                                                <Check className="h-3 w-3" />
                                            </span>
                                        )}
                                        <Icon className="h-6 w-6" />
                                        <span className="text-xs font-medium">{method.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-white/15 bg-black/20 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isProcessing || !isValid}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-600/30 disabled:text-red-100/40"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                        {isProcessing ? "Registrando..." : "Registrar compra"}
                    </button>
                </div>
            </div>
        </div>
    );
}
