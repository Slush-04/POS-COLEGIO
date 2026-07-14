import { Search, Filter, FileText, DollarSign } from "lucide-react";
import React, { useState, useEffect } from "react";
import { ModalDetalleDeuda } from "./ModalDetalleDeuda";
import { Paginacion } from "../ui/Paginacion";
import { PAGINATION_CONFIG } from "../ui/configuracion";

export function DeudasView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSort, setSelectedSort] = useState("saldos-mayores"); // 'saldos-mayores', 'antiguos', 'no-cliente'
  const [debtorsData, setDebtorsData] = useState<any[]>([]);

  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [selectedDebtorName, setSelectedDebtorName] = useState("");
  const [selectedDebtorDebt, setSelectedDebtorDebt] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState<number | undefined>(undefined);

  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(PAGINATION_CONFIG.defaultLimit);

  useEffect(() => {
    if (!showFilterMenu) return;
    const handleOutsideClick = () => setShowFilterMenu(false);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [showFilterMenu]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSort]);

  const toggleFilterMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFilterMenu(!showFilterMenu);
  };

  const fetchDeudas = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/pagos/deudas");
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((d: any) => ({
          ...d,
          totalBalance: d.totalBalanceFormateado,
          overdueBalance: d.overdueBalanceFormateado,
          totalBalanceNum: d.totalBalance,
          overdueBalanceNum: d.overdueBalance,
          lastPaymentDate: "N/A",
          lastPaymentAmount: "$0.00"
        }));
        setDebtorsData(mappedData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDeudas();
  }, []);

  const filteredAndSortedDebtors = [...debtorsData]
    .filter(debtor => {
      const matchesSearch = debtor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            debtor.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (selectedSort === "saldos-mayores") {
        return (b.overdueBalanceNum || 0) - (a.overdueBalanceNum || 0);
      }
      if (selectedSort === "antiguos") {
        const dateA = a.oldestDebtDate ? new Date(a.oldestDebtDate).getTime() : 0;
        const dateB = b.oldestDebtDate ? new Date(b.oldestDebtDate).getTime() : 0;
        return dateA - dateB;
      }
      if (selectedSort === "no-cliente") {
        return (a.id_cliente_num || 0) - (b.id_cliente_num || 0);
      }
      return 0;
    });

  const totalDebtors = filteredAndSortedDebtors.length;
  const totalPages = Math.ceil(totalDebtors / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalDebtors);
  const paginatedDebtors = filteredAndSortedDebtors.slice(startIndex, endIndex);

  const handleOpenDetalles = (name: string, debt: string, clienteId: number) => {
    setSelectedDebtorName(name);
    setSelectedDebtorDebt(debt);
    setSelectedClienteId(clienteId);
    setIsDetalleOpen(true);
  };

  const totalPendiente = debtorsData.reduce((acc, curr) => {
    const overdue = parseFloat(curr.overdueBalance.replace(/[^0-9.-]+/g, ""));
    return acc + overdue;
  }, 0);

  const totalVencido = debtorsData.filter(d => d.isOverdue).reduce((acc, curr) => {
    const overdue = parseFloat(curr.overdueBalance.replace(/[^0-9.-]+/g, ""));
    return acc + overdue;
  }, 0);

  const vencidosCount = debtorsData.filter(d => d.isOverdue).length;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* 
        ==========================================================================
        VARIABLES DE WHITE-LABEL APLICADAS AQUÍ:
        - Fuentes: Definidas por la clase 'font-sans' heredada del layout base.
        - Textos Principales: Utilizan 'text-white' o variables semánticas.
        ==========================================================================
      */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Deudas</h1>
          <p className="text-zinc-400 mt-1">Gestionar saldos pendientes y registrar pagos entrantes.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-zinc-900/30 border border-border-table p-4 rounded-custom min-w-[200px]">
            <p className="text-xs text-zinc-400 mb-1">Total Pendiente</p>
            <div className="flex items-end justify-between">
              <p className="text-xl font-bold text-white font-mono">{formatter.format(totalPendiente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ==========================================================================
        ESTILOS DE LA TABLA DE DATOS:
        - Fondos: bg-zinc-900/30
        - Bordes: border-border-table (modificable en index.css)
        ==========================================================================
      */}
      <div className="bg-zinc-900/30 border border-border-table rounded-custom overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="p-4 border-b border-border-table flex flex-col lg:flex-row items-center justify-between gap-4 bg-black/20">

          <div className="flex items-center gap-4 w-full lg:w-auto flex-1">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre comercial, contiene palabras, o folio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

          </div>

          <div className="relative flex items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={toggleFilterMenu}
              className="flex-1 lg:flex-none items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-border-table hover:bg-zinc-800 text-zinc-300 rounded-md text-sm font-medium transition-colors flex relative"
            >
              <Filter className="w-4 h-4" />
              <span>Ordenar por: {selectedSort === 'saldos-mayores' ? 'Saldos mayores' : selectedSort === 'antiguos' ? 'Antiguos' : 'No. de cliente'}</span>
            </button>

            {showFilterMenu && (
              <div 
                className="absolute right-0 top-full mt-2 w-48 bg-zinc-950 border border-border-table rounded-md shadow-xl z-50 py-1 font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setSelectedSort('saldos-mayores');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-zinc-800 ${selectedSort === 'saldos-mayores' ? 'text-blue-400 font-semibold' : 'text-zinc-300'}`}
                >
                  Saldos mayores
                </button>
                <button
                  onClick={() => {
                    setSelectedSort('antiguos');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-zinc-800 ${selectedSort === 'antiguos' ? 'text-blue-400 font-semibold' : 'text-zinc-300'}`}
                >
                  Antiguos
                </button>
                <button
                  onClick={() => {
                    setSelectedSort('no-cliente');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-zinc-800 ${selectedSort === 'no-cliente' ? 'text-blue-400 font-semibold' : 'text-zinc-300'}`}
                >
                  No. de cliente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">NOMBRE DEL DEUDOR</th>
                <th className="px-6 py-4 text-right">SALDO TOTAL</th>
                <th className="px-6 py-4 text-right">SALDO VENCIDO</th>
                <th className="px-6 py-4 text-center">ESTADO</th>
                <th className="px-6 py-4">ÚLTIMO PAGO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-table">
              {paginatedDebtors.map((debtor) => (
                <tr key={debtor.id} className="hover:bg-white/5 transition-colors cursor-pointer" onDoubleClick={() => handleOpenDetalles(debtor.name, debtor.totalBalance, debtor.id_cliente_num)}>
                  <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{debtor.id}</td>
                  <td className="px-6 py-4 text-white font-medium">{debtor.name}</td>
                  <td className="px-6 py-4 text-right text-white font-mono">{debtor.totalBalance}</td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${debtor.isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
                    {debtor.overdueBalance}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {debtor.isOverdue ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        {debtor.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {debtor.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-zinc-300">{debtor.lastPaymentDate}</div>
                    <div className="text-zinc-500 text-xs font-mono mt-0.5">{debtor.lastPaymentAmount}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Paginacion
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalDebtors}
          itemsPerPage={itemsPerPage}
          isLoading={false}
          onPageChange={(nuevaPagina) => setCurrentPage(nuevaPagina)}
          onItemsPerPageChange={(nuevoLimite) => {
            setItemsPerPage(nuevoLimite);
            setCurrentPage(1);
          }}
        />

      </div>

      <ModalDetalleDeuda
        isOpen={isDetalleOpen}
        onClose={() => setIsDetalleOpen(false)}
        debtorName={selectedDebtorName}
        totalDebt={selectedDebtorDebt}
        clienteId={selectedClienteId}
        onPaymentSuccess={fetchDeudas}
      />
    </div>
  );
}
