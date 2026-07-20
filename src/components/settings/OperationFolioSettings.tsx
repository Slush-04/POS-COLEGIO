import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  HandCoins,
  Loader2,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { generateTicketPdfBlob } from "../../historial/ticketPdf";
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configurar el worker de pdfjs (cargamos de forma local por Vite para evitar CORS y fallas de red)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  plantilla?: "PLANTILLA_1" | "PLANTILLA_2" | "PLANTILLA_3" | "PLANTILLA_4" | "PLANTILLA_5";
  leyenda_legal?: string;
  mensaje_final?: string;
  mostrar_observaciones?: boolean;
  mostrar_rfc_cliente?: boolean;
  mostrar_logo?: boolean;
}

interface OperationSettings {
  series: FolioSeries[];
  tickets: TicketSettings;
}

export interface OperationFolioSettingsHandle {
  discard: () => Promise<void>;
  save: () => Promise<void>;
}

const TEMPLATE_OPTIONS = [
  {
    id: "PLANTILLA_1",
    name: "Plantilla 1: Diseño Clásico",
    description: "Emisor arriba a la derecha, título alineable y diseño tradicional.",
  },
  {
    id: "PLANTILLA_2",
    name: "Plantilla 2: Diseño Moderno",
    description: "Emisor centrado al pie, barra superior de color y sección de logo.",
  },
  {
    id: "PLANTILLA_3",
    name: "Plantilla 3: Diseño Ejecutivo",
    description: "Encabezado compacto con doble línea elegante y distribución limpia.",
  },
  {
    id: "PLANTILLA_4",
    name: "Plantilla 4: Diseño Formal",
    description: "Estilo institucional formal tipo carta con cajas de datos estructuradas.",
  },
  {
    id: "PLANTILLA_5",
    name: "Plantilla 5: Diseño Ticket",
    description: "Formato de comprobante de caja compacto, ideal para tiras térmicas.",
  },
];

const LivePdfPreview = ({
  templateId,
  titleText,
  footerText,
  showFiscal,
  alignmentTitle = "IZQUIERDA",
  alignmentEmitter = "IZQUIERDA",
  leyendaLegal,
  mensajeFinal,
  showObservaciones = true,
  showRfcCliente = true,
  showLogo = true,
  isMiniature = false,
}: {
  templateId: "PLANTILLA_1" | "PLANTILLA_2" | "PLANTILLA_3" | "PLANTILLA_4" | "PLANTILLA_5";
  titleText: string;
  footerText: string;
  showFiscal: boolean;
  alignmentTitle?: "IZQUIERDA" | "CENTRO" | "DERECHA";
  alignmentEmitter?: "IZQUIERDA" | "CENTRO" | "DERECHA";
  leyendaLegal?: string;
  mensajeFinal?: string;
  showObservaciones?: boolean;
  showRfcCliente?: boolean;
  showLogo?: boolean;
  isMiniature?: boolean;
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

    const [fiscalData, setFiscalData] = useState<any>(null);

    useEffect(() => {
      fetch("http://localhost:8000/api/configuracion/fiscal")
        .then(res => res.json())
        .then(data => setFiscalData(data))
        .catch(() => {});
    }, []);

    useEffect(() => {
      const mockTransaction = {
        serieFolio: "V-26070001",
        date: "17/07/2026 15:30",
        client: "Juan Perez Garcia",
        type: "VENTA",
        concept: "Mensualidad de Colegiatura - Julio 2026",
        amount: 2500.00,
        paymentMethod: "Transferencia",
        observation: "Pago de colegiatura mensual regular.",
        status: "COMPLETADO",
        idCliente: 8492,
        rfcCliente: "CACE950412XX3",
      };

      const mockDetail = {
        detalles: [
          {
            descripcion: "Mensualidad de Colegiatura - Julio 2026",
            cantidad: 1,
            precio_unitario: 2500.00,
            descuento: 0,
            iva: 0,
            importe_total: 2500.00,
          }
        ],
        pagos: [
          {
            tipo_movimiento: "PAGO",
            monto_pagado: 2500.00,
            metodo_pago: "Transferencia",
          }
        ]
      };

      const config = {
        fiscal: fiscalData || {
          razon_social: "Colegio San Ignacio A.C.",
          rfc: "CSI990101XX1",
          codigo_postal: "10004",
          regimen_fiscal: "603",
          domicilio_fiscal: "Av. Educacion 123, Col. Centro, Ciudad, Estado.",
          telefono: "+52 (55) 1234-5678",
          correo: "administracion@colegio.edu",
          representante_legal: "Dra. Elena Ramos",
        },
        tickets: {
          titulo_comprobante: titleText || "Comprobante de operacion",
          pie_pagina: footerText || "Documento administrativo generado desde el historial.",
          mostrar_datos_fiscales: showFiscal,
          ubicacion_emisor: "ARRIBA" as const,
          alineacion_emisor: alignmentEmitter || "IZQUIERDA",
          alineacion_titulo: alignmentTitle || "IZQUIERDA",
          plantilla: templateId,
          leyenda_legal: leyendaLegal || "Este documento es una nota de venta / comprobante administrativo. No es un CFDI. Para efectos fiscales, solicite su factura correspondiente.",
          mensaje_final: mensajeFinal || "Gracias por su compra. Conserve este comprobante para cualquier aclaración.",
          mostrar_observaciones: showObservaciones,
          mostrar_rfc_cliente: showRfcCliente,
          mostrar_logo: showLogo,
        }
      };

      try {
        const blob = generateTicketPdfBlob(mockTransaction, mockDetail, config);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfBlob(blob);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error("Error generating PDF preview:", err);
      }
    }, [templateId, titleText, footerText, showFiscal, alignmentTitle, alignmentEmitter, leyendaLegal, mensajeFinal, showObservaciones, showRfcCliente, showLogo, fiscalData]);

  useEffect(() => {
    if (!isMiniature || !pdfBlob || !canvasRef.current) return;

    let renderTask: pdfjsLib.RenderTask | null = null;
    let isMounted = true;

    const renderPdf = async () => {
      try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        if (!isMounted) return;

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        if (!isMounted) return;
        const page = await pdf.getPage(1);
        if (!isMounted) return;
        
        // Aumentamos la resolución nativa para nitidez al reducir (CSS Scale)
        const viewport = page.getViewport({ scale: 2.0 }); 
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvas: canvas,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error("Error rendering PDF to canvas:", err);
        }
      }
    };

    renderPdf();

    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfBlob, isMiniature]);

  if (!pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950/20 text-zinc-400 text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Generando vista previa...
      </div>
    );
  }

  if (isMiniature) {
    return (
      <div className="w-full h-full bg-white flex justify-center overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-auto object-contain origin-top" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        className="w-full h-full border-0 select-none bg-white"
        title={`PDF Preview ${templateId}`}
      />
    </div>
  );
};

