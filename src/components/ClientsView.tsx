import React, { useState, useEffect, useRef } from "react";
import { Search, Filter, Download, UserPlus, Plus, X, FileSpreadsheet, UploadCloud, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { Paginacion } from "./ui/Paginacion";
import { PAGINATION_CONFIG } from "./ui/configuracion";

const clientsData = [
  {
    id: 1,
    name: "Instituto Tecnológico de Innovación",
    contact: "Carlos Mendoza • c.men...",
    rfc: "ITI991201XX1",
    rfcBadge: "G03",
    activity: "Inv #4092 - $1,250.00",
    activityDate: "Hace 2 días"
  },
  {
    id: 2,
    name: "Elena Rodriguez",
    contact: "555-019-2834 • elena.r...",
    rfc: "No RFC",
    rfcBadge: "S01",
    activity: "Course Reg: Q3 Advanced",
    activityDate: "Hace 1 semana",
    rfcMuted: true
  },
  {
    id: 3,
    name: "Sistemas Corporativos SA de CV",
    contact: "Admin Dept • admin@sis...",
    rfc: "SC0050812A12",
    rfcBadge: "G03",
    activity: "Inv #4088 - $8,400.00",
    activityDate: "Hace 2 semanas"
  },
  {
    id: 4,
    name: "David Chen",
    contact: "Student • d.chen@stude...",
    rfc: "CEHD990412HDF",
    rfcBadge: "D10",
    activity: "Tuition Payment Q2",
    activityDate: "Hace 1 mes"
  }
];

interface Client {
  id_cliente: number;
  nombre: string;
  telefono: string;
  correo: string;
  razon_social: string;
  rfc: string;
  curp: string;
  regimen_fiscal: string;
  uso_cfdi: string;
  tipo_cliente: string;
  genero: string;
  fecha_nacimiento: string;
  estatus_operativo?: string;
  sector?: string;
}

export function ClientsView() {
  // 1. CONTROL DE ESTADO (Memoria temporal del formulario)
  const estadoInicial = {
    nombre: "",
    curp: "",
    tipo_cliente: "",
    genero: "",
    fecha_nacimiento: "",
    telefono: "",
    correo: "",
    razon_social: "",
    rfc: "",
    codigo_postal: "",
    regimen_fiscal: "",
    uso_cfdi: "",
    estatus_operativo: "Activo",
    sector: "Normal"
  };

  const [formData, setFormData] = useState(estadoInicial);

  // --- NUEVO: Control de la tabla de clientes ---
  const [listaClientes, setListaClientes] = useState<Client[]>([]);
  const [sectores, setSectores] = useState<Array<{ id: number; nombre: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [clientesAImportar, setClientesAImportar] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<any>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Client | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(PAGINATION_CONFIG.defaultLimit);
  const [ordenAlfabetico, setOrdenAlfabetico] = useState<"asc" | "desc" | null>(null);
  const [filtroTipoCliente, setFiltroTipoCliente] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (clienteSeleccionado) {
      setFormData({
        nombre: clienteSeleccionado.nombre || "",
        curp: clienteSeleccionado.curp || "",
        tipo_cliente: clienteSeleccionado.tipo_cliente || "",
        genero: clienteSeleccionado.genero || "",
        fecha_nacimiento: clienteSeleccionado.fecha_nacimiento || "",
        telefono: clienteSeleccionado.telefono || "",
        correo: clienteSeleccionado.correo || "",
        razon_social: clienteSeleccionado.razon_social || "",
        rfc: clienteSeleccionado.rfc || "",
        codigo_postal: "",
        regimen_fiscal: clienteSeleccionado.regimen_fiscal || "",
        uso_cfdi: clienteSeleccionado.uso_cfdi || "G03",
        estatus_operativo: clienteSeleccionado.estatus_operativo || "Activo",
        sector: clienteSeleccionado.sector || "Normal"
      });
    } else {
      setFormData(estadoInicial);
    }
  }, [clienteSeleccionado]);

  // Generar y descargar la plantilla modelo de Excel
  const descargarPlantillaExcel = () => {
    const dataEjemplo = [
      {
        "Nombre": "Juan Pérez García",
        "Correo": "juan.perez@ejemplo.com",
        "Telefono": "5551234567",
        "Tipo Cliente": "estudiante",
        "RFC": "PEGJ900101XX1",
        "CURP": "PEGJ900101HDFRR01",
        "Razon Social": "Juan Pérez García",
        "Genero": "Masculino",
        "Fecha Nacimiento": "1990-05-15",
        "Regimen Fiscal": "616",
        "Uso CFDI": "D10",
        "Estatus Operativo": "Activo",
        "Sector": "Normal"
      },
      {
        "Nombre": "María López Fernández",
        "Correo": "maria.lopez@ejemplo.com",
        "Telefono": "5559876543",
        "Tipo Cliente": "asociado",
        "RFC": "LOFM850412YY2",
        "CURP": "",
        "Razon Social": "",
        "Genero": "Femenino",
        "Fecha Nacimiento": "1985-04-12",
        "Regimen Fiscal": "605",
        "Uso CFDI": "G03",
        "Estatus Operativo": "Activo",
        "Sector": "Normal"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(dataEjemplo);
    ws['!cols'] = [
      { wch: 26 }, // Nombre
      { wch: 26 }, // Correo
      { wch: 15 }, // Telefono
      { wch: 18 }, // Tipo Cliente
      { wch: 16 }, // RFC
      { wch: 22 }, // CURP
      { wch: 26 }, // Razon Social
      { wch: 12 }, // Genero
      { wch: 16 }, // Fecha Nacimiento
      { wch: 16 }, // Regimen Fiscal
      { wch: 12 }, // Uso CFDI
      { wch: 18 }, // Estatus Operativo
      { wch: 14 }  // Sector
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "plantilla_importacion_clientes.xlsx");
  };

  // Leer y procesar archivo cargado por el usuario
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResultadoImportacion(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);

        const parsedRows = rawData.map((row: any, idx: number) => {
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(
                (rk) => rk.trim().toLowerCase() === k.toLowerCase()
              );
              if (foundKey !== undefined && row[foundKey] !== null && row[foundKey] !== undefined) {
                return String(row[foundKey]).trim();
              }
            }
            return "";
          };

          return {
            rowNum: idx + 2,
            nombre: getVal(["Nombre", "nombre", "Nombre Completo", "Cliente"]),
            correo: getVal(["Correo", "correo", "Email", "Correo Electrónico"]),
            telefono: getVal(["Telefono", "telefono", "Teléfono", "Celular"]),
            tipo_cliente: getVal(["Tipo Cliente", "tipo_cliente", "Tipo de Cliente", "Tipo"]) || "publico general",
            rfc: getVal(["RFC", "rfc"]),
            curp: getVal(["CURP", "curp"]),
            razon_social: getVal(["Razon Social", "razon_social", "Razón Social"]),
            genero: getVal(["Genero", "genero", "Género"]),
            fecha_nacimiento: getVal(["Fecha Nacimiento", "fecha_nacimiento", "Fecha de Nacimiento"]),
            regimen_fiscal: getVal(["Regimen Fiscal", "regimen_fiscal", "Régimen Fiscal"]),
            uso_cfdi: getVal(["Uso CFDI", "uso_cfdi", "Uso de CFDI"]) || "G03",
            estatus_operativo: getVal(["Estatus Operativo", "estatus_operativo", "Estatus"]) || "Activo",
            sector: getVal(["Sector", "sector"]) || "Normal"
          };
        });

        setClientesAImportar(parsedRows);
      } catch (error) {
        alert("Error al leer el archivo de Excel. Verifica que sea un formato .xlsx, .xls o .csv válido.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const ejecutarImportacion = async () => {
    if (clientesAImportar.length === 0) return;
    setImportando(true);
    setResultadoImportacion(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/clientes/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientesAImportar.map(({ rowNum, ...rest }) => rest))
      });

      const datos = await res.json();
      if (res.ok) {
        setResultadoImportacion(datos);
        setClientesAImportar([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        cargarClientes();
      } else {
        alert("❌ Error al importar: " + (datos.detail || "Consulte logs del servidor"));
      }
    } catch (err) {
      alert("❌ Fallo de conexión con el servidor backend.");
    } finally {
      setImportando(false);
    }
  };

  const clientesProcesados = React.useMemo(() => {
    let resultado = [...listaClientes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(c =>
        (c.nombre || "").toLowerCase().includes(term) ||
        (c.rfc || "").toLowerCase().includes(term) ||
        (c.telefono || "").toLowerCase().includes(term) ||
        (c.correo || "").toLowerCase().includes(term)
      );
    }

    if (filtroTipoCliente) {
      resultado = resultado.filter(c => c.tipo_cliente === filtroTipoCliente);
    }

    if (ordenAlfabetico) {
      resultado.sort((a, b) => {
        const nombreA = (a.nombre || "").toLowerCase();
        const nombreB = (b.nombre || "").toLowerCase();
        if (ordenAlfabetico === 'asc') return nombreA.localeCompare(nombreB);
        return nombreB.localeCompare(nombreA);
      });
    }

    return resultado;
  }, [listaClientes, filtroTipoCliente, ordenAlfabetico, searchTerm]);


  const totalClientes = clientesProcesados.length;
  const totalPaginas = Math.ceil(totalClientes / itemsPorPagina) || 1;
  const startIndex = (paginaActual - 1) * itemsPorPagina;
  const endIndex = Math.min(startIndex + itemsPorPagina, totalClientes);
  const clientesPaginados = clientesProcesados.slice(startIndex, endIndex);

  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroTipoCliente, ordenAlfabetico]);

  useEffect(() => {
    if (paginaActual > totalPaginas && totalPaginas > 0) setPaginaActual(1);
  }, [totalPaginas, paginaActual]);

  // Función para descargar los clientes de la base de datos
  const cargarClientes = async () => {
    try {
      const respuesta = await fetch("http://127.0.0.1:8000/api/clientes");
      const datos = await respuesta.json();
      setListaClientes(datos);
    } catch (error) {
      console.error("Error al cargar el directorio:", error);
    }
  };

  const cargarSectores = async () => {
    try {
      const respuesta = await fetch("http://127.0.0.1:8000/api/configuracion/sectores");
      const datos = await respuesta.json();
      setSectores(datos);
    } catch (error) {
      console.error("Error al cargar los sectores:", error);
    }
  };

  // Esto hace que los clientes se cargen automáticamente al abrir la pantalla
  useEffect(() => {
    cargarClientes();
    cargarSectores();
  }, []);

  // 2. MANEJADOR DE CAPTURA DE DATOS
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 3. FUNCIÓN DE LIMPIEZA DE CAJA
  const handleLimpiar = () => {
    setFormData(estadoInicial);
  };

  // 4. PÓLIZA DE REGISTRO (Envío al Backend)
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const url = clienteSeleccionado
      ? `http://127.0.0.1:8000/api/clientes/${clienteSeleccionado.id_cliente}`
      : "http://127.0.0.1:8000/api/clientes";
    const method = clienteSeleccionado ? "PUT" : "POST";

    try {
      const respuesta = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        // Mapeamos los datos capturados a la estructura exacta que exige la base de datos
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          correo: formData.correo,
          razon_social: formData.razon_social,
          rfc: formData.rfc ? formData.rfc.toUpperCase() : "", // Aseguramos formato SAT
          curp: formData.curp ? formData.curp.toUpperCase() : "",
          regimen_fiscal: formData.regimen_fiscal,
          uso_cfdi: formData.uso_cfdi || "G03", // Valor por defecto operativo
          tipo_cliente: formData.tipo_cliente,
          genero: formData.genero,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          estatus_operativo: formData.estatus_operativo,
          sector: formData.sector
        })
      });

      const resultado = await respuesta.json();

      if (respuesta.ok) {
        alert("✅ " + resultado.mensaje); // Notificación de éxito
        handleLimpiar(); // Limpiamos los campos para el siguiente registro
        setClienteSeleccionado(null);
        setIsModalOpen(false);
        cargarClientes();
      } else {
        alert("❌ Error de Auditoría: " + resultado.detail); // Notificación si el RFC ya existe
      }
    } catch (error) {
      alert("Fallo de conexión con el servidor central. Verifica que Uvicorn esté corriendo.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Directorio de Clientes</h1>
          <p className="text-zinc-400 mt-1">Gestionar perfiles de facturación de estudiantes y clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setClientesAImportar([]);
              setResultadoImportacion(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-custom text-sm font-medium transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importar Excel
          </button>

          <button
            onClick={() => {
              setClienteSeleccionado(null);
              handleLimpiar();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-custom text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 items-start w-full">
        {/* Modal for Add/Edit Record */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-[700px] bg-white/[0.045] backdrop-blur-xl border border-white/12 rounded-custom shadow-[0_16px_45px_rgba(0,0,0,0.22)] p-6 relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-zinc-300" />
                  <h2 className="text-lg font-bold text-white">
                    {clienteSeleccionado ? "Editar Registro" : "Añadir Nuevo Registro"}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    handleLimpiar();
                    setClienteSeleccionado(null);
                    setIsModalOpen(false);
                  }}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Section 1 */}
                <section className="space-y-5 rounded-xl border border-border-table bg-zinc-900/30 p-5">
                  <div>
                    <h3 className="label-caps">Perfil del cliente</h3>
                    <p className="mt-1 text-xs text-zinc-500">Identificación, contacto y situación operativa.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Nombre Completo / Nombre del Estudiante *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      placeholder="ej. Juan Pérez"
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">CURP</label>
                      <input
                        type="text"
                        name="curp"
                        value={formData.curp}
                        onChange={handleChange}
                        placeholder="ABCD123456EFGHIJ78"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Tipo de Cliente *</label>
                      <div className="relative">
                        <select
                          name="tipo_cliente"
                          value={formData.tipo_cliente}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" className="bg-zinc-900">Seleccionar...</option>
                          <option value="publico general" className="bg-zinc-900">Público general</option>
                          <option value="asociado" className="bg-zinc-900">Asociado</option>
                          <option value="asociado externo" className="bg-zinc-900">Asociado externo</option>
                          <option value="colaborador" className="bg-zinc-900">Colaborador</option>
                          <option value="estudiante" className="bg-zinc-900">Estudiante</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Género</label>
                      <select
                        name="genero"
                        value={formData.genero}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="" className="bg-zinc-900">Seleccionar...</option>
                        <option value="Masculino" className="bg-zinc-900">Masculino</option>
                        <option value="Femenino" className="bg-zinc-900">Femenino</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Fecha de nacimiento</label>
                      <input
                        type="date"
                        name="fecha_nacimiento"
                        value={formData.fecha_nacimiento}
                        onChange={handleChange}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Estatus Operativo</label>
                      <div className="relative">
                        <select
                          name="estatus_operativo"
                          value={formData.estatus_operativo}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="Activo" className="bg-zinc-900">Activo</option>
                          <option value="Inactivo" className="bg-zinc-900">Inactivo</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Sector</label>
                      <div className="relative">
                        <select
                          name="sector"
                          value={formData.sector}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        >
                          {sectores.length > 0 ? (
                            sectores.map((sec) => (
                              <option key={sec.id} value={sec.nombre} className="bg-zinc-900">
                                {sec.nombre}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Normal" className="bg-zinc-900">Normal</option>
                              <option value="Gubernamental" className="bg-zinc-900">Gubernamental</option>
                              <option value="Capacitadoras" className="bg-zinc-900">Capacitadoras</option>
                            </>
                          )}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Número de Teléfono</label>
                      <input
                        type="text"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Correo Electrónico *</label>
                      <input
                        type="email"
                        name="correo"
                        value={formData.correo}
                        onChange={handleChange}
                        required
                        placeholder="juan@ejemplo.com"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 2 */}
                <section className="space-y-5 rounded-xl border border-border-table bg-zinc-900/30 p-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="label-caps">Datos de facturación (SAT)</h3>
                      <p className="mt-1 text-xs text-zinc-500">Solo se requieren al emitir una factura.</p>
                    </div>
                    <span className="text-[10px] font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase border border-white/10">Opcional</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Razón Social</label>
                    <input
                      type="text"
                      name="razon_social"
                      value={formData.razon_social}
                      onChange={handleChange}
                      placeholder="Nombre de la Entidad Legal"
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">RFC</label>
                      <input
                        type="text"
                        name="rfc"
                        value={formData.rfc}
                        onChange={handleChange}
                        placeholder="XAXX010101000"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Código Postal</label>
                      <input
                        type="text"
                        name="codigo_postal"
                        value={formData.codigo_postal}
                        onChange={handleChange}
                        placeholder="00000"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Régimen Fiscal</label>
                      <div className="relative">
                        <select
                          name="regimen_fiscal"
                          value={formData.regimen_fiscal}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" className="bg-zinc-900">Seleccionar Régimen...</option>
                          <option value="601" className="bg-zinc-900">601 - General de Ley Personas Morales</option>
                          <option value="603" className="bg-zinc-900">603 - Personas Morales con Fines no Lucrativos</option>
                          <option value="605" className="bg-zinc-900">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                          <option value="606" className="bg-zinc-900">606 - Arrendamiento</option>
                          <option value="608" className="bg-zinc-900">608 - Demás ingresos</option>
                          <option value="612" className="bg-zinc-900">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                          <option value="616" className="bg-zinc-900">616 - Sin obligaciones fiscales</option>
                          <option value="621" className="bg-zinc-900">621 - Incorporación Fiscal</option>
                          <option value="622" className="bg-zinc-900">622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                          <option value="626" className="bg-zinc-900">626 - Régimen Simplificado de Confianza</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Uso de CFDI</label>
                      <div className="relative">
                        <select
                          name="uso_cfdi"
                          value={formData.uso_cfdi}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" className="bg-zinc-900">Seleccionar Uso de CFDI...</option>
                          <option value="G01" className="bg-zinc-900">G01 - Adquisición de mercancias</option>
                          <option value="G02" className="bg-zinc-900">G02 - Devoluciones, descuentos o bonificaciones</option>
                          <option value="G03" className="bg-zinc-900">G03 - Gastos en general</option>
                          <option value="I01" className="bg-zinc-900">I01 - Construcciones</option>
                          <option value="I02" className="bg-zinc-900">I02 - Mobilario y equipo de oficina por inversiones</option>
                          <option value="I03" className="bg-zinc-900">I03 - Equipo de transporte</option>
                          <option value="I04" className="bg-zinc-900">I04 - Equipo de computo y accesorios</option>
                          <option value="D01" className="bg-zinc-900">D01 - Honorarios médicos, dentales y gastos hospitalarios</option>
                          <option value="D02" className="bg-zinc-900">D02 - Gastos médicos por incapacidad o discapacidad</option>
                          <option value="D10" className="bg-zinc-900">D10 - Pagos por servicios educativos (colegiaturas)</option>
                          <option value="S01" className="bg-zinc-900">S01 - Sin efectos fiscales</option>
                          <option value="CP01" className="bg-zinc-900">CP01 - Pagos</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleLimpiar();
                      setClienteSeleccionado(null);
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 border border-border-table rounded-md text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium transition-colors shadow-sm">
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para Importar Excel */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-[850px] bg-white/[0.045] backdrop-blur-xl border border-white/12 rounded-custom shadow-[0_16px_45px_rgba(0,0,0,0.22)] p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Importar Clientes mediante Excel</h2>
                    <p className="text-xs text-zinc-400">Carga masiva de directorio mediante archivo .xlsx o .csv</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setClientesAImportar([]);
                    setResultadoImportacion(null);
                  }}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner Descarga Plantilla */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5 justify-center sm:justify-start">
                    Obtener Formato de Excel Modelo
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Descarga nuestra plantilla oficial con las columnas configuradas y filas de ejemplo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={descargarPlantillaExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-all shadow-md shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Descargar Plantilla (.xlsx)
                </button>
              </div>
              {/* Zona de Carga de Archivo */}
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      if (fileInputRef.current) {
                        fileInputRef.current.files = dt.files;
                        handleFileUpload({ target: fileInputRef.current } as any);
                      }
                    }
                  }}
                  className="border-2 border-dashed border-white/15 hover:border-emerald-400/50 rounded-xl p-6 flex flex-col items-center justify-center bg-black/20 hover:bg-black/40 transition-all cursor-pointer group"
                >
                  <UploadCloud className="w-10 h-10 text-zinc-500 group-hover:text-emerald-400 transition-colors mb-2" />
                  <p className="text-xs font-semibold text-zinc-200 mb-0.5">Haz clic o arrastra tu archivo de Excel aquí</p>
                  <p className="text-[10px] text-zinc-500 mb-3">Soporta formatos .xlsx, .xls y .csv</p>
                  <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    Seleccionar Archivo Excel
                  </span>
                </div>
              </div>

              {/* Previsualización de Datos leídos */}
              {clientesAImportar.length > 0 && (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      Previsualización ({clientesAImportar.length} registros listos)
                    </span>
                    <button
                      onClick={() => setClientesAImportar([])}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Limpiar selección
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-border-table rounded-lg bg-black/30">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-black/50 text-zinc-400 sticky top-0 border-b border-border-table uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Fila</th>
                          <th className="px-3 py-2">Nombre</th>
                          <th className="px-3 py-2">Correo</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">RFC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-table text-zinc-300">
                        {clientesAImportar.map((c, i) => (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="px-3 py-1.5 text-zinc-500 font-mono">#{c.rowNum}</td>
                            <td className="px-3 py-1.5 font-medium text-white">{c.nombre || <span className="text-red-400 font-bold">Sin nombre</span>}</td>
                            <td className="px-3 py-1.5">{c.correo || "-"}</td>
                            <td className="px-3 py-1.5 uppercase text-[10px]">{c.tipo_cliente}</td>
                            <td className="px-3 py-1.5 font-mono">{c.rfc || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resultado de la importación */}
              {resultadoImportacion && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    {resultadoImportacion.mensaje}
                  </div>
                  {resultadoImportacion.errores && resultadoImportacion.errores.length > 0 && (
                    <div className="mt-2 text-xs text-zinc-400 space-y-1">
                      <p className="font-semibold text-amber-400">Observaciones / Alertas:</p>
                      <ul className="list-disc list-inside max-h-28 overflow-y-auto space-y-0.5 text-[11px] text-zinc-300">
                        {resultadoImportacion.errores.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Botones de Acción Footer */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setClientesAImportar([]);
                    setResultadoImportacion(null);
                  }}
                  className="px-4 py-2 border border-border-table rounded-md text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  disabled={clientesAImportar.length === 0 || importando}
                  onClick={ejecutarImportacion}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  {importando ? (
                    <>Procesando importación...</>
                  ) : (
                    <>
                      Importar {clientesAImportar.length > 0 ? `${clientesAImportar.length} Clientes` : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clients Directory List */}
        <div className="w-full bg-zinc-900/30 rounded-custom border border-border-table shadow-sm overflow-visible flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="relative z-20 p-4 border-b border-border-table flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Búsqueda rápida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`p-2 text-zinc-400 hover:bg-white/5 rounded-md transition-colors border ${isFilterOpen ? 'bg-white/10 border-white/20' : 'border-transparent hover:border-white/10'}`}
                >
                  <Filter className="w-5 h-5" />
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-border-table rounded-md shadow-lg z-30 p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Ordenar A-Z</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOrdenAlfabetico(ordenAlfabetico === 'asc' ? null : 'asc')}
                          className={`flex-1 py-1 px-2 rounded text-xs font-medium border ${ordenAlfabetico === 'asc' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'}`}
                        >
                          A - Z
                        </button>
                        <button
                          onClick={() => setOrdenAlfabetico(ordenAlfabetico === 'desc' ? null : 'desc')}
                          className={`flex-1 py-1 px-2 rounded text-xs font-medium border ${ordenAlfabetico === 'desc' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'}`}
                        >
                          Z - A
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tipo de Cliente</h4>
                      <select
                        value={filtroTipoCliente}
                        onChange={(e) => setFiltroTipoCliente(e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Todos los tipos</option>
                        <option value="publico general">Público general</option>
                        <option value="asociado">Asociado</option>
                        <option value="asociado externo">Asociado externo</option>
                        <option value="colaborador">Colaborador</option>
                        <option value="estudiante">Estudiante</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <button className="p-2 text-zinc-400 hover:bg-white/5 rounded-md transition-colors border border-transparent hover:border-white/10">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-zinc-500 bg-black/40 border-b border-border-table uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3">CLIENTE / CONTACTO</th>
                  <th className="px-6 py-3">RFC</th>
                  <th className="px-6 py-3">ACTIVIDAD RECIENTE</th>
                  <th className="px-6 py-3 text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-table">
                {clientesPaginados.map((client) => (
                  <tr key={client.id_cliente} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{client.nombre}</div>
                      <div className="text-zinc-500 text-xs mt-0.5">
                        {client.telefono} {client.telefono && client.correo ? "•" : ""} {client.correo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {client.rfc || "Sin RFC"}
                      </div>
                      <div className="mt-1 flex gap-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {client.uso_cfdi || "G03"}
                        </span>
                        {client.tipo_cliente && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border ${client.tipo_cliente === 'asociado' || client.tipo_cliente === 'asociado externo'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : client.tipo_cliente === 'estudiante'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : client.tipo_cliente === 'colaborador'
                                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                                : 'bg-slate-500/30 text-slate-300 border-slate-500/40'
                            }`}>
                            {client.tipo_cliente.charAt(0).toUpperCase() + client.tipo_cliente.slice(1)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{client.razon_social || "Sin Razón Social"}</div>
                      <div className="text-zinc-500 text-xs mt-0.5">{client.curp || "Sin CURP"}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setClienteSeleccionado(client);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginacion
            currentPage={paginaActual}
            totalPages={totalPaginas}
            totalItems={totalClientes}
            itemsPerPage={itemsPorPagina}
            isLoading={false}
            onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
            onItemsPerPageChange={(nuevoLimite) => {
              setItemsPorPagina(nuevoLimite);
              setPaginaActual(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
