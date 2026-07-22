import { useState, useEffect } from "react";
import { Clock3, LayoutDashboard, MonitorSmartphone, ReceiptText, CalendarDays, Users, Settings, Landmark, CreditCard } from "lucide-react";

interface TopbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Topbar({ currentView, onNavigate }: TopbarProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/configuracion/tickets")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { id: "dashboard", label: "Panel", icon: LayoutDashboard },
    { id: "pos", label: "Punto de Venta", icon: MonitorSmartphone },
    { id: "ar", label: "Cuentas por Cobrar", icon: ReceiptText },
    { id: "courses", label: "Cursos/Eventos", icon: CalendarDays },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "cuotas", label: "Cuotas", icon: CreditCard },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  return (
    <header className="h-[72px] bg-zinc-950/95 border-b border-white/10 flex items-center justify-between px-5 lg:px-8 flex-shrink-0 gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3.5 flex-shrink-0">
        {logoUrl ? (
          <div className="h-[43px] max-w-[173px] bg-white rounded-lg p-1 flex items-center justify-center">
            <img src={logoUrl} alt="Logo" className="h-full w-auto object-contain" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Landmark className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="font-bold text-base tracking-tight text-white leading-tight">SI.CCO</h1>
          <p className="hidden xl:block text-[10px] uppercase tracking-[0.16em] text-zinc-500 mt-0.5">Gestión administrativa</p>
        </div>
      </div>

      {/* Horizontal Navigation Menu */}
      <nav aria-label="Navegación principal" className="flex min-w-0 items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/70 p-1.5 overflow-x-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border border-transparent whitespace-nowrap ${isActive
                ? "bg-blue-500/15 text-blue-300 border-blue-500/20 shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Acciones */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => onNavigate("transactions")}
          aria-label="Abrir historial de transacciones"
          title="Historial de transacciones"
          className={`p-2.5 rounded-xl border transition-all ${currentView === "transactions"
            ? "border-blue-500/30 bg-blue-500/15 text-blue-300"
            : "border-transparent text-zinc-400 hover:bg-white/5 hover:border-white/10 hover:text-white"
            }`}
        >
          <Clock3 className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-white/10 ring-2 ring-zinc-900">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}

