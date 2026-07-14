import { useState, useEffect, FormEvent } from "react";
import { UploadCloud, Palette, Building2, Receipt, Mail, Save, Image as ImageIcon, Package, Plus, Edit2, Trash2, Filter } from "lucide-react";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('identity');

  // Inventario States
  const [inventario, setInventario] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form Field States
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("Producto");
  const [categoria, setCategoria] = useState("Libros");
  const [precioCosto, setPrecioCosto] = useState<number | string>("");
  const [precioVenta, setPrecioVenta] = useState<number | string>("");
  const [stockActual, setStockActual] = useState<number | string>("");
  const [stockMinimo, setStockMinimo] = useState<number | string>("");

  // Filter States
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [showFiltros, setShowFiltros] = useState(false);

  const fetchInventario = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/inventario");
      if (res.ok) {
        const data = await res.json();
        setInventario(data);
      } else {
        console.error("Error fetching inventory");
      }
    } catch (error) {
      console.error("Network error fetching inventory", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventario();
    }
  }, [activeTab]);

  const resetForm = () => {
    setNombre("");
    setTipo("Producto");
    setCategoria("Libros");
    setPrecioCosto("");
    setPrecioVenta("");
    setStockActual("");
    setStockMinimo("");
    setEditId(null);
  };

  const handleGuardarItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert("Por favor ingrese un nombre.");
      return;
    }

    const payload = {
      nombre,
      tipo,
      categoria,
      precio_costo: Number(precioCosto) || 0,
      precio_venta: Number(precioVenta) || 0,
      stock_actual: tipo === "Servicio" ? 0 : Number(stockActual) || 0,
      stock_minimo: tipo === "Servicio" ? 0 : Number(stockMinimo) || 0,
      estatus: 1
    };

    try {
      const url = editId
        ? `http://localhost:8000/api/inventario/${editId}`
        : "http://localhost:8000/api/inventario";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        resetForm();
        setShowForm(false);
        fetchInventario();
      } else {
        const err = await res.json();
        alert("Error al guardar: " + (err.detail || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error saving inventory item", error);
      alert("Error de red al conectar con el servidor.");
    }
  };

  const handleEliminarItem = async (id: number, nombreItem: string) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar el ítem "${nombreItem}" del inventario? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    try {
      const res = await fetch(`http://localhost:8000/api/inventario/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        fetchInventario();
      } else {
        const err = await res.json();
        alert("Error al eliminar: " + (err.detail || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error deleting inventory item", error);
      alert("Error de red al conectar con el servidor.");
    }
  };

  const handleEditarItem = (item: any) => {
    setEditId(item.id);
    setNombre(item.nombre);
    setTipo(item.tipo);
    setCategoria(item.categoria);
    setPrecioCosto(item.precio_costo);
    setPrecioVenta(item.precio_venta);
    setStockActual(item.stock_actual);
    setStockMinimo(item.stock_minimo);
    setShowForm(true);
  };

  const inventarioFiltrado = inventario.filter(item => {
    if (filtroCategoria === "Todas") return true;
    return item.categoria === filtroCategoria;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-64px)] flex flex-col">
      {/* Header with fixed actions */}
      <div className="flex justify-between items-end mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Configuración del Sistema</h1>
          <p className="text-zinc-400 mt-1">Personaliza la apariencia, detalles institucionales y parámetros operativos.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 border border-border-table hover:bg-white/5 text-zinc-300 rounded-md text-sm font-medium transition-colors">
            Descartar Cambios
          </button>
          {/* 
            ==========================================================================
            BOTÓN PRIMARIO (GUARDAR):
            - Usa 'bg-primary' mapeado al color institucional definido en index.css
            ==========================================================================
          */}
          <button className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-bold transition-colors shadow-md">
            <Save className="w-4 h-4" />
            Guardar Configuración
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">

        {/* Navigation Tabs (Vertical) */}
        <div className="w-full lg:w-64 flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab('identity')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'identity' ? 'bg-zinc-900/80 text-white border border-white/10 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Palette className="w-5 h-5" />
            Identidad y Marca
          </button>
          <button
            onClick={() => setActiveTab('fiscal')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'fiscal' ? 'bg-zinc-900/80 text-white border border-white/10 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Building2 className="w-5 h-5" />
            Datos Fiscales
          </button>
          <button
            onClick={() => setActiveTab('operation')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'operation' ? 'bg-zinc-900/80 text-white border border-white/10 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Receipt className="w-5 h-5" />
            Operación y Folios
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'notifications' ? 'bg-zinc-900/80 text-white border border-white/10 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Mail className="w-5 h-5" />
            Notificaciones
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'inventory' ? 'bg-zinc-900/80 text-white border border-white/10 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Package className="w-5 h-5" />
            Catálogo / Inventario
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">

          {/* TAB 1: IDENTIDAD Y MARCA */}
          {activeTab === 'identity' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-zinc-400" />
                  Logotipo Institucional
                </h2>

                <div className="border-2 border-dashed border-border-table rounded-lg p-10 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors cursor-pointer group">
                  <UploadCloud className="w-12 h-12 text-zinc-500 mb-4 group-hover:text-blue-400 transition-colors" />
                  <p className="text-sm font-medium text-white mb-1">Arrastra y suelta tu logotipo aquí</p>
                  <p className="text-xs text-zinc-500 mb-4">SVG, PNG, JPG (Max 2MB)</p>
                  <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded shadow-sm hover:bg-zinc-200 transition-colors">
                    Examinar Archivos
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-zinc-400" />
                  Paleta de Colores
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 
                    ==========================================================================
                    SELECTOR DE COLOR PRIMARIO Y SECUNDARIO:
                    - Para white-label, estos valores se vincularían dinámicamente con CSS.
                    - Editar las variables globales en src/index.css
                    ==========================================================================
                  */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Color Primario</label>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded border border-border-table bg-[#3b82f6] flex-shrink-0"></div>
                      <input
                        type="text"
                        defaultValue="#3b82f6"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Usado para botones principales y acentos.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Color Secundario</label>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded border border-border-table bg-[#171717] flex-shrink-0"></div>
                      <input
                        type="text"
                        defaultValue="#171717"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Usado para fondos de sidebar y tarjetas.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATOS FISCALES */}
          {activeTab === 'fiscal' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6">Datos de Facturación</h2>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Razón Social</label>
                    <input
                      type="text"
                      defaultValue="Colegio San Ignacio A.C."
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">RFC</label>
                      <input
                        type="text"
                        defaultValue="CSI990101XX1"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Código Postal</label>
                      <input
                        type="text"
                        defaultValue="10004"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Régimen Fiscal</label>
                    <select className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="603" selected>603 - Personas Morales con Fines no Lucrativos</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6">Datos de Contacto y Representante</h2>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Domicilio Fiscal</label>
                    <textarea
                      rows={2}
                      defaultValue="Av. Educación 123, Col. Centro, Ciudad, Estado."
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Teléfono</label>
                      <input
                        type="text"
                        defaultValue="+52 (55) 1234-5678"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Correo Institucional</label>
                      <input
                        type="email"
                        defaultValue="administracion@colegio.edu"
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-sm font-medium text-zinc-300">Representante Legal</label>
                    <input
                      type="text"
                      defaultValue="Dra. Elena Ramos"
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <p className="text-[10px] text-zinc-500">Este nombre aparecerá en reportes y firmas automatizadas.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPERACIÓN Y FOLIOS */}
          {activeTab === 'operation' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6">Control de Folios Consecutivos</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Prefijo Cuotas</label>
                      <input type="text" defaultValue="CUO-" className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Folio Actual Cuotas</label>
                      <input type="number" defaultValue={4592} className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Prefijo Cursos</label>
                      <input type="text" defaultValue="CUR-" className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Folio Actual Cursos</label>
                      <input type="number" defaultValue={108} className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6">Parámetros Contables</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Moneda Base</label>
                    <select className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono appearance-none">
                      <option value="MXN" selected>MXN - Peso Mexicano</option>
                      <option value="USD">USD - Dólar Estadounidense</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Tasa de Impuesto Predeterminada</label>
                    <select className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono appearance-none">
                      <option value="16">IVA 16%</option>
                      <option value="8">IVA 8% (Frontera)</option>
                      <option value="0" selected>Exento (0%)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6">Tickets y Recibos</h2>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Términos y Condiciones (Pie de Recibo)</label>
                    <textarea
                      rows={4}
                      defaultValue="Este documento es un comprobante de pago no deducible. Para solicitar factura CFDI, ingrese a nuestro portal dentro del mes en curso."
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  {/* 
                    ==========================================================================
                    VISTA PREVIA DEL RECIBO (ESTILO TERMINAL/TICKET):
                    ==========================================================================
                  */}
                  <div className="mt-6 border border-border-table rounded-md p-6 bg-black flex justify-center">
                    <div className="w-full max-w-sm text-center space-y-1 text-zinc-400 font-mono text-xs">
                      <p className="text-white font-bold uppercase">COLEGIO SAN IGNACIO A.C.</p>
                      <p>Av. Educación 123, Col. Centro</p>
                      <p>Ciudad, Estado</p>
                      <p>RFC: CSI990101XX1</p>
                      <p className="mt-4 italic">Este documento es un comprobante de pago no deducible. Para solicitar factura CFDI, ingrese a nuestro portal dentro del mes en curso.</p>
                      <p className="mt-4">Firma Autorizada: Dra. Elena Ramos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICACIONES */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6">Configuración de Correo (SMTP)</h2>
                <p className="text-sm text-zinc-400 mb-6">Requerido para el envío automático de estados de cuenta y recibos a clientes.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Servidor SMTP (Host)</label>
                    <input type="text" defaultValue="smtp.office365.com" className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Puerto</label>
                    <input type="text" defaultValue="587" className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Usuario / Correo Remitente</label>
                    <input type="text" defaultValue="notificaciones@colegio.edu" className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">Contraseña de Aplicación</label>
                    <input type="password" defaultValue="********" className="w-full px-3 py-2 bg-zinc-900/50 border border-border-table rounded-md text-sm text-white font-mono" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold transition-colors">
                    Probar Conexión
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <h2 className="text-lg font-bold text-white mb-6">Gestión de Cajas y Seguridad</h2>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-border-table rounded-md">
                  <div>
                    <h3 className="text-sm font-medium text-white mb-1">Corte de Caja Ciego</h3>
                    <p className="text-xs text-zinc-400">Exigir que el cajero declare el efectivo antes de mostrar los totales del sistema al cerrar el turno.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INVENTARIO */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white">Catálogo de Productos y Servicios</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFiltros(!showFiltros)}
                      className={`flex items-center gap-2 px-4 py-2 border border-border-table hover:bg-white/5 rounded-md text-sm font-medium transition-colors ${showFiltros ? 'bg-white/10 text-white' : 'text-zinc-300'}`}
                    >
                      <Filter className="w-4 h-4" />
                      Filtros
                    </button>
                    <button
                      onClick={() => {
                        if (showForm) {
                          resetForm();
                          setShowForm(false);
                        } else {
                          resetForm();
                          setShowForm(true);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Ítem
                    </button>
                  </div>
                </div>

                {/* Filtros de Categoría */}
                {showFiltros && (
                  <div className="flex items-center gap-4 p-4 bg-zinc-900/40 border border-border-table rounded-md mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-400">Filtrar por Categoría:</span>
                      <select
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        className="bg-black/50 border border-border-table text-white text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Todas">Todas</option>
                        <option value="Libros">Libros</option>
                        <option value="Cursos">Cursos</option>
                        <option value="Cuotas">Cuotas</option>
                        <option value="Diplomado">Diplomado</option>
                      </select>
                    </div>
                    {filtroCategoria !== "Todas" && (
                      <button
                        onClick={() => setFiltroCategoria("Todas")}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        Limpiar filtro
                      </button>
                    )}
                  </div>
                )}

                {/* Formulario de Alta Rápida / Edición */}
                {showForm && (
                  <form onSubmit={handleGuardarItem} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-900/50 border border-border-table rounded-md mb-6">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-medium text-zinc-400">Nombre</label>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej. Manual Nivel 2"
                        className="w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Tipo</label>
                      <select
                        value={tipo}
                        onChange={(e) => {
                          const nuevoTipo = e.target.value;
                          setTipo(nuevoTipo);
                          if (nuevoTipo === "Servicio") {
                            setStockActual(0);
                            setStockMinimo(0);
                          }
                        }}
                        className="w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Producto">Producto</option>
                        <option value="Servicio">Servicio</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Categoría</label>
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Libros">Libros</option>
                        <option value="Cursos">Cursos</option>
                        <option value="Cuotas">Cuotas</option>
                        <option value="Diplomado">Diplomado</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Precio Costo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={precioCosto}
                        onChange={(e) => setPrecioCosto(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Precio Venta</label>
                      <input
                        type="number"
                        step="0.01"
                        value={precioVenta}
                        onChange={(e) => setPrecioVenta(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {tipo === "Producto" ? <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Stock Inicial</label>
                        <input type="number" value={stockActual} onChange={(e) => setStockActual(e.target.value)} placeholder="0" className="w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Mínimo</label>
                        <input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} placeholder="0" className="w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </> : (
                      <p className="col-span-2 self-end pb-2 text-xs text-zinc-500">Los servicios no manejan stock.</p>
                    )}
                    <div className="col-span-2 md:col-span-4 flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => { resetForm(); setShowForm(false); }}
                        className="px-4 py-2 border border-border-table text-zinc-300 hover:bg-white/5 rounded text-xs font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded text-xs font-bold transition-colors"
                      >
                        {editId ? "Actualizar Ítem" : "Guardar Ítem"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Tabla */}
                <div className="overflow-x-auto border border-border-table rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-zinc-500 bg-black/40 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3 text-right">Precio</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-table">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">Cargando catálogo...</td>
                        </tr>
                      ) : inventarioFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">No se encontraron ítems en esta categoría.</td>
                        </tr>
                      ) : (
                        inventarioFiltrado.map((item) => (
                          <tr key={item.id} className="hover:bg-white/5 group">
                            <td className="px-4 py-3 text-white">
                              <div>
                                <div className="font-medium">{item.nombre}</div>
                                <div className="text-[10px] text-zinc-500">{item.tipo}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
                                {item.categoria}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-white font-mono">
                              <div>
                                <div>${Number(item.precio_venta).toFixed(2)}</div>
                                <div className="text-[10px] text-zinc-500">Costo: ${Number(item.precio_costo).toFixed(2)}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-white font-mono">
                              {item.tipo === "Servicio" ? (
                                <span className="text-zinc-500 text-xs">No aplica</span>
                              ) : (
                                <div>
                                  <span className={item.stock_actual <= item.stock_minimo ? "text-amber-400 font-bold" : "text-white"}>{item.stock_actual}</span>
                                  <span className="text-zinc-500 text-[10px]"> / min {item.stock_minimo}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleEditarItem(item)}
                                className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEliminarItem(item.id, item.nombre)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
