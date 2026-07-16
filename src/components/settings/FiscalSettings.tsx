import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export interface FiscalSettingsHandle {
  discard: () => Promise<void>;
  save: () => Promise<void>;
}

interface FiscalData {
  razon_social: string;
  rfc: string;
  codigo_postal: string;
  regimen_fiscal: string;
  domicilio_fiscal: string;
  telefono: string;
  correo: string;
  representante_legal: string;
}

export const FiscalSettings = forwardRef<FiscalSettingsHandle>(function FiscalSettings(_, ref) {
  const [data, setData] = useState<FiscalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("http://localhost:8000/api/configuracion/fiscal");
      if (!response.ok) throw new Error("No se pudo cargar la configuración fiscal.");
      const resData = await response.json() as FiscalData;
      setData(resData);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Error al cargar datos fiscales." });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!data || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("http://localhost:8000/api/configuracion/fiscal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resJson.detail || "No se pudo guardar la configuración fiscal.");
      setMessage({ type: "success", text: "Configuración fiscal guardada correctamente." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Error al guardar datos fiscales." });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  useImperativeHandle(ref, () => ({
    discard: fetchSettings,
    save: saveSettings,
  }));

  const handleChange = (field: keyof FiscalData, value: string) => {
    setData((current) => current ? { ...current, [field]: value } : null);
    setMessage(null);
  };

  const inputClass = "w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors";

  if (loading && !data) {
    return (
      <div className="h-64 flex items-center justify-center rounded-custom border border-border-table bg-zinc-900/30 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-400" />
        Cargando datos fiscales...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}
        </div>
      )}

      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-6">Datos de Facturación</h2>
        <div className="space-y-4">
          <Field label="Razón Social">
            <input
              type="text"
              value={data.razon_social}
              onChange={(e) => handleChange("razon_social", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="RFC">
              <input
                type="text"
                value={data.rfc}
                onChange={(e) => handleChange("rfc", e.target.value.toUpperCase())}
                className={`${inputClass} font-mono uppercase`}
                maxLength={13}
              />
            </Field>
            <Field label="Código Postal">
              <input
                type="text"
                value={data.codigo_postal}
                onChange={(e) => handleChange("codigo_postal", e.target.value.replace(/\D/g, ""))}
                className={`${inputClass} font-mono`}
                maxLength={5}
              />
            </Field>
          </div>
          <Field label="Régimen Fiscal">
            <select
              value={data.regimen_fiscal}
              onChange={(e) => handleChange("regimen_fiscal", e.target.value)}
              className={`${inputClass} appearance-none`}
            >
              <option value="601">601 - General de Ley Personas Morales</option>
              <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-6">Datos de Contacto y Representante</h2>
        <div className="space-y-4">
          <Field label="Domicilio Fiscal">
            <textarea
              rows={2}
              value={data.domicilio_fiscal}
              onChange={(e) => handleChange("domicilio_fiscal", e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Teléfono">
              <input
                type="text"
                value={data.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Correo Institucional">
              <input
                type="email"
                value={data.correo}
                onChange={(e) => handleChange("correo", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Representante Legal">
            <input
              type="text"
              value={data.representante_legal}
              onChange={(e) => handleChange("representante_legal", e.target.value)}
              className={inputClass}
            />
          </Field>
          <p className="text-[10px] text-zinc-500">Este nombre aparecerá en reportes y firmas automatizadas.</p>
        </div>
      </section>
    </div>
  );
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
