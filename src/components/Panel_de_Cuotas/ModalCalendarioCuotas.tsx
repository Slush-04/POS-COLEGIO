import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

interface ModalCalendarioCuotasProps {
  isOpen: boolean;
  onClose: () => void;
  associateName?: string;
  idCliente?: number;
  fechaRegistro?: string;
  anualidad?: string;
}

interface HistorialMes {
  anio: number;
  mes: number;
  estado_pago: string;
}

const MONTHS = [
  "ENE", "FEB", "MAR", "ABR",
  "MAY", "JUN", "JUL", "AGO",
  "SEP", "OCT", "NOV", "DIC"
];



export function ModalCalendarioCuotas({ isOpen, onClose, associateName = "Asociado", idCliente, fechaRegistro, anualidad }: ModalCalendarioCuotasProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [historial, setHistorial] = useState<HistorialMes[]>([]);
  const currentRealYear = new Date().getFullYear();

  // Parsear fecha de registro para saber desde cuándo cobrar
  const regDate = fechaRegistro ? new Date(fechaRegistro) : null;
  const mesRegistro = regDate ? regDate.getMonth() + 1 : 1;
  const anioRegistro = regDate ? regDate.getFullYear() : 2000;

  useEffect(() => {
    if (isOpen && idCliente) {
      fetch(`http://127.0.0.1:8000/api/cuotas/${idCliente}/pendientes`)
        .then(res => res.json())
        .then(() => {
          // Cargar TODAS las cuotas (no solo pendientes) - usamos el endpoint de asociados
          fetch(`http://127.0.0.1:8000/api/cuotas/asociados`)
            .then(res => res.json())
            .then((data: any[]) => {
              const me = data.find((a: any) => a.id_cliente === idCliente);
              if (me) setHistorial(me.historial || []);
            })
            .catch(e => console.error(e));
        })
        .catch(e => console.error(e));
    }
  }, [isOpen, idCliente]);

  const getMonthStatus = (monthIndex: number, year: number): 'PAGADO' | 'EXENTO' | 'PENDIENTE' | 'DESACTIVADO' | 'NEUTRO' => {
    const mes = monthIndex + 1;
    // Meses anteriores a la fecha de registro = DESACTIVADO (gris)
    if (year < anioRegistro || (year === anioRegistro && mes < mesRegistro)) {
      return 'DESACTIVADO';
    }

    if (anualidad === 'PAGADO' && year === currentRealYear) {
      return 'EXENTO';
    }

    // Buscar en historial real
    const cuota = historial.find(h => h.anio === year && h.mes === mes);
    if (cuota) {
      if (cuota.estado_pago === 'EXENTO') return 'EXENTO';
      return cuota.estado_pago === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';
    }
    return 'NEUTRO';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-border-table rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="relative p-6 border-b border-white/10 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <CalendarIcon className="w-5 h-5 text-zinc-400" />
            Calendario de Cuotas
          </h2>
          <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
            {associateName}
            {anualidad === 'PAGADO' && (
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            )}
          </p>
          <button onClick={onClose} className="absolute right-6 top-6 p-2 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* Year Selector */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4 bg-zinc-800/50 border border-white/5 rounded-full px-4 py-2">
              <button
                onClick={() => setCurrentYear(prev => prev - 1)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-lg font-bold text-white font-mono w-16 text-center">{currentYear}</span>
              <button
                onClick={() => setCurrentYear(prev => prev + 1)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-[500px] mx-auto px-4">
            {MONTHS.map((month, idx) => {
              const isPaid = getMonthStatus(idx, currentYear);
              const isDisabled = isPaid === 'DESACTIVADO';
              const isGreen = isPaid === 'PAGADO' || isPaid === 'EXENTO';
              const isRed = isPaid === 'PENDIENTE';

              return (
                <div
                  key={month}
                  className={cn("flex flex-col items-center group cursor-pointer", isDisabled && "opacity-40 grayscale")}
                >
                  <div className={cn(
                    "w-full max-w-[110px] aspect-[4/3] rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300",
                    "bg-zinc-800/40 backdrop-blur-xl", // Glass background
                    "shadow-[-4px_-4px_10px_rgba(255,255,255,0.03),_4px_4px_10px_rgba(0,0,0,0.6)]", // Neumorphic dual shadows
                    isGreen
                      ? "border border-green-500/30"
                      : isRed
                        ? "border border-red-500/30"
                        : "border border-zinc-700/30"
                  )}>
                    {/* Top indicator bar */}
                    <div className={cn(
                      "absolute top-0 inset-x-0 h-1.5",
                      isGreen ? "bg-green-500" : isRed ? "bg-red-500" : "bg-zinc-600"
                    )} />

                    {/* Month Text */}
                    <span className={cn(
                      "text-xl font-bold tracking-widest mt-1",
                      isGreen ? "text-white" : isRed ? "text-red-400" : "text-zinc-500"
                    )}>
                      {month}
                    </span>

                    {/* Status indicator */}
                    <div className={cn(
                      "mt-2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                      isGreen ? "bg-green-500/10 text-green-400"
                        : isRed ? "bg-red-500/10 text-red-400"
                          : "bg-zinc-500/10 text-zinc-500"
                    )}>
                      {isPaid === 'EXENTO' ? "Exento" : isGreen ? "Pagado" : isRed ? "Pendiente" : isDisabled ? "N/A" : "-"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
