import { Search, Filter, Plus, ChevronLeft, ChevronRight, FileText, DollarSign } from "lucide-react";

const debtorsData = [
  {
    id: "CLI-0842",
    name: "Acme Corp Logistics",
    totalBalance: "$12,450.00",
    overdueBalance: "$4,200.00",
    status: "Vencido (45d)",
    lastPaymentDate: "12 Oct, 2023",
    lastPaymentAmount: "$1,500.00",
    isOverdue: true
  },
  {
    id: "CLI-0911",
    name: "Stark Industries",
    totalBalance: "$8,900.00",
    overdueBalance: "$0.00",
    status: "Al Corriente",
    lastPaymentDate: "01 Nov, 2023",
    lastPaymentAmount: "$8,900.00",
    isOverdue: false
  },
  {
    id: "CLI-1024",
    name: "Wayne Enterprises",
    totalBalance: "$45,000.00",
    overdueBalance: "$15,000.00",
    status: "Vencido (90d+)",
    lastPaymentDate: "15 Ago, 2023",
    lastPaymentAmount: "$5,000.00",
    isOverdue: true
  },
  {
    id: "CLI-1155",
    name: "Globex Corp",
    totalBalance: "$2,300.00",
    overdueBalance: "$0.00",
    status: "Al Corriente",
    lastPaymentDate: "05 Nov, 2023",
    lastPaymentAmount: "$1,200.00",
    isOverdue: false
  }
];

export function AccountsReceivableView() {
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Cuentas por Cobrar</h1>
          <p className="text-zinc-400 mt-1">Gestionar saldos pendientes y registrar pagos entrantes.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-zinc-900/30 border border-border-table p-4 rounded-custom min-w-[200px]">
            <p className="text-xs text-zinc-400 mb-1">Total Pendiente</p>
            <div className="flex items-end justify-between">
              <p className="text-xl font-bold text-white font-mono">$142,500.00</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                +5.2%
              </span>
            </div>
          </div>
          <div className="bg-zinc-900/30 border border-border-table p-4 rounded-custom min-w-[200px]">
            <p className="text-xs text-zinc-400 mb-1">Vencido (30+ Días)</p>
            <div className="flex items-end justify-between">
              {/* Color Semántico: Rojo para indicar peligro/vencido */}
              <p className="text-xl font-bold text-red-400 font-mono">$38,240.00</p>
              <span className="text-xs text-zinc-500">12 Ctas</span>
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
                placeholder="Buscar por nombre comercial o folio..." 
                className="w-full pl-9 pr-4 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="hidden md:flex bg-zinc-900/80 border border-border-table rounded-md p-1">
              <button className="px-4 py-1.5 bg-zinc-800 text-white rounded text-sm font-medium shadow-sm border border-white/5">Todos</button>
              <button className="px-4 py-1.5 text-zinc-400 hover:text-white rounded text-sm font-medium transition-colors">Con Saldo</button>
              <button className="px-4 py-1.5 text-zinc-400 hover:text-white rounded text-sm font-medium transition-colors">Al Corriente</button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-border-table hover:bg-zinc-800 text-zinc-300 rounded-md text-sm font-medium transition-colors flex">
              <Filter className="w-4 h-4" />
              Más Filtros
            </button>
            {/* 
              ==========================================================================
              BOTÓN PRIMARIO:
              - Usa las clases 'bg-primary' y 'hover:bg-primary-hover' mapeadas al 
                color corporativo principal en index.css
              ==========================================================================
            */}
            <button className="flex-1 lg:flex-none items-center justify-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-bold transition-colors shadow-md flex">
              <DollarSign className="w-4 h-4" />
              Aplicar Pago
            </button>
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
                <th className="px-6 py-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-table">
              {debtorsData.map((debtor) => (
                <tr key={debtor.id} className="hover:bg-white/5 transition-colors">
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
                  <td className="px-6 py-4 text-right">
                    <button className="flex items-center justify-end gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors ml-auto">
                      <FileText className="w-3.5 h-3.5" />
                      Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border-table bg-black/20 text-xs text-zinc-500 flex justify-between items-center">
          <span>Mostrando 1-4 de 142 deudores</span>
          <div className="flex items-center gap-4">
             <button className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50">
               <ChevronLeft className="w-5 h-5" />
             </button>
             <span className="font-medium text-zinc-300">1 / 36</span>
             <button className="text-zinc-400 hover:text-white transition-colors">
               <ChevronRight className="w-5 h-5" />
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}
