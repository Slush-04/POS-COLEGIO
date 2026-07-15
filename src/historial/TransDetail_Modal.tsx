import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Ban,
    Calendar,
    CreditCard,
    Download,
    FileText,
    GraduationCap,
    Loader2,
    Package,
    ReceiptText,
    Tag,
    User,
    X,
} from "lucide-react";
import { cn } from "../lib/utils";
import { downloadTicketPdf } from "./ticketPdf";

interface Transaction {
    id: string;
    idOperacion?: number | null;
    isLegacy?: boolean;
    date: string;
    registeredAt?: string | null;
    cancelledAt?: string | null;
    serieFolio: string;
    client: string;
    type: string;
    operationType?: string;
    concept: string;
    amount: number;
    paymentMethod: string;
    observation: string;
    status: string;
    cancellationReason?: string;
}

interface OperationDetail {
    detalles: Array<{ tipo_detalle: string; cantidad: number; descripcion?: string }>;
    pagos: Array<{ tipo_movimiento: string; monto_pagado: number; metodo_pago: string }>;
    movimientos_inventario: Array<{ tipo_movimiento: string; cantidad: number }>;
}

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAnulled: () => void | Promise<void>;
    transaction: Transaction | null;
}

export function TransactionDetailModal({ isOpen, onClose, onAnulled, transaction }: TransactionDetailModalProps) {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [operationDetail, setOperationDetail] = useState<OperationDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    useEffect(() => {
        setShowConfirmation(false);
        setReason("");
        setError("");
        setOperationDetail(null);
        if (!isOpen || !transaction?.idOperacion) return;

        let active = true;
        setIsLoadingDetail(true);
        fetch(`http://localhost:8000/api/operaciones/${transaction.idOperacion}`)
            .then(async (response) => {
                if (!response.ok) throw new Error("No se pudo cargar el detalle de la operación.");
                return response.json();
            })
            .then((data) => { if (active) setOperationDetail(data); })
            .catch((requestError) => { if (active) setError(requestError.message); })
            .finally(() => { if (active) setIsLoadingDetail(false); });
        return () => { active = false; };
    }, [isOpen, transaction?.idOperacion]);

    const effects = useMemo(() => {
        const details = operationDetail?.detalles || [];
        const payments = (operationDetail?.pagos || []).filter((payment) => payment.tipo_movimiento === "PAGO");
        const stock = (operationDetail?.movimientos_inventario || [])
            .filter((movement) => movement.tipo_movimiento === "SALIDA_VENTA")
            .reduce((total, movement) => total + Number(movement.cantidad || 0), 0);
        return {
            payments: payments.length,
            paymentTotal: payments.reduce((total, payment) => total + Number(payment.monto_pagado || 0), 0),
            stock,
            courses: details.filter((detail) => detail.tipo_detalle === "CURSO").length,
            fees: details.filter((detail) => detail.tipo_detalle === "CUOTA").length,
            debts: details.filter((detail) => ["DEUDA", "INVENTARIO", "CURSO", "CUOTA"].includes(detail.tipo_detalle)).length,
        };
    }, [operationDetail]);

    if (!isOpen || !transaction) return null;

    const canCancel = Boolean(transaction.idOperacion) && transaction.status === "COMPLETADA";
    const cancelButtonTitle = transaction.isLegacy
        ? "Esta transacción es anterior al modelo de operaciones y no puede anularse automáticamente."
        : transaction.status === "ANULADA"
            ? "La transacción ya fue anulada."
            : "Anular la operación completa";

    const getTypeStyle = (type: string) => {
        switch (type) {
            case "VENTA": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "VENTA A CUENTA": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
            case "CURSO": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            case "CUOTA": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
            case "COMPRA": return "text-red-400 bg-red-400/10 border-red-400/20";
            default: return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
        }
    };

    const handleCancel = async () => {
        const normalizedReason = reason.trim();
        if (!normalizedReason) {
            setError("Escribe el motivo de la anulación.");
            return;
        }
        if (!transaction.idOperacion) return;

        setIsSubmitting(true);
        setError("");
        try {
            const response = await fetch(`http://localhost:8000/api/operaciones/${transaction.idOperacion}/anular`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ motivo: normalizedReason }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.detail || "No se pudo anular la transacción.");
            }
            await onAnulled();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "No se pudo anular la transacción.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-border-table rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-bold text-white">Detalles de Transacción</h2>
                        <p className="text-xs text-zinc-400 font-mono mt-1">Folio: {transaction.serieFolio}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-black/30 border border-white/5 rounded-lg p-4 flex flex-col items-center justify-center">
                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Operación</span>
                        <span className={cn(
                            "text-3xl font-black font-mono tracking-tight",
                            transaction.status === "ANULADA" ? "text-zinc-500 line-through" : transaction.type === "COMPRA" ? "text-red-400" : "text-emerald-400",
                        )}>
                            ${transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex gap-2 mt-3">
                            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border", getTypeStyle(transaction.type))}>
                                {transaction.type}
                            </span>
                            <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                transaction.status === "ANULADA" ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                            )}>
                                {transaction.status}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 text-sm">
                        <Detail icon={Calendar} label="Fecha de la operación" value={transaction.date} />
                        <Detail icon={User} label="Cliente" value={transaction.client || "Público General"} />
                        <Detail icon={Tag} label="Concepto" value={transaction.concept} />
                        <Detail icon={CreditCard} label="Método de pago" value={transaction.paymentMethod || "Sin pago"} />
                        <Detail icon={FileText} label="Observaciones" value={transaction.observation || "Sin observaciones."} />
                    </div>

                    {transaction.status === "ANULADA" && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm">
                            <p className="font-semibold text-red-400">Operación anulada</p>
                            <p className="text-zinc-300 mt-1">{transaction.cancellationReason}</p>
                            {transaction.cancelledAt && <p className="text-xs text-zinc-500 mt-2">Registrada: {transaction.cancelledAt}</p>}
                        </div>
                    )}

                    {transaction.isLegacy && (
                        <p className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                            Movimiento histórico sin operación agrupadora. Se conserva para consulta, pero no puede anularse automáticamente.
                        </p>
                    )}
                </div>

                <div className="p-5 border-t border-white/10 bg-black/20 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                        onClick={() => { setError(""); setShowConfirmation(true); }}
                        disabled={!canCancel || isLoadingDetail}
                        title={cancelButtonTitle}
                        className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoadingDetail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        Anular Transacción
                    </button>
                    <button
                        onClick={() => downloadTicketPdf(transaction, operationDetail)}
                        className="px-5 py-2 bg-violet-600/90 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Descargar ticket PDF
                    </button>
                    <button onClick={onClose} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">
                        Cerrar Detalles
                    </button>
                </div>
            </div>

            {showConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
                    <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-zinc-950 shadow-2xl p-6 space-y-5">
                        <div className="flex gap-3">
                            <div className="rounded-full bg-red-500/10 p-2 h-fit"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                            <div>
                                <h3 className="font-bold text-white">Confirmar anulación completa</h3>
                                <p className="text-sm text-zinc-400 mt-1">Esta acción revierte toda la operación y no admite devoluciones parciales.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <Effect icon={ReceiptText} label="Pagos" value={effects.payments ? `${effects.payments} · $${effects.paymentTotal.toFixed(2)}` : "Sin pagos"} />
                            <Effect icon={Package} label="Stock a restituir" value={`${effects.stock} unidad(es)`} />
                            <Effect icon={GraduationCap} label="Inscripciones" value={`${effects.courses}`} />
                            <Effect icon={Tag} label="Cuotas" value={`${effects.fees}`} />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-zinc-300">Motivo de anulación *</label>
                            <textarea
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder="Explica por qué se anula la operación..."
                                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                            />
                            <p className="text-[10px] text-zinc-600 text-right mt-1">{reason.length}/500</p>
                        </div>

                        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

                        <div className="flex justify-end gap-3">
                            <button disabled={isSubmitting} onClick={() => { setShowConfirmation(false); setError(""); }} className="px-4 py-2 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50">
                                Cancelar
                            </button>
                            <button disabled={isSubmitting || !reason.trim()} onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar Anulación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
    return (
        <div className="flex gap-3">
            <Icon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
                <p className="text-xs font-medium text-zinc-500 mb-0.5">{label}</p>
                <p className="text-zinc-200 leading-snug">{value}</p>
            </div>
        </div>
    );
}

function Effect({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
    return (
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
            <Icon className="w-4 h-4 text-zinc-500 mb-2" />
            <p className="text-zinc-500">{label}</p>
            <p className="text-zinc-200 font-medium mt-0.5">{value}</p>
        </div>
    );
}
