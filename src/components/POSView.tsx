import { useState, useEffect, useMemo } from "react";
import { Search, ScanBarcode, GraduationCap, Monitor, BookOpen, Book, Layers, Minus, Plus, Edit2, CreditCard, Banknote, X, AlertCircle } from "lucide-react";
import { ModalCobroPOS } from "./ModalCobroPOS";

export function POSView() {
  // --- Estados de Búsqueda de Clientes ---
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // --- Estados de Búsqueda de Ítems ---
  const [category, setCategory] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemResults, setItemResults] = useState<any[]>([]);
  const [includePastCourses, setIncludePastCourses] = useState(false);
  const [cuotaMessage, setCuotaMessage] = useState("");

  // --- Estado del Carrito ---
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<number | null>(null);

  const fetchLastTransaction = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/pagos/historial");
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const match = data[0].id.match(/\d+/);
          if (match) {
            setLastTransactionId(parseInt(match[0], 10));
          } else {
            setLastTransactionId(data.length);
          }
        } else {
          setLastTransactionId(0);
        }
      }
    } catch (err) {
      console.error("Error al obtener último ID:", err);
    }
  };

  useEffect(() => {
    fetchLastTransaction();
  }, []);

  const computedFolio = useMemo(() => {
    const nextId = (lastTransactionId ?? 0) + 1;
    const formattedId = 1000 + nextId;

    if (cart.length === 0) {
      return `V-${formattedId}`;
    }

    const uniqueTypes = Array.from(new Set(cart.map(item => item.type.toLowerCase())));

    if (uniqueTypes.length === 1) {
      const type = uniqueTypes[0];
      if (type === 'curso') return `C-${formattedId}`;
      if (type === 'cuota') return `Q-${formattedId}`;
      if (type === 'inventario') return `F-${formattedId}`;
    }

    return `V-${formattedId}`;
  }, [cart, lastTransactionId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsCobroModalOpen((prev) => {
          if (!prev) {
            if (cart.length > 0) {
              return true;
            }
            return false;
          } else {
            return false;
          }
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  // --- Búsqueda de Clientes ---
  useEffect(() => {
    if (clientSearchQuery.length > 2) {
      fetch(`http://localhost:8000/api/clientes/buscar?q=${clientSearchQuery}`)
        .then(res => res.json())
        .then(data => setClientResults(data))
        .catch(err => console.error(err));
    } else {
      setClientResults([]);
    }
  }, [clientSearchQuery]);

  // --- Búsqueda de Ítems ---
  useEffect(() => {
    const fetchItems = async () => {
      try {
        let results: any[] = [];

        if (category === 'Cursos') {
          const res = await fetch(`http://localhost:8000/api/cursos`);
          let data = await res.json();

          if (!includePastCourses) {
            // Filtrar cursos activos (lógica básica trimestral: fecha inicio en últimos 3 meses o futuro)
            const hoy = new Date();
            const tresMesesAtras = new Date();
            tresMesesAtras.setMonth(hoy.getMonth() - 3);

            data = data.filter((c: any) => {
              const inicio = new Date(c.fecha_inicio);
              return inicio >= tresMesesAtras;
            });
          }

          if (itemSearchQuery) {
            data = data.filter((c: any) => c.nombre.toLowerCase().includes(itemSearchQuery.toLowerCase()));
          }

          results = data.map((c: any) => ({ ...c, _type: 'curso' }));
        }
        else if (category === 'Libros') {
          const res = await fetch(`http://localhost:8000/api/inventario?categoria=Libros`);
          let data = await res.json();
          if (itemSearchQuery) {
            data = data.filter((i: any) => i.nombre.toLowerCase().includes(itemSearchQuery.toLowerCase()));
          }
          results = data.map((i: any) => ({ ...i, _type: 'inventario' }));
        }
        else if (category === 'Cuotas') {
          if (!selectedClient) {
            results = [];
          } else {
            const res = await fetch(`http://localhost:8000/api/cuotas/${selectedClient.id_cliente}/pendientes?tipo_cuota=Mensual`);
            let data = await res.json();
            // Agrupar por cuota individual para mostrarlas como ítems
            results = data.map((cuota: any) => ({
              ...cuota,
              nombre: `Cuota Mensual - ${cuota.mes ? cuota.mes + '/' : ''}${cuota.anio}`,
              precio_venta: cuota.saldo_pendiente ?? cuota.monto,
              _type: 'cuota'
            }));
          }
        }
        else if (category === 'Anual') {
          if (!selectedClient) {
            results = [];
            setCuotaMessage("Selecciona un asociado activo para cobrar una anualidad.");
          } else {
            const res = await fetch(`http://localhost:8000/api/cuotas/${selectedClient.id_cliente}/anualidad-pendiente`, {
              method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "No se pudo preparar la anualidad.");

            const cuota = data.cuota;
            if (cuota.estado_pago === 'PENDIENTE') {
              results = [{
                ...cuota,
                nombre: `Cuota Anual - ${cuota.anio}`,
                precio_venta: cuota.monto,
                _type: 'cuota'
              }];
              setCuotaMessage(`Anualidad ${cuota.anio}${data.creada ? ' generada' : ' pendiente'}: ajusta el importe en el ticket si corresponde.`);
            } else {
              results = [];
              setCuotaMessage(`La anualidad ${cuota.anio} ya está liquidada; sus mensualidades están exentas.`);
            }
          }
        }
        else {
          // Búsqueda general en inventario
          const res = await fetch(`http://localhost:8000/api/inventario`);
          let data = await res.json();
          if (itemSearchQuery) {
            data = data.filter((i: any) => i.nombre.toLowerCase().includes(itemSearchQuery.toLowerCase()));
          }
          results = data.map((i: any) => ({ ...i, _type: 'inventario' }));
        }

        if (category !== 'Anual') setCuotaMessage("");
        setItemResults(results);
      } catch (err) {
        console.error(err);
        setCuotaMessage(err instanceof Error ? err.message : "No se pudieron cargar las cuotas.");
        setItemResults([]);
      }
    };

    fetchItems();
  }, [category, itemSearchQuery, includePastCourses, selectedClient]);


  const handleCategoryClick = (cat: string) => {
    const requiereAsociado = cat === 'Cuotas' || cat === 'Anual';
    const esAsociadoActivo = selectedClient
      && selectedClient.tipo_cliente?.trim().toLowerCase() === 'asociado'
      && selectedClient.estatus_operativo === 'Activo';
    if (requiereAsociado && selectedClient && !esAsociadoActivo) {
      alert("Las cuotas solo están disponibles para asociados con estatus operativo Activo.");
      return;
    }
    if (category === cat) {
      setCategory(null); // Toggle off
    } else {
      setCategory(cat);
    }
    setItemSearchQuery(""); // Limpiar búsqueda al cambiar categoría
  };

  const getDynamicCoursePrice = (curso: any) => {
    if (!selectedClient) return curso.precio_general;

    const tipo = selectedClient.tipo_cliente?.toLowerCase() || '';
    if (tipo.includes('estudiante')) return curso.precio_estudiante;
    if (tipo.includes('asociado') && tipo.includes('externo')) return curso.precio_asociado_externo;
    if (tipo.includes('asociado')) return curso.precio_asociado;
    if (tipo.includes('colaborador')) return curso.precio_colaborador;

    return curso.precio_general;
  };

  const addToCart = (item: any) => {
    // Si es inventario y no hay stock
    if (item._type === 'inventario' && item.tipo === 'Producto' && item.stock_actual <= 0) {
      alert("No hay stock disponible.");
      return;
    }

    let price = item.precio_venta || 0;
    if (item._type === 'curso') {
      price = getDynamicCoursePrice(item);
    }
    //modiicacion chatgpt
    const existingItem = cart.find(
      cartItem =>
        cartItem.type === "inventario" &&
        cartItem.originalData?.tipo === "Producto" &&
        cartItem.id === item.id
    );
    if (existingItem) {
      const maximumStock = Number(item.stock_actual) || 0;

      if (existingItem.quantity >= maximumStock) {
        alert(`No puedes agregar más unidades. Stock disponible: ${maximumStock}.`);
        return;
      }

      updateCartQuantity(
        existingItem.cartId,
        existingItem.quantity + 1
      );

      return;
    }
    //fin 
    const cartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      id: item.id || item.id_curso || item.id_cuota,
      name: item.nombre,
      price: price,
      quantity: 1,
      type: item._type,
      originalData: item
    };

    setCart([...cart, cartItem]);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const updateCartPrice = (cartId: string, newPrice: string) => {
    setCart(cart.map(item => item.cartId === cartId ? { ...item, price: newPrice } : item));
  };
  // modiicacion chatgpt
  const isStockProduct = (item: any) => {
    return item.type === 'inventario' && item.originalData.tipo === 'Producto'
  }
  const updateCartQuantity = (cartId: string, newQuantity: number) => {
    setCart(currentCart =>
      currentCart.map(item => {
        if (item.cartId !== cartId) return item;
        if (!isStockProduct(item)) return item;

        const maximumStock = Number(item.originalData?.stock_actual) || 0;
        const normalizedQuantity = Math.max(
          1,
          Math.min(newQuantity, maximumStock)
        );

        return {
          ...item,
          quantity: normalizedQuantity
        };
      })
    );
  };
  //Fin
  const getCartItemPrice = (item: any) => {
    const price = Number(item.price);
    return Number.isFinite(price) ? price : 0;
  };


  const subtotal = cart.reduce((acc, item) => acc + (getCartItemPrice(item) * item.quantity), 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-64px)] flex gap-6">
      {/* Left Column - Products & Search */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

        {/* Client Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar Cliente (Nombre o Teléfono)..."
            value={clientSearchQuery}
            onChange={(e) => setClientSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-900/30 border border-border-table rounded-custom text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {selectedClient && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500/20 text-blue-400 px-3 py-1 rounded flex items-center gap-2 text-sm">
              {selectedClient.nombre} ({selectedClient.tipo_cliente})
              <button onClick={() => setSelectedClient(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Autocomplete Clientes */}
          {!selectedClient && clientResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-border-table rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
              {clientResults.map(client => (
                <div
                  key={client.id_cliente}
                  className="px-4 py-2 hover:bg-zinc-800 cursor-pointer text-sm text-white flex justify-between"
                  onClick={() => {
                    setSelectedClient(client);
                    setClientSearchQuery("");
                  }}
                >
                  <span>{client.nombre}</span>
                  <span className="text-zinc-500 text-xs">{client.telefono} - {client.tipo_cliente}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categorías (Accesos Rápidos) */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => handleCategoryClick('Cursos')}
            className={`p-4 border rounded-custom flex flex-col items-center gap-2 transition-colors ${category === 'Cursos' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-zinc-900/30 border-border-table text-zinc-400 hover:bg-white/5'}`}
          >
            <GraduationCap className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Cursos</span>
          </button>
          <button
            onClick={() => handleCategoryClick('Libros')}
            className={`p-4 border rounded-custom flex flex-col items-center gap-2 transition-colors ${category === 'Libros' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-zinc-900/30 border-border-table text-zinc-400 hover:bg-white/5'}`}
          >
            <Book className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Libros</span>
          </button>
          <button
            onClick={() => handleCategoryClick('Cuotas')}
            className={`p-4 border rounded-custom flex flex-col items-center gap-2 transition-colors ${category === 'Cuotas' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900/30 border-border-table text-zinc-400 hover:bg-white/5'}`}
          >
            <Monitor className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Cuota Mensual</span>
          </button>
          <button
            onClick={() => handleCategoryClick('Anual')}
            className={`p-4 border rounded-custom flex flex-col items-center gap-2 transition-colors ${category === 'Anual' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-zinc-900/30 border-border-table text-zinc-400 hover:bg-white/5'}`}
          >
            <Layers className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Cuota Anual</span>
          </button>
        </div>

        {/* Buscador de Productos/Servicios */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <ScanBarcode className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={category ? `Buscando en ${category}...` : "Buscar productos generales..."}
              value={itemSearchQuery}
              onChange={(e) => setItemSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-900/30 border border-border-table rounded-custom text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {category === 'Cursos' && (
            <div className="flex items-center gap-4 px-2">
              <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono">Periodo Actual (Activos)</span>
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={includePastCourses} onChange={(e) => setIncludePastCourses(e.target.checked)} className="rounded bg-zinc-900 border-zinc-700" />
                Incluir cursos históricos (3 trimestres)
              </label>
            </div>
          )}
        </div>

        {/* Resultados de Búsqueda */}
        <div className="flex-1 overflow-y-auto">
          {category === 'Cuotas' && !selectedClient && (
            <div className="text-center p-8 bg-zinc-900/30 border border-border-table rounded flex flex-col items-center">
              <AlertCircle className="w-8 h-8 text-zinc-500 mb-2" />
              <p className="text-sm text-zinc-400">Selecciona un cliente primero para ver sus cuotas pendientes.</p>
            </div>
          )}
          {category === 'Anual' && cuotaMessage && (
            <div className="text-center p-4 mb-4 bg-purple-500/10 border border-purple-500/20 rounded text-sm text-purple-200">
              {cuotaMessage}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {itemResults.map((item, idx) => {
              const isOutStock = item._type === 'inventario' && item.tipo === 'Producto' && item.stock_actual <= 0;
              const isLowStock = item._type === 'inventario' && item.tipo === 'Producto' && item.stock_actual > 0 && item.stock_actual <= item.stock_minimo;
              const coursePrice = item._type === 'curso' ? getDynamicCoursePrice(item) : item.precio_venta;

              return (
                <div key={idx} className="relative flex flex-col justify-between p-4 bg-zinc-900/30 border border-border-table rounded-custom hover:bg-white/5 transition-colors group">
                  <div>
                    <h4 className="text-sm font-medium text-white line-clamp-2">{item.nombre}</h4>
                    {item._type === 'inventario' && item.tipo === 'Producto' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOutStock ? 'bg-red-500/20 text-red-400' : isLowStock ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {item.stock_actual} en stock
                        </span>
                        <button
                          onClick={async () => {
                            const val = prompt(`Ajustar stock de ${item.nombre}. Stock actual: ${item.stock_actual}\nNuevo stock:`, item.stock_actual.toString());
                            if (val !== null && !isNaN(parseInt(val))) {
                              try {
                                await fetch(`http://localhost:8000/api/inventario/${item.id}/stock`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ nuevo_stock: parseInt(val) })
                                });
                                // Force refresh
                                setItemSearchQuery(itemSearchQuery + " ");
                                setTimeout(() => setItemSearchQuery(itemSearchQuery.trim()), 50);
                              } catch (e) { alert("Error ajustando stock") }
                            }
                          }}
                          className="text-zinc-500 hover:text-white" title="Ajuste rápido"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {item._type === 'curso' && (
                      <p className="text-[10px] text-zinc-500 mt-1 font-mono">{item.fecha_inicio} al {item.fecha_fin}</p>
                    )}
                  </div>
                  <div className="flex items-end justify-between mt-4">
                    <span className="text-sm font-mono text-white font-bold">${coursePrice?.toFixed(2) || '0.00'}</span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={isOutStock}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${isOutStock ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Column - Current Ticket */}
      <div className="w-[420px] flex flex-col bg-zinc-900/30 border border-border-table rounded-custom overflow-hidden flex-shrink-0">
        <div className="p-5 border-b border-border-table flex items-center justify-between bg-black/20">
          <h2 className="text-lg font-bold text-white">Ticket Actual</h2>
          <span className="text-sm font-mono text-zinc-400">{computedFolio}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-zinc-500">
              El carrito está vacío
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartId} className="p-3 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 pb-4 mb-2">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-white">{item.name}</span>
                  <button onClick={() => removeFromCart(item.cartId)} className="text-zinc-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="space-y-2">
                    <span className="block text-xs text-zinc-500 uppercase">
                      {item.type}
                    </span>

                    {isStockProduct(item) ? (
                      <div className="space-y-1">
                        <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                          Cantidad
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.cartId, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center rounded border border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={`Disminuir cantidad de ${item.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            max={item.originalData?.stock_actual}
                            value={item.quantity}
                            onChange={(event) =>
                              updateCartQuantity(
                                item.cartId,
                                Number(event.target.value)
                              )
                            }
                            className="w-14 h-7 rounded border border-white/10 bg-black/30 text-center font-mono text-sm text-white focus:outline-none focus:border-blue-500"
                            aria-label={`Cantidad de ${item.name}`}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.cartId, item.quantity + 1)
                            }
                            disabled={
                              item.quantity >=
                              Number(item.originalData?.stock_actual || 0)
                            }
                            className="w-7 h-7 flex items-center justify-center rounded border border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={`Aumentar cantidad de ${item.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="block text-xs text-zinc-500">
                        Cantidad: 1
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                      Precio unitario
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-xs">$</span>

                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          updateCartPrice(item.cartId, e.target.value)
                        }
                        className="w-20 bg-black/50 border border-zinc-700 rounded px-2 py-1 text-sm text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-zinc-500">
                    Importe
                  </span>

                  <span className="font-mono text-sm font-bold text-white">
                    $
                    {(
                      getCartItemPrice(item) * item.quantity
                    ).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div> {/* aqui termina*/}

        {/* Ticket Footer */}
        <div className="bg-black/40 border-t border-border-table p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="font-mono text-zinc-300">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
              <span className="text-white">Total</span>
              <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                if (cart.length > 0) {
                  setIsCobroModalOpen(true);
                }
              }}
              disabled={isCheckingOut || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md text-sm font-bold transition-colors"
            >
              <Banknote className="w-4 h-4" />
              {isCheckingOut ? "Procesando..." : "Cobrar"}
            </button>
          </div>
        </div>
      </div>

      <ModalCobroPOS
        isOpen={isCobroModalOpen}
        onClose={() => setIsCobroModalOpen(false)}
        clientName={selectedClient?.nombre}
        client={selectedClient}
        amount={subtotal}
        cartItems={cart}
        onSuccess={() => {
          setCart([]);
          fetchLastTransaction();
          setItemSearchQuery(prev => prev + " ");
          setTimeout(() => setItemSearchQuery(prev => prev.trim()), 50);
        }}
      />
    </div>
  );
}
