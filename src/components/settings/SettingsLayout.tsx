import { ReactNode } from "react";
import { BookOpen, Building2, Mail, Package, Palette, Receipt } from "lucide-react";

export type SettingsTab = "fiscal" | "operation" | "catalogs" | "notifications" | "inventory";

interface SettingsLayoutProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  children: ReactNode;
  actions?: ReactNode;
}

const tabs = [
  { id: "fiscal" as const, label: "Datos Fiscales", icon: Building2 },
  { id: "operation" as const, label: "Operación y Folios", icon: Receipt },
  { id: "catalogs" as const, label: "Catálogos de Clientes", icon: BookOpen },
  { id: "notifications" as const, label: "Notificaciones", icon: Mail },
  { id: "inventory" as const, label: "Catálogo / Inventario", icon: Package },
];

export function SettingsLayout({ activeTab, onTabChange, children, actions }: SettingsLayoutProps) {
  return (
    <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-8 flex-shrink-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Configuración del Sistema</h1>
          <p className="text-zinc-400 mt-1">Personaliza la apariencia, detalles institucionales y parámetros operativos.</p>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        <nav className="w-full lg:w-64 flex flex-col gap-1 flex-shrink-0" aria-label="Secciones de configuración">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === id ? "bg-zinc-900/80 text-white border border-white/10 shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"}`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
