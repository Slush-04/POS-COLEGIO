import type { ReactNode } from "react";

export function NotificationSettings() {
  const inputClass = "w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white";
  return (
    <div className="space-y-6 max-w-3xl">
      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-2">Configuración de Correo (SMTP)</h2>
        <p className="text-sm text-zinc-400 mb-6">Requerido para el envío automático de estados de cuenta y recibos a clientes.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Servidor SMTP (Host)"><input type="text" defaultValue="smtp.office365.com" className={`${inputClass} font-mono`} /></Field>
          <Field label="Puerto"><input type="text" defaultValue="587" className={`${inputClass} font-mono`} /></Field>
          <Field label="Usuario / Correo Remitente"><input type="text" defaultValue="notificaciones@colegio.edu" className={inputClass} /></Field>
          <Field label="Contraseña de Aplicación"><input type="password" defaultValue="********" className={`${inputClass} font-mono`} /></Field>
        </div>
        <div className="mt-4 flex justify-end"><button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold">Probar Conexión</button></div>
      </section>

      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-6">Gestión de Cajas y Seguridad</h2>
        <div className="flex items-center justify-between gap-4 p-4 bg-zinc-900/50 border border-border-table rounded-md">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">Corte de Caja Ciego</h3>
            <p className="text-xs text-zinc-400">Exigir que el cajero declare el efectivo antes de mostrar los totales al cerrar el turno.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
          </label>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-zinc-300">{label}</span>{children}</label>;
}
