import { useState, type ChangeEvent } from "react";
import { X, UploadCloud, Download, AlertCircle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface ModalImportarExcelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  curso: any;
}

export function ModalImportarExcel({ isOpen, onClose, onSuccess, curso }: ModalImportarExcelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDescargarFormato = () => {
    // Generar formato vacío
    const data = [
      { Nombre: "", RFC: "", Telefono: "", Correo: "", "Tipo Tarifa": "general" },
      { Nombre: "Ejemplo: Juan Perez", RFC: "XAXX010101000", Telefono: "5551234567", Correo: "juan@ejemplo.com", "Tipo Tarifa": "asociado" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar ancho de columnas
    const wscols = [
      { wch: 30 }, // Nombre
      { wch: 20 }, // RFC
      { wch: 15 }, // Telefono
      { wch: 25 }, // Correo
      { wch: 15 }  // Tipo Tarifa
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participantes");
    XLSX.writeFile(wb, "Formato_Importacion_Curso.xlsx");
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const mappedData = data.map((row: any) => {
        const nombre = row["Nombre"] || row["nombre"] || "";
        const rfc = row["RFC"] || row["rfc"] || "";
        const telefono = row["Telefono"] || row["Teléfono"] || row["telefono"] || "";
        
        let tarifaStr = (row["Tipo Tarifa"] || row["tarifa"] || "general").toString().toLowerCase();
        let tipoTarifa = "general";
        if (tarifaStr.includes("asociado externo")) tipoTarifa = "asociado_externo";
        else if (tarifaStr.includes("asociado")) tipoTarifa = "asociado";
        else if (tarifaStr.includes("estudiante")) tipoTarifa = "estudiante";
        else if (tarifaStr.includes("colaborador")) tipoTarifa = "colaborador";

        let estadoPago = "PENDIENTE";

        let montoTotal = curso?.precio_general || 0;
        switch (tipoTarifa) {
          case "asociado": montoTotal = curso?.precio_asociado || 0; break;
          case "asociado_externo": montoTotal = curso?.precio_asociado_externo || 0; break;
          case "estudiante": montoTotal = curso?.precio_estudiante || 0; break;
          case "colaborador": montoTotal = curso?.precio_colaborador || 0; break;
        }

        return { nombre, rfc, telefono, tipo_tarifa: tipoTarifa, monto_total: montoTotal, estado_pago: estadoPago };
      }).filter(r => r.nombre !== "" && !r.nombre.includes("Ejemplo:"));
      
      setParsedData(mappedData);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleImportar = async () => {
    if (parsedData.length === 0 || !curso) return;
    setIsProcessing(true);

    const payload = {
      inscripciones: parsedData.map(d => ({
        id_cliente: null,
        nombre: d.nombre,
        rfc: d.rfc,
        telefono: d.telefono,
        tipo_tarifa: d.tipo_tarifa,
        monto_total: d.monto_total,
        saldo_pendiente: d.estado_pago === "PENDIENTE" ? d.monto_total : 0,
        estado_pago: d.estado_pago,
        facturado: 0
      }))
    };

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cursos/${curso.id_curso}/inscripciones/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        alert("Error al importar: " + err.detail);
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-border-table rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between p-6 border-b border-border-table bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Importar Participantes (Excel)</h2>
            <p className="text-sm text-zinc-400 mt-1">Carga masiva para <span className="text-primary font-medium">{curso?.nombre}</span></p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-400">Instrucciones de Importación</p>
              <p className="text-xs text-blue-300/80 mt-1">
                Asegúrate de que las columnas de tu Excel coincidan con las del formato oficial. Puedes omitir columnas que no sean obligatorias (como Teléfono). El sistema inferirá el precio correcto basándose en la tarifa.
              </p>
              <button 
                onClick={handleDescargarFormato}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-bold rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar Formato de Ejemplo
              </button>
            </div>
          </div>

          <div className="border-2 border-dashed border-border-table rounded-xl p-8 flex flex-col items-center justify-center bg-zinc-900/30 hover:bg-zinc-800/30 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-zinc-500 mb-4" />
            <p className="text-sm text-zinc-400 font-medium mb-1">Arrastra tu archivo Excel aquí o</p>
            <label className="cursor-pointer">
              <span className="text-primary hover:text-primary-hover font-bold text-sm underline transition-colors">Selecciona un archivo</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
            </label>
            {file && <p className="mt-4 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20">Archivo cargado: {file.name}</p>}
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex justify-between">
                Vista Previa de Datos
                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded text-xs">{parsedData.length} participantes detectados</span>
              </h3>
              <div className="bg-zinc-900/50 border border-border-table rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">RFC</th>
                      <th className="px-4 py-3 text-center">Tarifa (Inferida)</th>
                      <th className="px-4 py-3 text-right">Monto a Cobrar</th>
                      <th className="px-4 py-3 text-center">Estado Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-table">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{row.nombre}</td>
                        <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{row.rfc || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-zinc-800 text-zinc-300 border border-border-table px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                            {row.tipo_tarifa.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-mono">${row.monto_total}</td>
                        <td className="px-4 py-3 text-center">
                          {row.estado_pago === 'PENDIENTE' ? (
                            <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">PENDIENTE</span>
                          ) : (
                            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">PAGADO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-center text-xs text-zinc-500 italic mt-2">Mostrando los primeros 10 registros. Se importarán los {parsedData.length}.</p>
              )}
            </div>
          )}

        </div>

        <div className="p-6 border-t border-border-table flex justify-end gap-3 bg-zinc-900/50 mt-auto">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleImportar}
            disabled={parsedData.length === 0 || isProcessing}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2"
          >
            {isProcessing ? "Procesando..." : `Importar ${parsedData.length} Participantes`}
          </button>
        </div>

      </div>
    </div>
  );
}