export const OperationFolioSettings = forwardRef<OperationFolioSettingsHandle>(function OperationFolioSettings(_, ref) {
  const [settings, setSettings] = useState<OperationSettings | null>(null);
  const [selectedKey, setSelectedKey] = useState("V");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [modalTemplateId, setModalTemplateId] = useState<"PLANTILLA_1" | "PLANTILLA_2" | "PLANTILLA_3" | "PLANTILLA_4" | "PLANTILLA_5" | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const lastWheelTime = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHovered) return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCarouselIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCarouselIndex((prev) => Math.min(TEMPLATE_OPTIONS.length - (isDesktop ? 2 : 1), prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHovered, isDesktop]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) > 5) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current > 350) {
        lastWheelTime.current = now;
        if (e.deltaX > 0) {
          setCarouselIndex((prev) => Math.min(TEMPLATE_OPTIONS.length - (isDesktop ? 2 : 1), prev + 1));
        } else {
          setCarouselIndex((prev) => Math.max(0, prev - 1));
        }
      }
    }
  };

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Leyenda Legal</label>
                <textarea
                  rows={2}
                  value={settings.tickets.leyenda_legal ?? "Este documento es una nota de venta / comprobante administrativo. No es un CFDI. Para efectos fiscales, solicite su factura correspondiente."}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, leyenda_legal: e.target.value }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-full px-3 py-2 bg-black/35 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-400/70 resize-none"
                  placeholder="Escribe la leyenda legal del comprobante..."
                />
                <p className="text-[10px] text-zinc-500">Leyenda legal aclaratoria para notas de venta no fiscales.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Mensaje Final Configurable</label>
                <textarea
                  rows={2}
                  value={settings.tickets.mensaje_final ?? "Gracias por su compra. Conserve este comprobante para cualquier aclaración."}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, mensaje_final: e.target.value }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-full px-3 py-2 bg-black/35 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-400/70 resize-none"
                  placeholder="Escribe el mensaje final..."
                />
                <p className="text-[10px] text-zinc-500">Mensaje personalizado de agradecimiento o políticas de devolución.</p>
              </div>
            </div>

            {/* Selector de Plantillas Visual con Carrusel */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-zinc-300">Plantilla del Ticket PDF</label>
                <p className="text-[10px] text-zinc-500 mt-0.5">Haz clic en una plantilla para seleccionarla. Los cambios se previsualizan en tiempo real.</p>
              </div>
              
              {/* Carrusel con Botones a los Costados */}
              <div 
                className="relative px-12"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Botón Izquierda */}
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
                  disabled={carouselIndex === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-10 active:scale-95"
                  aria-label="Plantilla anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Viewport del Carrusel */}
                <div 
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-black/15 p-4"
                  onWheel={handleWheel}
                >
                  <div
                    className="flex w-full transition-transform duration-500 ease-in-out -mx-2"
                    style={{
                      transform: `translateX(-${carouselIndex * (isDesktop ? 50 : 100)}%)`,
                    }}
                  >
                    {TEMPLATE_OPTIONS.map((option) => {
                      const isSelected = (settings.tickets.plantilla || "PLANTILLA_1") === option.id;
                      return (
                        <div
                          key={option.id}
                          className="w-full md:w-1/2 flex-shrink-0 px-2"
                        >
                          <div
                            onClick={() => {
                              setSettings((current) => current ? {
                                ...current,
                                tickets: { ...current.tickets, plantilla: option.id as any }
                              } : null);
                              setMessage(null);
                            }}
                            className={`group cursor-pointer rounded-xl border p-4 bg-zinc-900/40 backdrop-blur-sm transition-all duration-300 flex flex-col gap-4 items-stretch h-full ${
                              isSelected
                                ? "border-blue-500/60 bg-blue-500/[0.04] shadow-[0_0_15px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/30"
                                : "border-white/5 hover:border-white/20 hover:bg-white/[0.02]"
                            }`}
                          >
                            {/* Lienzo de previsualización en vivo (Escalado por CSS para evitar desbordamiento) */}
                            <div className="w-[160px] h-[207px] flex-shrink-0 relative bg-zinc-950/40 rounded-lg overflow-hidden border border-white/5 shadow-inner group-hover:border-white/10 transition-colors mx-auto">
                              <div className="absolute top-0 left-0 w-[480px] h-[620px] origin-top-left scale-[0.333]">
                                <LivePdfPreview
                                  templateId={option.id as any}
                                  titleText={settings.tickets.titulo_comprobante}
                                  footerText={settings.tickets.pie_pagina}
                                  showFiscal={settings.tickets.mostrar_datos_fiscales}
                                  alignmentTitle={settings.tickets.alineacion_titulo || "IZQUIERDA"}
                                  alignmentEmitter={settings.tickets.alineacion_emisor || "IZQUIERDA"}
                                  leyendaLegal={settings.tickets.leyenda_legal}
                                  mensajeFinal={settings.tickets.mensaje_final}
                                  showObservaciones={settings.tickets.mostrar_observaciones ?? true}
                                  showRfcCliente={settings.tickets.mostrar_rfc_cliente ?? true}
                                  showLogo={settings.tickets.mostrar_logo ?? true}
                                  isMiniature={true}
                                />
                              </div>
                              
                              {/* Overlay de hover para Previsualizar */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                                  Zoom Previsualizar
                                </span>
                              </div>
                            </div>
                            
                            {/* Metadatos y descripción */}
                            <div className="flex flex-col justify-between space-y-4 flex-grow">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    isSelected
                                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                      : "bg-zinc-800 text-zinc-400"
                                  }`}>
                                    {option.id.replace("PLANTILLA_", "Plantilla ")}
                                  </span>
                                  {isSelected && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                      <Check className="w-3.5 h-3.5" /> Activa
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-white text-sm tracking-wide">{option.name.split(": ")[1] || option.name}</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed font-light">{option.description}</p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalTemplateId(option.id as any);
                                    setPreviewModalOpen(true);
                                  }}
                                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-white/[0.04] text-zinc-300 border border-white/10 hover:bg-white/[0.08] hover:text-white transition-all text-center"
                                >
                                  Previsualizar
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSettings((current) => current ? {
                                      ...current,
                                      tickets: { ...current.tickets, plantilla: option.id as any }
                                    } : null);
                                    setMessage(null);
                                  }}
                                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                                    isSelected
                                      ? "bg-blue-500 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:bg-blue-600"
                                      : "bg-transparent text-zinc-400 border-white/5 hover:border-white/10 hover:text-white"
                                  }`}
                                >
                                  {isSelected ? "Seleccionada" : "Seleccionar"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botón Derecha */}
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => Math.min(TEMPLATE_OPTIONS.length - (isDesktop ? 2 : 1), prev + 1))}
                  disabled={carouselIndex >= TEMPLATE_OPTIONS.length - (isDesktop ? 2 : 1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-10 active:scale-95"
                  aria-label="Siguiente plantilla"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              {/* Barra de Progreso y Leyenda Informativa */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                  {isDesktop 
                    ? `Plantillas ${carouselIndex + 1} - ${carouselIndex + 2} de ${TEMPLATE_OPTIONS.length}`
                    : `Plantilla ${carouselIndex + 1} de ${TEMPLATE_OPTIONS.length}`
                  }
                </span>
                <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{
                      width: `${((carouselIndex + (isDesktop ? 2 : 1)) / TEMPLATE_OPTIONS.length) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label htmlFor="mostrar_datos_fiscales" className="text-xs font-medium text-zinc-200 cursor-pointer select-none">
                  Incluir datos fiscales de la institución
                </label>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="mostrar_logo"
                  checked={settings.tickets.mostrar_logo ?? true}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, mostrar_logo: e.target.checked }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-4 h-4 rounded border-white/12 bg-zinc-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-950 accent-blue-500"
                />
                <label htmlFor="mostrar_logo" className="text-xs font-medium text-zinc-200 cursor-pointer select-none">
                  Mostrar logotipo institucional en el encabezado
                </label>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="mostrar_rfc_cliente"
                  checked={settings.tickets.mostrar_rfc_cliente ?? true}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, mostrar_rfc_cliente: e.target.checked }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-4 h-4 rounded border-white/12 bg-zinc-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-950 accent-blue-500"
                />
                <label htmlFor="mostrar_rfc_cliente" className="text-xs font-medium text-zinc-200 cursor-pointer select-none">
                  Mostrar RFC del cliente
                </label>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="mostrar_observaciones"
                  checked={settings.tickets.mostrar_observaciones ?? true}
                  onChange={(e) => {
                    setSettings((current) => current ? {
                      ...current,
                      tickets: { ...current.tickets, mostrar_observaciones: e.target.checked }
                    } : null);
                    setMessage(null);
                  }}
                  className="w-4 h-4 rounded border-white/12 bg-zinc-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-950 accent-blue-500"
                />
                <label htmlFor="mostrar_observaciones" className="text-xs font-medium text-zinc-200 cursor-pointer select-none">
                  Mostrar sección de observaciones
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modal de Previsualización en Tamaño Real */}
      {previewModalOpen && modalTemplateId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl max-w-xl w-full shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h3 className="font-bold text-white text-base">Vista Previa Interactiva</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {TEMPLATE_OPTIONS.find((t) => t.id === modalTemplateId)?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="text-zinc-400 hover:text-white hover:bg-white/[0.08] p-1.5 rounded-lg transition-all"
                aria-label="Cerrar modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Cuerpo del modal (Ticket en tamaño real) */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-zinc-950/20">
              <div className="w-[480px] h-[620px] shadow-2xl rounded-lg overflow-hidden border border-slate-200 bg-white">
                {modalTemplateId && (
                  <LivePdfPreview
                    templateId={modalTemplateId}
                    titleText={settings?.tickets.titulo_comprobante || ""}
                    footerText={settings?.tickets.pie_pagina || ""}
                    showFiscal={settings?.tickets.mostrar_datos_fiscales || false}
                    alignmentTitle={settings?.tickets.alineacion_titulo || "IZQUIERDA"}
                    alignmentEmitter={settings?.tickets.alineacion_emisor || "IZQUIERDA"}
                    leyendaLegal={settings?.tickets.leyenda_legal}
                    mensajeFinal={settings?.tickets.mensaje_final}
                    showObservaciones={settings?.tickets.mostrar_observaciones ?? true}
                    showRfcCliente={settings?.tickets.mostrar_rfc_cliente ?? true}
                    showLogo={settings?.tickets.mostrar_logo ?? true}
                    isMiniature={false}
                  />
                )}
              </div>
            </div>
            
            {/* Pie del modal */}
            <div className="px-6 py-4 border-t border-white/5 bg-[#1f1f23] flex items-center justify-between gap-3">
              <span className="text-[10px] text-zinc-400">
                {settings?.tickets.plantilla === modalTemplateId ? "✓ Plantilla seleccionada" : ""}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.04] text-zinc-300 border border-white/10 hover:bg-white/[0.08] hover:text-white rounded-lg text-xs font-semibold tracking-wide transition-all"
                >
                  Cerrar
                </button>
                {settings?.tickets.plantilla !== modalTemplateId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettings((current) => current ? {
                        ...current,
                        tickets: { ...current.tickets, plantilla: modalTemplateId }
                      } : null);
                      setMessage(null);
                      setPreviewModalOpen(false);
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold tracking-wide transition-all border border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.25)]"
                  >
                    Usar esta Plantilla
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
