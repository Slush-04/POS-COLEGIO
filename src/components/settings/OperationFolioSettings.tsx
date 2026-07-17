import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  HandCoins,
  Loader2,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

interface FolioSeries {
  clave: string;
  nombre: string;
  prefijo: string;
  proximo_consecutivo: number;
  ultimo_folio?: string | null;
}

interface TicketSettings {
  titulo_comprobante: string;
  pie_pagina: string;
  mostrar_datos_fiscales: boolean;
  ubicacion_emisor: "ARRIBA" | "ABAJO";
  alineacion_emisor: "IZQUIERDA" | "CENTRO" | "DERECHA";
  alineacion_titulo: "IZQUIERDA" | "CENTRO" | "DERECHA";
  plantilla?: "PLANTILLA_1" | "PLANTILLA_2";
}

interface OperationSettings {
  series: FolioSeries[];
  tickets: TicketSettings;
}

export interface OperationFolioSettingsHandle {
  discard: () => Promise<void>;
  save: () => Promise<void>;
}

export const OperationFolioSettings = forwardRef<OperationFolioSettingsHandle>(function OperationFolioSettings(_, ref) {
  const [settings, setSettings] = useState<OperationSettings | null>(null);
  const [selectedKey, setSelectedKey] = useState("V");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [foliosRes, ticketsRes] = await Promise.all([
        fetch("http://localhost:8000/api/configuracion/operacion-folios"),
        fetch("http://localhost:8000/api/configuracion/tickets")
      ]);
      if (!foliosRes.ok || !ticketsRes.ok) throw new Error("No se pudo cargar la configuración de folios o tickets.");
      const foliosData = await foliosRes.json() as { series: FolioSeries[] };
      const ticketsData = await ticketsRes.json() as TicketSettings;
      setSettings({
        series: foliosData.series,
        tickets: ticketsData
      });
      if (!foliosData.series.some((serie) => serie.clave === selectedKey)) {
        setSelectedKey(foliosData.series[0]?.clave || "V");
      }
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo cargar la configuración." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchSettings(); }, []);

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
    if (!settings || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const [foliosRes, ticketsRes] = await Promise.all([
        fetch("http://localhost:8000/api/configuracion/operacion-folios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ series: settings.series.map(({ clave, prefijo }) => ({ clave, prefijo })) }),
        }),
        fetch("http://localhost:8000/api/configuracion/tickets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings.tickets),
        })
      ]);
      const foliosData = await foliosRes.json().catch(() => ({}));
      const ticketsData = await ticketsRes.json().catch(() => ({}));
      if (!foliosRes.ok) throw new Error(foliosData.detail || "No se pudo guardar la configuración de folios.");
      if (!ticketsRes.ok) throw new Error(ticketsData.detail || "No se pudo guardar la configuración de tickets.");
      
      setSettings({
        series: foliosData.series,
        tickets: ticketsData
      });
      setMessage({ type: "success", text: "Configuración guardada correctamente." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo guardar la configuración." });
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ discard: fetchSettings, save: saveSettings }));

  const selectedSerie = settings?.series.find((serie) => serie.clave === selectedKey) || settings?.series[0];

  if (loading && !settings) {
    return <div className="h-64 flex items-center justify-center rounded-custom border border-border-table bg-zinc-900/30 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-400" />Cargando configuración operativa...</div>;
  }

  return (
    <div className="space-y-9 max-w-6xl">
      <section>
        <header className="pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-blue-400"><h2 className="text-2xl font-bold text-white">Folios de operación</h2></div>
          <p className="text-sm text-zinc-400 mt-2">Cada tipo conserva su secuencia mensual. Los cambios sólo afectan folios nuevos.</p>
        </header>

        {message && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}
          </div>
        )}

        {settings && selectedSerie && (
          <>
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.28fr)] gap-4">
              <div className="space-y-2" role="list" aria-label="Series de operación">
                {settings.series.map((serie) => {
                  const meta = getSeriesMeta(serie.clave);
                  const SeriesIcon = meta.icon;
                  const active = serie.clave === selectedSerie.clave;
                  return (
                    <button
                      key={serie.clave}
                      type="button"
                      onClick={() => setSelectedKey(serie.clave)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-all backdrop-blur-xl ${active
                        ? "border-blue-400/35 bg-blue-500/[0.10] shadow-[0_8px_30px_rgba(37,99,235,0.10)]"
                        : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07] hover:border-white/20"}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}><SeriesIcon className="w-3.5 h-3.5" /></span>
                      <span className="font-semibold text-white">{serie.nombre}</span>
                    </button>
                  );
                })}
              </div>

              <article className="rounded-2xl border border-white/12 bg-white/[0.045] backdrop-blur-xl shadow-[0_16px_45px_rgba(0,0,0,0.22)] p-4 sm:p-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  {(() => {
                    const meta = getSeriesMeta(selectedSerie.clave);
                    const SeriesIcon = meta.icon;
                    return <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.color}`}><SeriesIcon className="w-4 h-4" /></span>;
                  })()}
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Previsualizador de folio</p>
                    <h3 className="font-bold text-white">{selectedSerie.nombre}</h3>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-4 items-start">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-zinc-400">Prefijo</span>
                    <input value={selectedSerie.prefijo} maxLength={8} onChange={(event) => updateSeries(selectedSerie.clave, { prefijo: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className="w-full px-3 py-3.5 bg-black/35 border border-white/10 rounded-lg text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-400/70" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-zinc-400">Próximo folio</span>
                    <div className="rounded-xl border border-blue-400/20 bg-blue-500/[0.07] px-4 py-2.5 flex items-center min-h-[38px]">
                      <span className="text-lg font-bold font-mono text-blue-300 break-all">{previewFolio(selectedSerie)}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Formato: PREFIJO-YYMM0001</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/8 bg-black/20 px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Último emitido</span>
                  <span className="text-sm font-mono text-zinc-300 break-all">{selectedSerie.ultimo_folio || "Sin movimientos"}</span>
                </div>
              </article>
            </div>

          </>
        )}
      </section>

      <section>
        <header className="pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-violet-400">
            <ReceiptText className="w-5 h-5" />
            <h2 className="text-2xl font-bold text-white">Tickets y recibos</h2>
          </div>
          <p className="text-sm text-zinc-400 mt-2">Los comprobantes se generan y descargan como PDF desde el detalle de cada movimiento.</p>
        </header>

        {settings && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Título de Comprobante</label>
                <input
                  type="text"
                  value={settings.tickets.titulo_comprobante}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, titulo_comprobante: e.target.value }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-full px-3 py-2.5 bg-black/35 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-400/70"
                  placeholder="Ej. Comprobante de operación"
                />
                <p className="text-[10px] text-zinc-500">Aparecerá en el encabezado principal del ticket PDF.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Mensaje de Pie de Página</label>
                <input
                  type="text"
                  value={settings.tickets.pie_pagina}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, pie_pagina: e.target.value }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-full px-3 py-2.5 bg-black/35 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-400/70"
                  placeholder="Ej. Documento sin valor fiscal"
                />
                <p className="text-[10px] text-zinc-500">Leyenda que se imprimirá al final de cada comprobante.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Plantilla del Ticket PDF</label>
                <select
                  value={settings.tickets.plantilla || "PLANTILLA_1"}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, plantilla: e.target.value as "PLANTILLA_1" | "PLANTILLA_2" }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-full px-3 py-2.5 bg-black/35 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-400/70"
                >
                  <option value="PLANTILLA_1">Plantilla 1: Diseño Clásico (Emisor arriba)</option>
                  <option value="PLANTILLA_2">Plantilla 2: Diseño Moderno (Emisor centrado abajo)</option>
                </select>
                <p className="text-[10px] text-zinc-500">Selecciona el diseño del comprobante que se generará en formato PDF.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <input
                type="checkbox"
                id="mostrar_datos_fiscales"
                checked={settings.tickets.mostrar_datos_fiscales}
                onChange={(e) => {
                  setSettings((current) => current ? {
                    ...current,
                    tickets: { ...current.tickets, mostrar_datos_fiscales: e.target.checked }
                  } : null);
                  setMessage(null);
                }}
                className="w-4 h-4 rounded border-white/12 bg-zinc-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-950 accent-blue-500"
              />
              <label htmlFor="mostrar_datos_fiscales" className="text-sm font-medium text-zinc-200 cursor-pointer select-none">
                Incluir datos fiscales de la institución en el ticket (RFC, Código Postal, Régimen Fiscal, etc.)
              </label>
            </div>
          </div>
        )}
      </section>
    </div>
  );
});

function getSeriesMeta(clave: string) {
  switch (clave) {
    case "V": return { icon: ShoppingCart, color: "bg-emerald-500/10 text-emerald-400" };
    case "VC": return { icon: WalletCards, color: "bg-amber-500/10 text-amber-400" };
    case "CU": return { icon: GraduationCap, color: "bg-blue-500/10 text-blue-400" };
    case "QT": return { icon: CalendarDays, color: "bg-purple-500/10 text-purple-400" };
    default: return { icon: HandCoins, color: "bg-cyan-500/10 text-cyan-400" };
  }
}
