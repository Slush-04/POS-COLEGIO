import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  HandCoins,
  Hash,
  Loader2,
  ReceiptText,
  Save,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

interface FolioSeries {
  clave: string;
  nombre: string;
  prefijo: string;
  periodo_actual?: string | null;
  proximo_consecutivo: number;
  vista_previa: string;
  ultimo_folio?: string | null;
}

interface OperationSettings {
  series: FolioSeries[];
  motivo_anulacion_minimo: number;
}

export function OperationFolioSettings() {
  const [settings, setSettings] = useState<OperationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("http://localhost:8000/api/configuracion/operacion-folios");
      if (!response.ok) throw new Error("No se pudo cargar la configuración de folios.");
      setSettings(await response.json());
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo cargar la configuración." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateSeries = (clave: string, changes: Partial<FolioSeries>) => {
    setSettings((current) => current ? {
      ...current,
      series: current.series.map((serie) => serie.clave === clave ? { ...serie, ...changes } : serie),
    } : current);
    setMessage(null);
  };

  const previewFolio = (serie: FolioSeries) => {
    const year = String(new Date().getFullYear()).slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const consecutive = String(serie.proximo_consecutivo || 1).padStart(4, "0");
    return `${serie.prefijo.trim().toUpperCase() || "SERIE"}-${year}${month}${consecutive}`;
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("http://localhost:8000/api/configuracion/operacion-folios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: settings.series.map(({ clave, prefijo }) => ({ clave, prefijo })),
          motivo_anulacion_minimo: Number(settings.motivo_anulacion_minimo),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "No se pudo guardar la configuración.");
      setSettings(data);
      setMessage({ type: "success", text: "Configuración operativa guardada correctamente." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo guardar la configuración." });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return <div className="h-64 flex items-center justify-center rounded-custom border border-border-table bg-zinc-900/30 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-400" />Cargando configuración operativa...</div>;
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="rounded-custom border border-blue-500/20 bg-blue-500/[0.05] p-4 flex-1">
          <div className="flex items-center gap-2 text-blue-400"><Hash className="w-5 h-5" /><h2 className="font-bold text-white">Series de operación</h2></div>
          <p className="text-sm text-zinc-400 mt-1">Cada tipo conserva su secuencia mensual. Los cambios sólo afectan folios nuevos.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={fetchSettings} disabled={loading || saving} className="px-4 py-2.5 border border-border-table hover:bg-white/5 disabled:opacity-50 text-zinc-300 rounded-md text-sm font-medium">Descartar</button>
          <button onClick={saveSettings} disabled={loading || saving || !settings} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-md text-sm font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}
        </div>
      )}

      {settings && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {settings.series.map((serie) => {
              const meta = getSeriesMeta(serie.clave);
              const SeriesIcon = meta.icon;
              return (
                <article key={serie.clave} className="bg-gradient-to-br from-zinc-900/70 to-zinc-950/40 border border-border-table rounded-custom p-4 hover:border-blue-500/25 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}><SeriesIcon className="w-4 h-4" /></div>
                      <div><h3 className="font-semibold text-white">{serie.nombre}</h3><p className="text-[10px] text-zinc-500">Reinicio mensual</p></div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 border border-white/10 rounded px-2 py-1">{serie.clave}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] gap-2 items-end">
                    <label className="space-y-1 block">
                      <span className="text-xs font-medium text-zinc-400">Prefijo</span>
                      <input value={serie.prefijo} maxLength={8} onChange={(event) => updateSeries(serie.clave, { prefijo: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className="w-full px-2.5 py-1.5 bg-black/40 border border-border-table rounded-md text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500" />
                    </label>
                    <div className="rounded-md border border-blue-500/15 bg-blue-500/[0.04] px-2.5 py-1.5 min-w-0"><p className="text-[9px] uppercase tracking-wider text-zinc-600">Próximo</p><p className="text-sm font-bold font-mono text-blue-300 truncate">{previewFolio(serie)}</p></div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2.5"><span className="text-[9px] uppercase tracking-wider text-zinc-600">Último emitido</span><span className="text-[11px] font-mono text-zinc-400 truncate">{serie.ultimo_folio || "Sin movimientos"}</span></div>
                </article>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-custom border border-border-table bg-zinc-900/30 p-5">
              <h2 className="font-bold text-white mb-3">Reglas operativas</h2>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">Mínimo de caracteres del motivo de anulación</span>
                <input type="number" min={3} max={100} value={settings.motivo_anulacion_minimo} onChange={(event) => setSettings({ ...settings, motivo_anulacion_minimo: Number(event.target.value) })} className="w-full px-3 py-2 bg-black/40 border border-border-table rounded-md text-sm text-white font-mono focus:outline-none focus:border-blue-500" />
              </label>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-zinc-500"><FixedRule text="Año y mes automáticos" /><FixedRule text="Reinicio mensual en 0001" /><FixedRule text="Folios emitidos protegidos" /></div>
            </section>

            <section className="rounded-custom border border-border-table bg-zinc-900/30 p-5 flex items-start justify-between gap-4">
              <div><div className="flex items-center gap-2"><ReceiptText className="w-4 h-4 text-violet-400" /><h2 className="font-bold text-white">Tickets y recibos</h2></div><p className="text-xs text-zinc-500 mt-2">Base preparada para incorporar identidad, contenido y formato de los PDF.</p></div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 shrink-0"><FileText className="w-4 h-4 text-violet-400" /><span>Salida PDF</span></div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function getSeriesMeta(clave: string) {
  switch (clave) {
    case "V": return { icon: ShoppingCart, color: "bg-emerald-500/10 text-emerald-400" };
    case "VC": return { icon: WalletCards, color: "bg-amber-500/10 text-amber-400" };
    case "CU": return { icon: GraduationCap, color: "bg-blue-500/10 text-blue-400" };
    case "QT": return { icon: CalendarDays, color: "bg-purple-500/10 text-purple-400" };
    default: return { icon: HandCoins, color: "bg-cyan-500/10 text-cyan-400" };
  }
}

function FixedRule({ text }: { text: string }) {
  return <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{text}</span>;
}
