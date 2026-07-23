import React, { useEffect, useRef, useState, type ElementType } from "react";
import { Plus, Edit2, Trash2, Check, X, Users, Briefcase, Receipt, FileText, AlertCircle, Loader2, Search, ChevronDown } from "lucide-react";

interface SimpleCatalogItem {
  id: number;
  nombre: string;
}

interface KeyDescCatalogItem {
  id: number;
  clave: string;
  descripcion: string;
}

const API_BASE = "http://localhost:8000/api/configuracion";

export function CatalogSettings() {
  const [tiposCliente, setTiposCliente] = useState<SimpleCatalogItem[]>([]);
  const [sectores, setSectores] = useState<SimpleCatalogItem[]>([]);
  const [regimenes, setRegimenes] = useState<KeyDescCatalogItem[]>([]);
  const [usosCfdi, setUsosCfdi] = useState<KeyDescCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // General loader for all catalogs
  const cargarCatalogos = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resTipos, resSectores, resRegimenes, resUsos] = await Promise.all([
        fetch(`${API_BASE}/tipos-cliente`),
        fetch(`${API_BASE}/sectores`),
        fetch(`${API_BASE}/regimenes-fiscales`),
        fetch(`${API_BASE}/usos-cfdi`),
      ]);

      if (!resTipos.ok || !resSectores.ok || !resRegimenes.ok || !resUsos.ok) {
        throw new Error("No se pudieron cargar los catálogos.");
      }

      setTiposCliente(await resTipos.json());
      setSectores(await resSectores.json());
      setRegimenes(await resRegimenes.json());
      setUsosCfdi(await resUsos.json());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center rounded-custom border border-border-table bg-zinc-900/30 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-400" />
        Cargando catálogos de configuración...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      {/* BLOQUE 1: Tipos de cliente */}
      <SimpleCatalogBlock
        title="Tipos de Cliente"
        description="Administra los perfiles de clientes disponibles para registro y clasificación."
        icon={Users}
        items={tiposCliente}
        endpoint={`${API_BASE}/tipos-cliente`}
        onReload={cargarCatalogos}
        placeholder="ej. Estudiante Becado"
      />

      {/* BLOQUE 2: Sectores */}
      <SimpleCatalogBlock
        title="Sectores de Clientes"
        description="Clasificación por sectores económicos o institucionales."
        icon={Briefcase}
        items={sectores}
        endpoint={`${API_BASE}/sectores`}
        onReload={cargarCatalogos}
        placeholder="ej. Educación Superior"
      />

      {/* BLOQUE 3: Regímenes Fiscales */}
      <KeyDescCatalogBlock
        title="Regímenes Fiscales (SAT)"
        description="Catálogo de regímenes fiscales para facturación."
        icon={Receipt}
        items={regimenes}
        endpoint={`${API_BASE}/regimenes-fiscales`}
        onReload={cargarCatalogos}
        clavePlaceholder="Clave (ej. 601)"
        descPlaceholder="Descripción del régimen"
      />

      {/* BLOQUE 4: Usos de CFDI */}
      <KeyDescCatalogBlock
        title="Usos de CFDI (SAT)"
        description="Usos de comprobantes fiscales digitales por internet."
        icon={FileText}
        items={usosCfdi}
        endpoint={`${API_BASE}/usos-cfdi`}
        onReload={cargarCatalogos}
        clavePlaceholder="Clave (ej. G03)"
        descPlaceholder="Descripción de uso de CFDI"
      />
    </div>
  );
}

