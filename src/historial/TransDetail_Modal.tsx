import { X, Calendar, User, Tag, Activity, DollarSign, CreditCard, FileText } from "lucide-react";
import { cn } from "../lib/utils";

interface Transaction {
    id: string;
    date: string;
    serieFolio: string;
    client: string;
    type: string;
    concept: string;
    amount: number;
    paymentMethod: string;
    observation: string;
    status: string;
}

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
}

export function TransactionDetailModal({ isOpen, onClose, transaction }: TransactionDetailModalProps) {
    if (!isOpen || !transaction) return null;

    const getTypeStyle = (type: string) => {
        switch (type) {
            case "VENTA": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "CURSO": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            case "CUOTA": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
            case "COMPRA": return "text-red-400 bg-red-400/10 border-red-400/20";
            default: return "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-border-table rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-bold text-white">Detalles de Transacción</h2>
                        <p className="text-xs text-zinc-400 font-mono mt-1">Folio: {transaction.serieFolio}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Grid */}
                <div className="p-6 space-y-5">
                    {/* Main Amount Callout */}
                    <div className="bg-black/30 border border-white/5 rounded-lg p-4 flex flex-col items-center justify-center">
                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Movimiento</span>
                        <span className={cn(
                            "text-3xl font-black font-mono tracking-tight",
                            transaction.type === 'COMPRA' ? "text-red-400" : "text-emerald-400"
                        )}>
                            ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={cn(
                            "mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            getTypeStyle(transaction.type)
                        )}>
                            {transaction.type}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 text-sm">

                        <div className="flex gap-3">
                            <Calendar className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Fecha del pago</p>
                                <p className="text-zinc-200">{transaction.date}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <User className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Cliente</p>
                                <p className="text-zinc-200 font-medium">{transaction.client || "Público General"}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Tag className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Concepto</p>
                                <p className="text-zinc-200 leading-snug">{transaction.concept}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <CreditCard className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Método de pago</p>
                                <p className="text-zinc-200">{transaction.paymentMethod}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <FileText className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Observaciones</p>
                                {transaction.observation ? (
                                    <p className="text-zinc-300 italic text-sm bg-white/5 p-2 rounded mt-1">"{transaction.observation}"</p>
                                ) : (
                                    <p className="text-zinc-600 italic">Sin observaciones.</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-black/20 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Cerrar Detalles
                    </button>
                </div>

            </div>
        </div>
    );
}

