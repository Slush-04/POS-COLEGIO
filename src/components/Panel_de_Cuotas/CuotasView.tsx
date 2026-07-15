import { Users, TrendingUp, CalendarCheck, Search, AlertCircle, ArrowUpDown, Crown } from "lucide-react";
import { cn } from "../../lib/utils";
import { useState, useEffect } from "react";
import { ModalCalendarioCuotas } from "./ModalCalendarioCuotas";
import { ModalDetalleDeuda } from "../Panel_Deudas/ModalDetalleDeuda";
import { Paginacion } from "../ui/Paginacion";
import { PAGINATION_CONFIG } from "../ui/configuracion";

interface DashboardMetrics {
  membresia: { activos: number; inactivos: number };
  proyeccion_mes: { meta: number; progreso: number };
  cuotas_pendientes: number;
  anualidades: { cantidad: number; ingreso: number };
}

interface HistorialMes {
  anio: number;
  mes: number;
  estado_pago: string;
}

interface Asociado {
  id_cliente: number;
  nombre: string;
  rfc: string;
  estatus_operativo: string;
  fecha_registro: string;
  anualidad: string;
  historial: HistorialMes[];
  deuda_total_cuotas?: number;
}

const MONTH_ABBR = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

export function CuotasView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"none" | "mayor" | "menor">("none");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDetalleDeudaOpen, setIsDetalleDeudaOpen] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState<Asociado | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [asociados, setAsociados] = useState<Asociado[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGINATION_CONFIG.defaultLimit);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortOrder]);

  useEffect(() => {
    fetchDashboard();
    fetchAsociados();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cuotas/dashboard");
      const data = await res.json();
      setMetrics(data);
    } catch (e) { console.error("Error fetching dashboard:", e); }
  };

  const fetchAsociados = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cuotas/asociados");
      const data = await res.json();
      setAsociados(data);
    } catch (e) { console.error("Error fetching asociados:", e); }
  };

  // Transformar datos del backend al formato que usa tu diseño
  const getLast4Months = (historial: HistorialMes[]) => {
    const sorted = [...historial].sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
    return sorted.slice(-4).map(h => ({
      name: MONTH_ABBR[h.mes - 1],
      paid: h.estado_pago === 'PAGADO' || h.estado_pago === 'EXENTO'
    }));
  };

  const calcSaldo = (asociado: Asociado) => {
    return formatCurrency(asociado.deuda_total_cuotas ?? 0);
  };

  const calcSaldoNum = (asociado: Asociado) => {
    return asociado.deuda_total_cuotas ?? 0;
  };

  const filteredData = asociados
    .filter(asc => {
      const matchesSearch = asc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asc.rfc && asc.rfc.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "activo") return asc.estatus_operativo === 'Activo';
      if (statusFilter === "inactivo") return asc.estatus_operativo === 'Inactivo';
      if (statusFilter === "con_adeudo") return asc.historial.some(h => h.estado_pago === 'PENDIENTE');

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "mayor") return calcSaldoNum(b) - calcSaldoNum(a);
      if (sortOrder === "menor") return calcSaldoNum(a) - calcSaldoNum(b);
      return 0;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCalendar = (asociado: Asociado) => {
    setSelectedAssociate(asociado);
    setIsCalendarOpen(true);
  };

  const handleOpenCuotasPayment = (asociado: Asociado) => {
    setSelectedAssociate(asociado);
    setIsDetalleDeudaOpen(true);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Control de Cuotas de Asociados</h1>
          <p className="text-zinc-400 mt-1">Gestión de membresías, anualidades y pagos mensuales de asociados.</p>
        </div>

      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-border-table p-4 rounded-custom flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1.5">Estado de la Membresía</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-white">{metrics?.membresia.activos ?? 0} <span className="text-[10px] font-normal text-zinc-500 uppercase">Activos</span></p>
              <span className="text-zinc-600 text-sm">/</span>
              <p className="text-sm font-medium text-zinc-400">{metrics?.membresia.inactivos ?? 0} <span className="text-[10px] font-normal text-zinc-500 uppercase">Inactivos</span></p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-border-table p-4 rounded-custom flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-1">Proyección del Mes</p>
              <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(metrics?.proyeccion_mes.meta ?? 0)}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-zinc-400 uppercase">Recaudado</span>
              <span className="text-zinc-500 font-mono">{formatCurrency(metrics?.proyeccion_mes.progreso ?? 0)}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1">
              <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${Math.min(100, ((metrics?.proyeccion_mes.progreso ?? 0) / (metrics?.proyeccion_mes.meta || 1)) * 100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-border-table p-4 rounded-custom flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1.5">Cuotas Pendientes</p>
            <p className="text-xl font-bold text-red-400 font-mono">{formatCurrency(metrics?.cuotas_pendientes ?? 0)}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Acumulado anual</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-border-table p-4 rounded-custom flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1.5">Anualidades Pagadas</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-white">{metrics?.anualidades.cantidad ?? 0} <span className="text-[10px] font-normal text-zinc-500 uppercase">Socios</span></p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/30 p-4 border border-border-table rounded-xl">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/50 border border-border-table rounded-md text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
          />
        </div>
        {/* Filtros Rápidos */}
        <div className="flex flex-wrap gap-2 items-center justify-start md:justify-end w-full md:w-auto">
          {[
            { key: "all", label: "Todos" },
            { key: "con_adeudo", label: "Con Adeudo" },
            { key: "activo", label: "Activos" },
            { key: "inactivo", label: "Inactivos" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setSortOrder("none"); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all border",
                statusFilter === f.key
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "bg-black/30 text-zinc-400 border-border-table hover:bg-zinc-800 hover:text-zinc-300"
              )}
            >
              {f.label}
            </button>
          ))}

          <div className="w-px bg-zinc-700/50 mx-1 self-stretch hidden md:block" />

          {[
            { key: "mayor" as const, label: "Mayor Deuda" },
            { key: "menor" as const, label: "Menor Deuda" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSortOrder(prev => prev === s.key ? "none" : s.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all border flex items-center gap-1.5",
                sortOrder === s.key
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-black/30 text-zinc-400 border-border-table hover:bg-zinc-800 hover:text-zinc-300"
              )}
            >
              <ArrowUpDown className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/30 border border-border-table rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">RFC</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 min-w-[280px]">Cuotas (Últ. 4 Meses)</th>
                <th className="px-6 py-4 text-right">Saldo</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-table">
              {paginatedData.map((asociado) => {
                const months = getLast4Months(asociado.historial);
                const saldo = calcSaldo(asociado);
                return (
                  <tr
                    key={asociado.id_cliente}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onDoubleClick={() => handleOpenCalendar(asociado)}
                  >
                    <td className="px-6 py-4 text-zinc-400 font-mono text-xs">#{asociado.id_cliente}</td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-1.5 font-medium",
                        asociado.estatus_operativo === 'Activo' ? "text-zinc-300" : "text-zinc-500"
                      )}>
                        <span>{asociado.nombre}</span>
                        {asociado.anualidad === 'PAGADO' && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{asociado.rfc || '---'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          asociado.estatus_operativo === 'Activo' ? "bg-emerald-400" : "bg-zinc-500"
                        )} />
                        <span className={cn(
                          asociado.estatus_operativo === 'Activo' ? "text-zinc-300" : "text-zinc-500"
                        )}>
                          {asociado.estatus_operativo}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 max-w-[220px]">
                        {months.length > 0 ? months.map((month, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border flex-1 text-center transition-colors",
                              month.paid
                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                : "bg-red-950/40 border-red-500/20 text-rose-400"
                            )}
                          >
                            {month.name}
                          </div>
                        )) : <span className="text-xs text-zinc-500 italic">Sin cuotas</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "font-mono font-bold",
                        calcSaldoNum(asociado) > 0 ? "text-zinc-300" : "text-zinc-500"
                      )}>
                        {saldo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {calcSaldoNum(asociado) > 0 ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenCuotasPayment(asociado);
                          }}
                          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          Pagar cuotas
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">
                          Sin adeudo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No se encontraron asociados.
          </div>
        )}
        <Paginacion
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          isLoading={false}
          onPageChange={(nuevaPagina) => setCurrentPage(nuevaPagina)}
          onItemsPerPageChange={(nuevoLimite) => {
            setItemsPerPage(nuevoLimite);
            setCurrentPage(1);
          }}
        />
      </div>
      <ModalCalendarioCuotas
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        associateName={selectedAssociate?.nombre || ""}
        idCliente={selectedAssociate?.id_cliente}
        fechaRegistro={selectedAssociate?.fecha_registro}
        anualidad={selectedAssociate?.anualidad}
      />
      <ModalDetalleDeuda
        isOpen={isDetalleDeudaOpen}
        onClose={() => setIsDetalleDeudaOpen(false)}
        debtorName={selectedAssociate?.nombre}
        clienteId={selectedAssociate?.id_cliente}
        debtTypes={["CUOTA_MENSUAL", "CUOTA_ANUAL"]}
        onPaymentSuccess={() => {
          fetchDashboard();
          fetchAsociados();
        }}
      />
    </div>
  );
}
