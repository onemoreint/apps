import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { cop, leerPesos } from '@/core/dinero';
import { Ilustracion } from '@/tienda/Ilustracion';
import { db, textoError } from './cliente';
import { borrarFoto, subirFoto } from './fotos';
import { Area, Boton, Campo, Entrada, Interruptor, Tarjeta, Vacio, claseCampo, notificar } from './ui';
import type { CategoriaFila, ProductoFila, TiendaFila, VarianteFila } from './tipos';

const VACIO: Omit<ProductoFila, 'id' | 'tienda_id'> = {
  categoria_id: null,
  nombre: '',
  descripcion: '',
  precio: 0,
  presentacion: '',
  fotos: [],
  activo: true,
  disponible: true,
  destacado: false,
  nuevo: false,
  por_encargo: false,
  horas_preparacion: 24,
  cantidad_minima: 1,
  sabores: [],
  sabores_max: 1,
  ingredientes: '',
  alergenos: '',
  conservacion: '',
  orden: 0,
};

export function Productos({ tienda }: { tienda: TiendaFila }) {
  const [productos, setProductos] = useState<ProductoFila[] | null>(null);
  const [categorias, setCategorias] = useState<CategoriaFila[]>([]);
  const [editando, setEditando] = useState<ProductoFila | 'nuevo' | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    const [p, c] = await Promise.all([
      db().from('dp_productos').select('*, dp_variantes(id, nombre, precio, disponible, orden)').eq('tienda_id', tienda.id).order('orden').order('nombre'),
      db().from('dp_categorias').select('*').eq('tienda_id', tienda.id).order('orden').order('nombre'),
    ]);
    if (p.error || c.error) return notificar(textoError(p.error ?? c.error), 'error');
    setProductos(p.data as ProductoFila[]);
    setCategorias(c.data as CategoriaFila[]);
  }, [tienda.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const alternar = async (p: ProductoFila, campo: 'activo' | 'disponible' | 'destacado') => {
    const valor = !p[campo];
    setProductos((ps) => (ps ?? []).map((x) => (x.id === p.id ? { ...x, [campo]: valor } : x)));
    const { error } = await db().from('dp_productos').update({ [campo]: valor }).eq('id', p.id);
    if (error) {
      notificar(textoError(error), 'error');
      void cargar();
    }
  };

  const mover = async (lista: ProductoFila[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const reordenada = [...lista];
    [reordenada[i], reordenada[j]] = [reordenada[j]!, reordenada[i]!];
    const cambios = reordenada.map((p, k) => ({ id: p.id, orden: k + 1 }));
    setProductos((ps) => (ps ?? []).map((p) => ({ ...p, orden: cambios.find((c) => c.id === p.id)?.orden ?? p.orden })).sort((a, b) => a.orden - b.orden));
    const res = await Promise.all(cambios.map((c) => db().from('dp_productos').update({ orden: c.orden }).eq('id', c.id)));
    if (res.some((r) => r.error)) notificar('No se pudo guardar el orden', 'error');
  };

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const ps = (productos ?? []).filter((p) => !q || p.nombre.toLowerCase().includes(q));
    const res = categorias.map((c) => ({ id: c.id, nombre: c.nombre + (c.activa ? '' : ' (oculta)'), productos: ps.filter((p) => p.categoria_id === c.id) }));
    const sin = ps.filter((p) => !categorias.some((c) => c.id === p.categoria_id));
    if (sin.length) res.push({ id: '', nombre: 'Sin categoría', productos: sin });
    return res.filter((g) => g.productos.length > 0);
  }, [productos, categorias, busqueda]);

  if (editando) {
    return (
      <EditorProducto
        tienda={tienda}
        categorias={categorias}
        producto={editando === 'nuevo' ? null : editando}
        siguienteOrden={(productos?.length ?? 0) + 1}
        cerrar={(recargar) => {
          setEditando(null);
          if (recargar) void cargar();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primario">Productos</h1>
          <p className="text-sm text-tinta-2">Lo que ves aquí es lo que muestra tu tienda, en este orden.</p>
        </div>
        <Boton onClick={() => setEditando('nuevo')}>
          <Plus size={16} /> Nuevo producto
        </Boton>
      </div>
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
        <input type="search" className={`${claseCampo} mt-0 pl-9`} placeholder="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </label>

      {productos === null ? (
        <p className="py-10 text-center text-tinta-3">Cargando…</p>
      ) : productos.length === 0 ? (
        <Vacio titulo="Aún no tienes productos" texto="Crea el primero con su foto, precio y presentaciones.">
          <Boton onClick={() => setEditando('nuevo')}>
            <Plus size={16} /> Crear producto
          </Boton>
        </Vacio>
      ) : (
        grupos.map((g) => (
          <Tarjeta key={g.id || 'sin'} titulo={g.nombre}>
            <ul className="divide-y divide-linea">
              {g.productos.map((p, i) => (
                <li key={p.id} className={`flex items-center gap-3 py-3 ${!p.activo ? 'opacity-55' : ''}`}>
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-crema-2">
                    {p.fotos[0] ? (
                      <img src={p.fotos[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Ilustracion texto={`${p.nombre} ${g.nombre}`} className="h-full w-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-tinta">{p.nombre}</p>
                    <p className="text-xs text-tinta-3">
                      <span className="precio">{cop(p.precio)}</span>
                      {(p.dp_variantes?.length ?? 0) > 0 && ` · ${p.dp_variantes!.length} presentaciones`}
                      {!p.disponible && <span className="ml-1 font-semibold text-peligro">· Agotado</span>}
                      {p.destacado && <span className="ml-1 font-semibold text-acento">· Destacado</span>}
                      {!p.activo && <span className="ml-1 font-semibold">· Oculto</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconoBoton etiqueta="Subir" onClick={() => void mover(g.productos, i, -1)} disabled={i === 0}>
                      <ArrowUp size={16} />
                    </IconoBoton>
                    <IconoBoton etiqueta="Bajar" onClick={() => void mover(g.productos, i, 1)} disabled={i === g.productos.length - 1}>
                      <ArrowDown size={16} />
                    </IconoBoton>
                    <IconoBoton etiqueta={p.activo ? 'Ocultar de la tienda' : 'Mostrar en la tienda'} onClick={() => void alternar(p, 'activo')}>
                      {p.activo ? <Eye size={16} /> : <EyeOff size={16} />}
                    </IconoBoton>
                    <button
                      type="button"
                      onClick={() => void alternar(p, 'disponible')}
                      className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${p.disponible ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700'}`}
                      title="Cambiar disponibilidad"
                    >
                      {p.disponible ? 'Disponible' : 'Agotado'}
                    </button>
                    <IconoBoton etiqueta="Editar" onClick={() => setEditando(p)}>
                      <Pencil size={16} />
                    </IconoBoton>
                  </div>
                </li>
              ))}
            </ul>
          </Tarjeta>
        ))
      )}
    </div>
  );
}

function IconoBoton({ etiqueta, onClick, disabled, children }: { etiqueta: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className="grid h-9 w-9 place-items-center rounded-full text-tinta-2 hover:bg-crema-2 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function EditorProducto({
  tienda,
  categorias,
  producto,
  siguienteOrden,
  cerrar,
}: {
  tienda: TiendaFila;
  categorias: CategoriaFila[];
  producto: ProductoFila | null;
  siguienteOrden: number;
  cerrar: (recargar: boolean) => void;
}) {
  const [p, setP] = useState(() => {
    const { dp_variantes: _v, ...resto } = producto ?? { ...VACIO, id: '', tienda_id: tienda.id, orden: siguienteOrden };
    return resto as ProductoFila;
  });
  const [variantes, setVariantes] = useState<VarianteFila[]>(() =>
    [...(producto?.dp_variantes ?? [])].sort((a, b) => a.orden - b.orden).map((v) => ({ ...v })),
  );
  const [saboresTexto, setSaboresTexto] = useState((producto?.sabores ?? []).join(', '));
  const [precioTexto, setPrecioTexto] = useState(producto ? String(producto.precio) : '');
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const nuevasFotos = useMemo(() => new Set<string>(), []);

  const cambiar = (c: Partial<ProductoFila>) => setP((x) => ({ ...x, ...c }));

  const agregarFotos = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    const libres = 5 - p.fotos.length;
    if (libres <= 0) return notificar('Máximo 5 fotos por producto', 'error');
    setSubiendo(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(archivos).slice(0, libres)) {
        const url = await subirFoto(tienda.id, f);
        nuevasFotos.add(url);
        urls.push(url);
      }
      setP((x) => ({ ...x, fotos: [...x.fotos, ...urls] }));
    } catch (e) {
      notificar(textoError(e), 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const quitarFoto = (url: string) => {
    setP((x) => ({ ...x, fotos: x.fotos.filter((f) => f !== url) }));
    // Una foto recién subida y descartada se borra de inmediato; las anteriores, al guardar.
    if (nuevasFotos.has(url)) void borrarFoto(url);
  };

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (p.nombre.trim().length < 2) e.nombre = 'Escribe el nombre del producto.';
    const precio = leerPesos(precioTexto);
    if (precio === null) e.precio = 'Escribe el precio en pesos.';
    variantes.forEach((v, i) => {
      if (!v.nombre.trim()) e[`v${i}`] = 'Ponle nombre a la presentación.';
    });
    if (p.horas_preparacion < 0 || p.horas_preparacion > 720) e.horas = 'Entre 0 y 720 horas.';
    if (p.cantidad_minima < 1) e.minimo = 'Mínimo 1.';
    return e;
  };

  const guardar = async () => {
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length) return notificar('Revisa los campos marcados', 'error');
    setGuardando(true);
    const sabores = Array.from(new Set(saboresTexto.split(',').map((s) => s.trim()).filter(Boolean)));
    const fila = {
      tienda_id: tienda.id,
      categoria_id: p.categoria_id || null,
      nombre: p.nombre.trim(),
      descripcion: p.descripcion.trim(),
      precio: leerPesos(precioTexto) ?? 0,
      presentacion: p.presentacion.trim(),
      fotos: p.fotos,
      activo: p.activo,
      disponible: p.disponible,
      destacado: p.destacado,
      nuevo: p.nuevo,
      por_encargo: p.por_encargo,
      horas_preparacion: Math.round(p.horas_preparacion),
      cantidad_minima: Math.round(p.cantidad_minima),
      sabores,
      sabores_max: Math.min(Math.max(1, Math.round(p.sabores_max)), Math.max(1, sabores.length)),
      ingredientes: p.ingredientes.trim(),
      alergenos: p.alergenos.trim(),
      conservacion: p.conservacion.trim(),
      orden: p.orden,
    };
    try {
      let id = p.id;
      if (id) {
        const { error } = await db().from('dp_productos').update(fila).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await db().from('dp_productos').insert(fila).select('id').single();
        if (error) throw error;
        id = data.id as string;
      }
      // Presentaciones: se actualizan, crean y eliminan para que coincidan con el formulario.
      const antes = producto?.dp_variantes ?? [];
      const quedan = new Set(variantes.filter((v) => v.id).map((v) => v.id));
      const borrar = antes.filter((v) => !quedan.has(v.id)).map((v) => v.id);
      if (borrar.length) {
        const { error } = await db().from('dp_variantes').delete().in('id', borrar);
        if (error) throw error;
      }
      for (const [i, v] of variantes.entries()) {
        const datos = { tienda_id: tienda.id, producto_id: id, nombre: v.nombre.trim(), precio: v.precio, disponible: v.disponible, orden: i + 1 };
        const { error } = v.id
          ? await db().from('dp_variantes').update(datos).eq('id', v.id)
          : await db().from('dp_variantes').insert(datos);
        if (error) throw error;
      }
      // Fotos que se quitaron de un producto existente.
      for (const url of producto?.fotos ?? []) if (!p.fotos.includes(url)) void borrarFoto(url);
      notificar('Producto guardado');
      cerrar(true);
    } catch (err) {
      notificar(textoError(err), 'error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!p.id) return cerrar(false);
    if (!window.confirm(`¿Eliminar "${p.nombre}"? Si solo quieres dejar de mostrarlo, usa "Mostrar en la tienda".`)) return;
    const { error } = await db().from('dp_productos').delete().eq('id', p.id);
    if (error) return notificar(textoError(error), 'error');
    for (const url of p.fotos) void borrarFoto(url);
    notificar('Producto eliminado');
    cerrar(true);
  };

  const descartar = () => {
    for (const url of nuevasFotos) void borrarFoto(url);
    cerrar(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primario">{p.id ? 'Editar producto' : 'Nuevo producto'}</h1>
        <div className="flex gap-2">
          <Boton variante="suave" onClick={descartar}>
            Cancelar
          </Boton>
          <Boton onClick={() => void guardar()} cargando={guardando} disabled={subiendo}>
            Guardar
          </Boton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Tarjeta titulo="Información">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre *" className="sm:col-span-2">
                <Entrada value={p.nombre} maxLength={80} onChange={(e) => cambiar({ nombre: e.target.value })} aria-invalid={!!errores.nombre} />
                {errores.nombre && <span className="text-xs font-medium text-peligro">{errores.nombre}</span>}
              </Campo>
              <Campo etiqueta="Categoría">
                <select className={claseCampo} value={p.categoria_id ?? ''} onChange={(e) => cambiar({ categoria_id: e.target.value || null })}>
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Precio (COP) *" ayuda={variantes.length ? 'Precio base; cada presentación puede tener el suyo.' : undefined}>
                <Entrada inputMode="numeric" value={precioTexto} onChange={(e) => setPrecioTexto(e.target.value)} placeholder="45000" aria-invalid={!!errores.precio} />
                {errores.precio && <span className="text-xs font-medium text-peligro">{errores.precio}</span>}
              </Campo>
              <Campo etiqueta="Tamaño, peso o presentación" className="sm:col-span-2" ayuda="Ej.: 1 libra · 20 porciones, caja x 6, vaso de 9 oz.">
                <Entrada value={p.presentacion} maxLength={80} onChange={(e) => cambiar({ presentacion: e.target.value })} />
              </Campo>
              <Campo etiqueta="Descripción" className="sm:col-span-2">
                <Area value={p.descripcion} maxLength={1000} onChange={(e) => cambiar({ descripcion: e.target.value })} />
              </Campo>
            </div>
          </Tarjeta>

          <Tarjeta
            titulo="Presentaciones y precios"
            acciones={
              <Boton variante="secundario" onClick={() => setVariantes((v) => [...v, { nombre: '', precio: null, disponible: true, orden: v.length + 1 }])}>
                <Plus size={16} /> Agregar
              </Boton>
            }
          >
            {variantes.length === 0 ? (
              <p className="text-sm text-tinta-3">
                Opcional. Úsalas cuando el producto tenga tamaños o cajas con precios distintos (½ libra, 1 libra…). Si las agregas, el
                cliente debe elegir una.
              </p>
            ) : (
              <ul className="space-y-3">
                {variantes.map((v, i) => (
                  <li key={v.id ?? `n${i}`} className="grid grid-cols-[1fr_120px_auto] items-end gap-2">
                    <Campo etiqueta={`Presentación ${i + 1}`}>
                      <Entrada
                        value={v.nombre}
                        maxLength={60}
                        onChange={(e) => setVariantes((vs) => vs.map((x, k) => (k === i ? { ...x, nombre: e.target.value } : x)))}
                        aria-invalid={!!errores[`v${i}`]}
                      />
                    </Campo>
                    <Campo etiqueta="Precio">
                      <Entrada
                        inputMode="numeric"
                        value={v.precio ?? ''}
                        placeholder="Base"
                        onChange={(e) => setVariantes((vs) => vs.map((x, k) => (k === i ? { ...x, precio: leerPesos(e.target.value) } : x)))}
                      />
                    </Campo>
                    <div className="flex items-center gap-1 pb-1">
                      <label className="flex items-center gap-1 text-xs text-tinta-2" title="Disponible">
                        <input
                          type="checkbox"
                          checked={v.disponible}
                          onChange={(e) => setVariantes((vs) => vs.map((x, k) => (k === i ? { ...x, disponible: e.target.checked } : x)))}
                          className="h-4 w-4 accent-[var(--primario)]"
                        />
                        Disp.
                      </label>
                      <IconoBoton etiqueta="Quitar presentación" onClick={() => setVariantes((vs) => vs.filter((_, k) => k !== i))}>
                        <Trash2 size={16} />
                      </IconoBoton>
                    </div>
                    {errores[`v${i}`] && <span className="col-span-3 text-xs font-medium text-peligro">{errores[`v${i}`]}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Sabores y pedido">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Sabores" className="sm:col-span-2" ayuda="Sepáralos con comas. Vacío = sin elección de sabor.">
                <Entrada value={saboresTexto} onChange={(e) => setSaboresTexto(e.target.value)} placeholder="Chocolate, Vainilla, Arequipe" />
              </Campo>
              <Campo etiqueta="Sabores que puede elegir" ayuda="Útil para cajas y combos surtidos.">
                <Entrada type="number" min={1} max={24} value={p.sabores_max} onChange={(e) => cambiar({ sabores_max: Number(e.target.value) || 1 })} />
              </Campo>
              <Campo etiqueta="Cantidad mínima">
                <Entrada type="number" min={1} max={500} value={p.cantidad_minima} onChange={(e) => cambiar({ cantidad_minima: Number(e.target.value) || 1 })} />
              </Campo>
              <Campo etiqueta="Tiempo mínimo de preparación (horas)" ayuda="24 = un día de anticipación · 48 = dos días · 0 = para el mismo día.">
                <Entrada type="number" min={0} max={720} step={1} value={p.horas_preparacion} onChange={(e) => cambiar({ horas_preparacion: Number(e.target.value) || 0 })} />
                {errores.horas && <span className="text-xs font-medium text-peligro">{errores.horas}</span>}
              </Campo>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Ingredientes y cuidados">
            <p className="mb-3 text-xs text-tinta-3">Completa solo con información que tengas confirmada. Si no aplica, déjalo vacío y no se mostrará.</p>
            <div className="grid gap-4">
              <Campo etiqueta="Ingredientes">
                <Area value={p.ingredientes} onChange={(e) => cambiar({ ingredientes: e.target.value })} />
              </Campo>
              <Campo etiqueta="Alérgenos" ayuda="Ej.: contiene gluten, leche, huevo, frutos secos.">
                <Entrada value={p.alergenos} onChange={(e) => cambiar({ alergenos: e.target.value })} />
              </Campo>
              <Campo etiqueta="Conservación">
                <Entrada value={p.conservacion} onChange={(e) => cambiar({ conservacion: e.target.value })} placeholder="Mantener refrigerado. Consumir en 3 días." />
              </Campo>
            </div>
          </Tarjeta>
        </div>

        <div className="space-y-4">
          <Tarjeta titulo="Fotos">
            <p className="mb-3 text-xs text-tinta-3">Usa fotos reales de tus productos. Se optimizan automáticamente. Máximo 5; la primera es la principal.</p>
            <div className="grid grid-cols-3 gap-2">
              {p.fotos.map((f, i) => (
                <div key={f} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-linea">
                  <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => quitarFoto(f)}
                    aria-label="Quitar foto"
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-tinta/70 text-white"
                  >
                    <X size={14} />
                  </button>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => setP((x) => ({ ...x, fotos: [f, ...x.fotos.filter((y) => y !== f)] }))}
                      className="absolute bottom-1 left-1 rounded-full bg-papel/90 px-2 py-0.5 text-[10px] font-semibold"
                    >
                      Principal
                    </button>
                  )}
                </div>
              ))}
              {p.fotos.length < 5 && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-linea text-tinta-3 hover:border-acento hover:text-acento">
                  {subiendo ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  <input type="file" accept="image/*" multiple className="sr-only" disabled={subiendo} onChange={(e) => void agregarFotos(e.target.files)} />
                </label>
              )}
            </div>
            {p.fotos.length === 0 && <p className="mt-2 text-xs text-tinta-3">Sin foto, la tienda muestra una imagen ilustrativa marcada como tal.</p>}
          </Tarjeta>

          <Tarjeta titulo="Visibilidad">
            <div className="space-y-4">
              <Interruptor activo={p.activo} onChange={(v) => cambiar({ activo: v })} etiqueta="Mostrar en la tienda" ayuda="Apágalo para ocultarlo sin borrarlo." />
              <Interruptor activo={p.disponible} onChange={(v) => cambiar({ disponible: v })} etiqueta="Disponible" ayuda="Apagado = se muestra como agotado." />
              <Interruptor activo={p.destacado} onChange={(v) => cambiar({ destacado: v })} etiqueta="Destacado" ayuda="Aparece en la página de inicio." />
              <Interruptor activo={p.nuevo} onChange={(v) => cambiar({ nuevo: v })} etiqueta="Nuevo" />
              <Interruptor activo={p.por_encargo} onChange={(v) => cambiar({ por_encargo: v })} etiqueta="Por encargo" ayuda="Indica que se prepara bajo pedido." />
            </div>
          </Tarjeta>

          {p.id && (
            <Boton variante="peligro" onClick={() => void eliminar()} className="w-full">
              <Trash2 size={16} /> Eliminar producto
            </Boton>
          )}
        </div>
      </div>
    </div>
  );
}
