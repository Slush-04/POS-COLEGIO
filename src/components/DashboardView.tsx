import { useState, useEffect } from "react";
import { Download, Plus, Banknote, AlertTriangle, GraduationCap, Users as UsersIcon, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "../lib/utils";

interface DashboardViewProps {
  onNavigate?: (view: string) => void;
}

interface DashboardMetrics {
  ingresos_mes: number;
  comparativa_mes: number | null;
  cuentas_por_cobrar: number;
  cursos_activos: number;
  participantes_inscritos: number;
  flujo_mensual: { name: string; ingresos: number; por_cobrar: number }[];
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/pagos/historial");
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (err) {
        console.error("Error al cargar movimientos recientes:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecent();
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/pagos/dashboard");
        if (res.ok) setMetrics(await res.json());
      } catch (err) {
        console.error("Error al cargar resumen financiero:", err);
      }
    };
    fetchMetrics();
  }, []);

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return "";
    const partes = fechaStr.split("-");
    if (partes.length < 3) return fechaStr;
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const mesIndex = parseInt(partes[1]) - 1;
    return `${meses[mesIndex] || partes[1]} ${partes[2]}`;
  };

  const recentMovementsReal = transactions.slice(0, 5);
  const formatMonto = (monto: number) => `$${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const comparativa = metrics?.comparativa_mes;
  const comparativaPositiva = comparativa === null || comparativa >= 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Resumen Financiero</h1>
          <p className="text-zinc-400 mt-1">Instantánea de hoy y rendimiento del período actual.</p>
        </div>
        <div className="flex gap-1">
          <button className="flex items-center gap-2 px-4 py-2 border border-border-table rounded-custom text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors bg-transparent">
            <Download className="w-4 h-4" />
            Reporte
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-zinc-900/30 p-5 rounded-custom border border-border-table shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="label-caps">INGRESOS DEL MES</h3>
            <Banknote className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-3xl font-bold text-white mb-3">{formatMonto(metrics?.ingresos_mes || 0)}</p>
          <div className="flex items-center gap-2">
            {comparativa !== null && comparativa !== undefined ? (
              <>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", comparativaPositiva ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                  {comparativaPositiva ? '↗' : '↘'} {Math.abs(comparativa)}%
                </span>
                <span className="text-xs text-zinc-500">vs mes pasado</span>
              </>
            ) : <span className="text-xs text-zinc-500">Sin comparación del mes pasado</span>}
          </div>
        </div>

        {/* Card 2 - Danger Theme */}
        <div className="bg-red-500/5 p-5 rounded-custom border border-red-500/20 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[10px] uppercase tracking-[0.05em] font-semibold text-red-400">TOTAL CUENTAS POR COBRAR</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-400 mb-3">{formatMonto(metrics?.cuentas_por_cobrar || 0)}</p>
          <span className="text-xs text-red-400/80">Saldo pendiente de cobro</span>
        </div>

        {/* Card 3 */}
        <div className="bg-zinc-900/30 p-5 rounded-custom border border-border-table shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="label-caps">CURSOS ACTIVOS</h3>
            <GraduationCap className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-3xl font-bold text-white mb-3">{metrics?.cursos_activos || 0}</p>
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-xs text-zinc-500 mt-1">Con inicio en el mes actual</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-zinc-900/30 p-5 rounded-custom border border-border-table shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="label-caps">PARTICIPANTES INSCRITOS</h3>
            <UsersIcon className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-3xl font-bold text-white mb-3">{metrics?.participantes_inscritos || 0}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">En cursos activos del mes</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-7 bg-zinc-900/30 rounded-custom border border-border-table p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Flujo de Caja Mensual</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-zinc-400">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-zinc-400">Cuentas por cobrar</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.flujo_mensual || []} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#a3a3a3' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#a3a3a3' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #262626', backgroundColor: '#171717', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="por_cobrar" name="Cuentas por cobrar" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Movements Section */}
        <div className="lg:col-span-5 bg-zinc-900/30 rounded-custom border border-border-table shadow-sm flex flex-col">
          <div className="p-5 border-b border-border-table flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Movimientos Recientes</h3>
            <button onClick={() => onNavigate?.('transactions')} className="text-sm text-zinc-500 hover:text-white transition-colors">Ver Todo</button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider">
                <tr>
                  <th className="px-2 py-3 font-medium">FECHA</th>
                  <th className="px-5 py-3 font-medium">CLIENTE</th>
                  <th className="px-5 py-3 font-medium">CONCEPTO</th>
                  <th className="px-5 py-3 font-medium text-right">MONTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-table">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        Cargando...
                      </div>
                    </td>
                  </tr>
                ) : recentMovementsReal.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-zinc-500">
                      Sin movimientos recientes.
                    </td>
                  </tr>
                ) : (
                  recentMovementsReal.map((item) => {
                    const prefijo = item.type === "COMPRA" ? "-" : "+";
                    const formattedAmount = `${prefijo}$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                    const fechaFormateada = formatearFecha(item.date);
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-zinc-500 text-xs">
                          {fechaFormateada.split(" ")[0]}<br />
                          {fechaFormateada.split(" ")[1] || ""}
                        </td>
                        <td className="px-5 py-3.5 text-white font-medium text-xs max-w-[120px] truncate" title={item.client}>
                          {item.client}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs max-w-[150px] truncate" title={item.concept}>
                          {item.concept}
                        </td>
                        <td className={cn(
                          "px-5 py-3.5 text-right font-medium font-mono text-xs",
                          item.type === "COMPRA" ? "text-red-400" : "text-emerald-400"
                        )}>
                          {formattedAmount}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