// ----------------------------------------------------
// Sub-componente para catálogos de 1 solo campo (Nombre)
// ----------------------------------------------------
function SimpleCatalogBlock({
  title,
  description,
  icon: Icon,
  items,
  endpoint,
  onReload,
  placeholder,
}: {
  title: string;
  description: string;
  icon: ElementType;
  items: SimpleCatalogItem[];
  endpoint: string;
  onReload: () => void;
  placeholder: string;
}) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuId = `catalog-menu-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const filteredItems = items.filter((item) => item.nombre.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery, items.length]);

  useEffect(() => {
    if (isMenuOpen) searchInputRef.current?.focus();
  }, [isMenuOpen]);

  const selectItem = (item: SimpleCatalogItem) => {
    setEditingId(item.id);
    setEditingNombre(item.nombre);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredItems.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && filteredItems[activeIndex]) {
      event.preventDefault();
      selectItem(filteredItems[activeIndex]);
    } else if (event.key === "Escape") {
      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  };

  const handleCreate = async () => {
    if (!nuevoNombre.trim()) return;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al agregar.");
        return;
      }
      setNuevoNombre("");
      setIsAdding(false);
      onReload();
    } catch {
      alert("Error de conexión al servidor.");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editingNombre.trim()) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editingNombre.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al actualizar.");
        return;
      }
      setEditingId(null);
      onReload();
    } catch {
      alert("Error de conexión al servidor.");
    }
  };

  const handleDelete = async (item: SimpleCatalogItem) => {
    if (!confirm(`¿Estás seguro de eliminar "${item.nombre}"?`)) return;
    try {
      const res = await fetch(`${endpoint}/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al eliminar.");
        return;
      }
      onReload();
    } catch {
      alert("Error de conexión al servidor.");
    }
  };

  return (
    <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-zinc-400">{description}</p>
          </div>
          <ChevronDown className={`ml-auto mr-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
        </button>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? "Cancelar" : "Añadir opción"}
        </button>
      </div>

      {/* Formulario de agregar */}
      {isAdding && (
        <div className="flex items-center gap-2 p-3 bg-zinc-900/60 border border-blue-500/30 rounded-lg">
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 px-3 py-1.5 bg-zinc-900 border border-border-table rounded text-sm text-white focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
          >
            <Check className="w-4 h-4" /> Guardar
          </button>
        </div>
      )}

      {/* Menú de opciones con buscador */}
      {isMenuOpen && <div id={menuId} className="rounded-xl border border-border-table bg-black/20 p-2 shadow-sm">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={`Buscar en ${title.toLowerCase()}...`}
            aria-label={`Buscar en ${title}`}
            className="w-full rounded-lg border border-border-table bg-zinc-900/70 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="max-h-64 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {items.length === 0 ? (
          <p className="p-4 text-center text-xs text-zinc-500">No hay registros cargados.</p>
        ) : filteredItems.length === 0 ? (
          <p className="p-4 text-center text-xs text-zinc-500">Sin resultados.</p>
        ) : (
          filteredItems.map((item, index) => (
            <div key={item.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}>
              {editingId === item.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <input
                    type="text"
                    value={editingNombre}
                    onChange={(e) => setEditingNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(item.id)}
                    className="flex-1 px-2.5 py-1 bg-zinc-900 border border-blue-500 rounded text-sm text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(item.id)}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => selectItem(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Icon className="h-4 w-4 shrink-0 text-blue-400" />
                  <span className="truncate text-sm font-medium text-zinc-200 capitalize">{item.nombre}</span>
                </button>
              )}

              {editingId !== item.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => selectItem(item)}
                    className="p-1.5 text-zinc-400 hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        </div>
      </div>}
    </section>
  );
}

// ----------------------------------------------------
// Sub-componente para catálogos de 2 campos (Clave + Descripción)
// ----------------------------------------------------
function KeyDescCatalogBlock({
  title,
  description,
  icon: Icon,
  items,
  endpoint,
  onReload,
  clavePlaceholder,
  descPlaceholder,
}: {
  title: string;
  description: string;
  icon: ElementType;
  items: KeyDescCatalogItem[];
  endpoint: string;
  onReload: () => void;
  clavePlaceholder: string;
  descPlaceholder: string;
}) {
  const [nuevaClave, setNuevaClave] = useState("");
  const [nuevaDesc, setNuevaDesc] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingClave, setEditingClave] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuId = `catalog-menu-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) =>
    item.clave.toLowerCase().includes(normalizedQuery) || item.descripcion.toLowerCase().includes(normalizedQuery),
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery, items.length]);

  useEffect(() => {
    if (isMenuOpen) searchInputRef.current?.focus();
  }, [isMenuOpen]);

  const selectItem = (item: KeyDescCatalogItem) => {
    setEditingId(item.id);
    setEditingClave(item.clave);
    setEditingDesc(item.descripcion);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredItems.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && filteredItems[activeIndex]) {
      event.preventDefault();
      selectItem(filteredItems[activeIndex]);
    } else if (event.key === "Escape") {
      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  };

  const handleCreate = async () => {
    if (!nuevaClave.trim() || !nuevaDesc.trim()) return;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: nuevaClave.trim().toUpperCase(), descripcion: nuevaDesc.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al agregar.");
        return;
      }
      setNuevaClave("");
      setNuevaDesc("");
      setIsAdding(false);
      onReload();
    } catch {
      alert("Error de conexión al servidor.");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editingClave.trim() || !editingDesc.trim()) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: editingClave.trim().toUpperCase(), descripcion: editingDesc.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al actualizar.");
        return;
      }
      setEditingId(null);
      onReload();
    } catch {
      alert("Error de conexión al servidor.");
    }
  };

  const handleDelete = async (item: KeyDescCatalogItem) => {
    if (!confirm(`¿Estás seguro de eliminar "${item.clave} - ${item.descripcion}"?`)) return;
    try {
      const res = await fetch(`${endpoint}/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al eliminar.");
        return;
      }
      onReload();
    } catch {
      alert("Error de conexión al servidor.");
    }
  };

  return (
    <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-zinc-400">{description}</p>
          </div>
          <ChevronDown className={`ml-auto mr-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
        </button>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? "Cancelar" : "Añadir opción"}
        </button>
      </div>

      {/* Formulario de agregar */}
      {isAdding && (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-zinc-900/60 border border-emerald-500/30 rounded-lg">
          <input
            type="text"
            value={nuevaClave}
            onChange={(e) => setNuevaClave(e.target.value)}
            placeholder={clavePlaceholder}
            className="sm:col-span-3 px-3 py-1.5 bg-zinc-900 border border-border-table rounded text-sm text-white uppercase focus:outline-none focus:border-emerald-500 font-mono"
            autoFocus
          />
          <input
            type="text"
            value={nuevaDesc}
            onChange={(e) => setNuevaDesc(e.target.value)}
            placeholder={descPlaceholder}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="sm:col-span-7 px-3 py-1.5 bg-zinc-900 border border-border-table rounded text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleCreate}
            className="sm:col-span-2 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
          >
            <Check className="w-4 h-4" /> Guardar
          </button>
        </div>
      )}

      {/* Menú de opciones con buscador */}
      {isMenuOpen && <div id={menuId} className="rounded-xl border border-border-table bg-black/20 p-2 shadow-sm">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={`Buscar en ${title.toLowerCase()}...`}
            aria-label={`Buscar en ${title}`}
            className="w-full rounded-lg border border-border-table bg-zinc-900/70 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="max-h-64 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {items.length === 0 ? (
          <p className="p-4 text-center text-xs text-zinc-500">No hay registros cargados.</p>
        ) : filteredItems.length === 0 ? (
          <p className="p-4 text-center text-xs text-zinc-500">Sin resultados.</p>
        ) : (
          filteredItems.map((item, index) => (
            <div key={item.id} className={`flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 transition-colors ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}>
              {editingId === item.id ? (
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingClave}
                    onChange={(e) => setEditingClave(e.target.value)}
                    className="w-24 px-2.5 py-1 bg-zinc-900 border border-emerald-500 rounded text-sm text-white font-mono uppercase focus:outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(item.id)}
                    className="flex-1 min-w-[200px] px-2.5 py-1 bg-zinc-900 border border-emerald-500 rounded text-sm text-white focus:outline-none"
                  />
                  <button
                    onClick={() => handleUpdate(item.id)}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => selectItem(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {item.clave}
                  </span>
                  <span className="text-sm font-medium text-zinc-200 truncate">{item.descripcion}</span>
                </button>
              )}

              {editingId !== item.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => selectItem(item)}
                    className="p-1.5 text-zinc-400 hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        </div>
      </div>}
    </section>
  );
}
