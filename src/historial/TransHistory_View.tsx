import { useState, useEffect } from "react";
import { Search, Download, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { TransactionDetailModal } from "./TransDetail_Modal";

export function TransactionHistoryView() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Reiniciar a la página 1 cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, statusFilter, startDate, endDate]);

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("http://localhost:8000/api/pagos/historial");
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (err) {
            console.error("Error al cargar historial:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const getTypeStyle = (type: string) => {
        switch (type) {
            case "VENTA": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "VENTA A CUENTA": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
            case "CURSO": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            case "CUOTA": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
            case "COMPRA": return "text-red-400 bg-red-400/10 border-red-400/20";
            case "PAGO": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
            default: return "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
        }
    };

    const getStatusStyle = (status: string) => status === "ANULADA"
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

    const filteredTransactions = transactions.filter(t => {
        const clientName = t.client || "";
        const folio = t.serieFolio || "";
        const movementType = t.type || "";

        const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movementType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter ? t.type === typeFilter : true;
        const matchesStatus = statusFilter ? t.status === statusFilter : true;

        let matchesDate = true;
        if (startDate) {
            matchesDate = matchesDate && t.date >= startDate;
        }
        if (endDate) {
            matchesDate = matchesDate && t.date <= endDate;
        }

        return matchesSearch && matchesType && matchesStatus && matchesDate;
    });

    const totalPages = Math.ceil(filteredTransactions.length / 15);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * 15, currentPage * 15);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Movimientos de Ventas</h1>
                    <p className="text-zinc-400 mt-1">Historial completo de transacciones y operaciones.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-border-table rounded-custom text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors bg-black/20">
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-zinc-900/30 p-5 rounded-custom border border-border-table">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-zinc-400">Buscar Transacción</label>
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Cliente, folio o tipo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 w-full md:w-48">
                        <label className="text-xs font-medium text-zinc-400">Tipo de Movimiento</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-blue-500 appearance-none"
                        >
                            <option value="">Todos los Tipos</option>
                            <option value="VENTA">Venta</option>
                            <option value="VENTA A CUENTA">Venta a cuenta</option>
                            <option value="CURSO">Curso</option>
                            <option value="CUOTA">Cuota</option>
                            <option value="PAGO">Pago de deuda</option>
                            <option value="COMPRA">Compra</option>
                        </select>
                    </div>

                    <div className="space-y-1.5 w-full md:w-44">
                        <label className="text-xs font-medium text-zinc-400">Estado</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-blue-500 appearance-none"
                        >
                            <option value="">Todos</option>
                            <option value="COMPLETADA">Completada</option>
                            <option value="ANULADA">Anulada</option>
                        </select>
                    </div>

                    <div className="space-y-1.5 w-full md:w-40">
                        <label className="text-xs font-medium text-zinc-400">Fecha Inicial</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5 w-full md:w-40">
                        <label className="text-xs font-medium text-zinc-400">Fecha Final</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                    </div>

                    {(startDate || endDate || typeFilter || statusFilter || searchTerm) && (
                        <button
                            onClick={() => { setStartDate(""); setEndDate(""); setTypeFilter(""); setStatusFilter(""); setSearchTerm(""); }}
                            className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors h-[38px] flex items-center justify-center whitespace-nowrap"
                        >
                            Limpiar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-zinc-900/30 rounded-custom border border-border-table overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-400 bg-black/40 border-b border-border-table uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-medium">Fecha</th>
                                <th className="px-6 py-4 font-medium">Serie/Folio</th>
                                <th className="px-6 py-4 font-medium">Cliente</th>
                                <th className="px-6 py-4 font-medium">Tipo</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium text-right">Total/Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-table">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                                            Cargando transacciones...
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedTransactions.map((trx) => (
                                    <tr
                                        key={trx.id}
                                        className={`hover:bg-white/5 transition-colors cursor-pointer group ${trx.status === 'ANULADA' ? 'opacity-70' : ''}`}
                                        onDoubleClick={() => setSelectedTransaction(trx)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-zinc-300">{trx.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-zinc-400">{trx.serieFolio}</td>
                                        <td className="px-6 py-4 text-white font-medium">{trx.client}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeStyle(trx.type)}`}>
                                                {trx.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(trx.status)}`}>
                                                {trx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`font-mono font-bold text-white ${trx.status === 'ANULADA' ? 'line-through text-zinc-500' : ''}`}>
                                                    ${trx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                                {trx.type === 'COMPRA' ? (
                                                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                                                ) : (
                                                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredTransactions.length === 0 && (
                    <div className="p-8 text-center text-zinc-500">
                        No se encontraron transacciones.
                    </div>
                )}

                {/* Controles de Paginación */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-black/20 border-t border-border-table text-xs text-zinc-400 gap-4">
                    <div>
                        Mostrando {filteredTransactions.length > 0 ? (currentPage - 1) * 15 + 1 : 0} a {Math.min(filteredTransactions.length, currentPage * 15)} de {filteredTransactions.length} movimientos
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="px-3 py-1.5 bg-zinc-900 border border-white/5 rounded text-white font-medium">
                            Página {currentPage} de {Math.max(totalPages, 1)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            <div className="text-sm text-zinc-500 text-center">
                * Haz doble clic en una fila para ver los detalles de la transacción.
            </div>

            <TransactionDetailModal
                isOpen={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
                onAnulled={async () => {
                    setSelectedTransaction(null);
                    await fetchTransactions();
                }}
            />
        </div>
    );
}
