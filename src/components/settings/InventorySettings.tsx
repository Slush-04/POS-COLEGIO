import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Edit2, Filter, Plus, Trash2 } from "lucide-react";

interface InventoryItem {
  id: number;
  nombre: string;
  tipo: "Producto" | "Servicio";
  categoria: string;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
}

const API_URL = "http://localhost:8000/api/inventario";
const CATEGORIES = ["Libros", "Cursos", "Cuotas", "Diplomado"];

export function InventorySettings() {
  const [inventario, setInventario] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<InventoryItem["tipo"]>("Producto");
  const [categoria, setCategoria] = useState("Libros");
  const [precioCosto, setPrecioCosto] = useState<number | string>("");
  const [precioVenta, setPrecioVenta] = useState<number | string>("");
  const [stockActual, setStockActual] = useState<number | string>("");
  const [stockMinimo, setStockMinimo] = useState<number | string>("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [showFiltros, setShowFiltros] = useState(false);

  const fetchInventario = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("No se pudo cargar el inventario.");
      setInventario(await response.json());
    } catch (error) {
      console.error("Error al cargar el inventario", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInventario();
  }, []);

  const inventarioFiltrado = useMemo(
    () => inventario.filter((item) => filtroCategoria === "Todas" || item.categoria === filtroCategoria),
    [inventario, filtroCategoria],
  );

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

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleGuardarItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!nombre.trim()) {
      window.alert("Por favor ingrese un nombre.");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      tipo,
      categoria,
      precio_costo: Number(precioCosto) || 0,
      precio_venta: Number(precioVenta) || 0,
      stock_actual: tipo === "Servicio" ? 0 : Number(stockActual) || 0,
      stock_minimo: tipo === "Servicio" ? 0 : Number(stockMinimo) || 0,
      estatus: 1,
    };

    try {
      const response = await fetch(editId ? `${API_URL}/${editId}` : API_URL, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "No se pudo guardar el ítem.");
      }
      closeForm();
      await fetchInventario();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Error de red al conectar con el servidor.");
    }
  };

  const handleEliminarItem = async (item: InventoryItem) => {
    if (!window.confirm(`¿Deseas eliminar el ítem "${item.nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
      const response = await fetch(`${API_URL}/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "No se pudo eliminar el ítem.");
      }
      await fetchInventario();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Error de red al conectar con el servidor.");
    }
  };

  const handleEditarItem = (item: InventoryItem) => {
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

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="bg-zinc-900/30 border border-border-table rounded-custom p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Catálogo de Productos y Servicios</h2>
            <p className="text-sm text-zinc-400 mt-1">Administra precios, categorías y existencias del punto de venta.</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowFiltros((current) => !current)}
              className={`flex items-center gap-2 px-4 py-2 border border-border-table hover:bg-white/5 rounded-md text-sm font-medium transition-colors ${showFiltros ? "bg-white/10 text-white" : "text-zinc-300"}`}
            >
              <Filter className="w-4 h-4" /> Filtros
            </button>
            <button
              type="button"
              onClick={() => {
                if (showForm) closeForm();
                else {
                  resetForm();
                  setShowForm(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Nuevo ítem
            </button>
          </div>
        </div>

        {showFiltros && (
          <div className="flex items-center gap-4 p-4 bg-zinc-900/40 border border-border-table rounded-md mb-6">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              Categoría
              <select
                value={filtroCategoria}
                onChange={(event) => setFiltroCategoria(event.target.value)}
                className="bg-black/50 border border-border-table text-white text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Todas">Todas</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            {filtroCategoria !== "Todas" && (
              <button type="button" onClick={() => setFiltroCategoria("Todas")} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                Limpiar filtro
              </button>
            )}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleGuardarItem} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-900/50 border border-border-table rounded-md mb-6">
            <Field label="Nombre" className="col-span-2">
              <input required value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. Manual Nivel 2" className={inputClass} />
            </Field>
            <Field label="Tipo">
              <select
                value={tipo}
                onChange={(event) => {
                  const nextType = event.target.value as InventoryItem["tipo"];
                  setTipo(nextType);
                  if (nextType === "Servicio") {
                    setStockActual(0);
                    setStockMinimo(0);
                  }
                }}
                className={inputClass}
              >
                <option value="Producto">Producto</option>
                <option value="Servicio">Servicio</option>
              </select>
            </Field>
            <Field label="Categoría">
              <select value={categoria} onChange={(event) => setCategoria(event.target.value)} className={inputClass}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Precio costo">
              <input type="number" min="0" step="0.01" value={precioCosto} onChange={(event) => setPrecioCosto(event.target.value)} placeholder="0.00" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Precio venta">
              <input type="number" min="0" step="0.01" value={precioVenta} onChange={(event) => setPrecioVenta(event.target.value)} placeholder="0.00" className={`${inputClass} font-mono`} />
            </Field>
            {tipo === "Producto" ? (
              <>
                <Field label="Stock actual">
                  <input type="number" min="0" value={stockActual} onChange={(event) => setStockActual(event.target.value)} placeholder="0" className={`${inputClass} font-mono`} />
                </Field>
                <Field label="Stock mínimo">
                  <input type="number" min="0" value={stockMinimo} onChange={(event) => setStockMinimo(event.target.value)} placeholder="0" className={`${inputClass} font-mono`} />
                </Field>
              </>
            ) : <p className="col-span-2 self-end pb-2 text-xs text-zinc-500">Los servicios no manejan stock.</p>}
            <div className="col-span-2 md:col-span-4 flex justify-end gap-2 mt-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-border-table text-zinc-300 hover:bg-white/5 rounded text-xs font-bold">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded text-xs font-bold">
                {editId ? "Actualizar ítem" : "Guardar ítem"}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto border border-border-table rounded-md">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-zinc-500 bg-black/40 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3 text-right">Precio</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-table">
              {loading ? <EmptyRow text="Cargando catálogo..." /> : inventarioFiltrado.length === 0 ? <EmptyRow text="No se encontraron ítems en esta categoría." /> : inventarioFiltrado.map((item) => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white"><div className="font-medium">{item.nombre}</div><div className="text-[10px] text-zinc-500">{item.tipo}</div></td>
                  <td className="px-4 py-3"><span className="text-xs text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">{item.categoria}</span></td>
                  <td className="px-4 py-3 text-right text-white font-mono"><div>${Number(item.precio_venta).toFixed(2)}</div><div className="text-[10px] text-zinc-500">Costo: ${Number(item.precio_costo).toFixed(2)}</div></td>
                  <td className="px-4 py-3 text-right text-white font-mono">
                    {item.tipo === "Servicio" ? <span className="text-zinc-500 text-xs">No aplica</span> : <><span className={item.stock_actual <= item.stock_minimo ? "text-amber-400 font-bold" : "text-white"}>{item.stock_actual}</span><span className="text-zinc-500 text-[10px]"> / min {item.stock_minimo}</span></>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" title="Editar" onClick={() => handleEditarItem(item)} className="p-1.5 text-zinc-500 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button type="button" title="Eliminar" onClick={() => void handleEliminarItem(item)} className="p-1.5 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const inputClass = "w-full px-3 py-1.5 bg-black/50 border border-border-table rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`space-y-1.5 ${className}`}><span className="block text-xs font-medium text-zinc-400">{label}</span>{children}</label>;
}

function EmptyRow({ text }: { text: string }) {
  return <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-400">{text}</td></tr>;
}
