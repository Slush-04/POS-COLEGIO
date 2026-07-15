import { Image as ImageIcon, Palette, UploadCloud } from "lucide-react";

export function IdentitySettings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-zinc-400" />
          Logotipo Institucional
        </h2>
        <div className="border-2 border-dashed border-border-table rounded-lg p-10 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors cursor-pointer group">
          <UploadCloud className="w-12 h-12 text-zinc-500 mb-4 group-hover:text-blue-400 transition-colors" />
          <p className="text-sm font-medium text-white mb-1">Arrastra y suelta tu logotipo aquí</p>
          <p className="text-xs text-zinc-500 mb-4">SVG, PNG, JPG (Max 2MB)</p>
          <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded shadow-sm hover:bg-zinc-200 transition-colors">Examinar Archivos</button>
        </div>
      </section>

      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-zinc-400" />
          Paleta de Colores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ColorField label="Color Primario" value="#3b82f6" swatch="bg-[#3b82f6]" help="Usado para botones principales y acentos." />
          <ColorField label="Color Secundario" value="#171717" swatch="bg-[#171717]" help="Usado para fondos de sidebar y tarjetas." />
        </div>
      </section>
    </div>
  );
}

function ColorField({ label, value, swatch, help }: { label: string; value: string; swatch: string; help: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded border border-border-table flex-shrink-0 ${swatch}`} />
        <input type="text" defaultValue={value} className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 font-mono" />
      </div>
      <p className="text-[10px] text-zinc-500">{help}</p>
    </div>
  );
}
