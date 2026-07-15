import type { ReactNode } from "react";

export function FiscalSettings() {
  const inputClass = "w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors";
  return (
    <div className="space-y-6 max-w-3xl">
      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-6">Datos de Facturación</h2>
        <div className="space-y-4">
          <Field label="Razón Social"><input type="text" defaultValue="Colegio San Ignacio A.C." className={inputClass} /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="RFC"><input type="text" defaultValue="CSI990101XX1" className={`${inputClass} font-mono uppercase`} /></Field>
            <Field label="Código Postal"><input type="text" defaultValue="10004" className={`${inputClass} font-mono`} /></Field>
          </div>
          <Field label="Régimen Fiscal">
            <select defaultValue="603" className={`${inputClass} appearance-none`}>
              <option value="601">601 - General de Ley Personas Morales</option>
              <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-6">Datos de Contacto y Representante</h2>
        <div className="space-y-4">
          <Field label="Domicilio Fiscal"><textarea rows={2} defaultValue="Av. Educación 123, Col. Centro, Ciudad, Estado." className={`${inputClass} resize-none`} /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Teléfono"><input type="text" defaultValue="+52 (55) 1234-5678" className={`${inputClass} font-mono`} /></Field>
            <Field label="Correo Institucional"><input type="email" defaultValue="administracion@colegio.edu" className={inputClass} /></Field>
          </div>
          <Field label="Representante Legal"><input type="text" defaultValue="Dra. Elena Ramos" className={inputClass} /></Field>
          <p className="text-[10px] text-zinc-500">Este nombre aparecerá en reportes y firmas automatizadas.</p>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-zinc-300">{label}</span>{children}</label>;
}
