import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock, Info, Snowflake, ShoppingBag } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { cop } from '@/core/dinero';
import { precioUnitario } from '@/core/carrito';
import { textoPreparacion } from '@/core/fechas';
import { enlace, ir } from '@/app/ruta';
import { Cantidad, Etiquetas, FotoProducto, Precio, TarjetaProducto, nombreCategoria } from './partes';
import { useTienda } from './estado';

export function Ficha({ catalogo, id }: { catalogo: Catalogo; id: string }) {
  const p = catalogo.productos.find((x) => x.id === id);
  const agregar = useTienda((s) => s.agregar);
  const avisar = useTienda((s) => s.avisar);
  const primeraVariante = p?.variantes.find((v) => v.disponible)?.id ?? null;
  const [varianteId, setVarianteId] = useState<string | null>(primeraVariante);
  const [sabores, setSabores] = useState<string[]>(p && p.sabores.length === 1 ? [p.sabores[0]!] : []);
  const [cantidad, setCantidad] = useState(p?.cantidad_minima ?? 1);
  const [foto, setFoto] = useState(0);
  const [intento, setIntento] = useState(false);

  const relacionados = useMemo(
    () =>
      p
        ? catalogo.productos.filter((x) => x.id !== p.id && x.disponible && x.categoria_id === p.categoria_id).slice(0, 4)
        : [],
    [catalogo, p],
  );

  if (!p) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-primario">Este producto ya no está disponible</h1>
        <a href={enlace('/catalogo')} className="mt-4 inline-block font-semibold text-acento hover:underline">
          Ver el catálogo
        </a>
      </div>
    );
  }

  const categoria = nombreCategoria(catalogo, p.categoria_id);
  const variante = p.variantes.find((v) => v.id === varianteId) ?? null;
  const precio = precioUnitario(p, variante);
  const faltaVariante = p.variantes.length > 0 && !variante;
  const faltaSabor = p.sabores.length > 0 && sabores.length === 0;

  const alternarSabor = (s: string) => {
    if (p.sabores_max === 1) return setSabores([s]);
    setSabores((act) => (act.includes(s) ? act.filter((x) => x !== s) : act.length >= p.sabores_max ? act : [...act, s]));
  };

  const agregarAlCarrito = (irAlCarrito: boolean) => {
    setIntento(true);
    if (!p.disponible || faltaVariante || faltaSabor) return;
    // Orden alfabético, igual que el registro del servidor.
    const ordenados = [...sabores].sort((a, b) => a.localeCompare(b, 'es'));
    agregar({ producto_id: p.id, variante_id: variante?.id ?? null, sabores: ordenados, cantidad });
    avisar(`Agregado: ${p.nombre}`);
    ir(irAlCarrito ? '/carrito' : '/catalogo');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-4">
      <button
        type="button"
        onClick={() => (history.length > 1 ? history.back() : ir('/catalogo'))}
        className="mb-3 inline-flex items-center gap-1.5 rounded-full py-2 pr-3 text-sm font-medium text-tinta-2 hover:text-primario"
      >
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div>
          <FotoProducto
            producto={{ ...p, fotos: p.fotos.slice(foto, foto + 1).concat(p.fotos) }}
            referencia={catalogo.tienda.demo}
            className="aspect-square rounded-3xl ring-1 ring-linea"
            grande
          />
          {p.fotos.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.fotos.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFoto(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  className={`h-16 w-16 overflow-hidden rounded-xl ring-2 ${i === foto ? 'ring-acento' : 'ring-transparent'}`}
                >
                  <img src={f} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="aparecer">
          {categoria && <p className="text-sm font-medium uppercase tracking-[0.12em] text-acento">{categoria}</p>}
          <h1 className="mt-1 text-3xl font-semibold leading-tight text-primario sm:text-4xl">{p.nombre}</h1>
          <div className="mt-3">
            <Etiquetas p={p} />
          </div>
          <p className="text-2xl font-bold text-tinta">
            {variante ? <span className="precio">{cop(precio)}</span> : <Precio p={p} />}
          </p>
          {p.presentacion && <p className="mt-1 text-tinta-3">{p.presentacion}</p>}
          {p.descripcion && <p className="mt-4 text-[1.02rem] text-tinta-2">{p.descripcion}</p>}

          <ul className="mt-4 space-y-1.5 text-[14px] text-tinta-2">
            <li className="flex items-center gap-2">
              <Clock size={16} className="text-acento" /> {textoPreparacion(p.horas_preparacion)}
            </li>
            {p.cantidad_minima > 1 && (
              <li className="flex items-center gap-2">
                <Info size={16} className="text-acento" /> Pedido mínimo: {p.cantidad_minima} unidades
              </li>
            )}
            {p.por_encargo && (
              <li className="flex items-center gap-2">
                <Info size={16} className="text-acento" /> Se prepara por encargo; la vendedora confirma la fecha.
              </li>
            )}
          </ul>

          {!p.disponible && (
            <p className="mt-5 rounded-xl bg-crema-2 px-4 py-3 font-medium text-tinta-2 ring-1 ring-linea">
              Agotado por ahora. Escríbenos por WhatsApp si quieres saber cuándo vuelve.
            </p>
          )}

          {p.disponible && (
            <div className="mt-6 space-y-5">
              {p.variantes.length > 0 && (
                <fieldset>
                  <legend className="mb-2 font-semibold text-tinta">Presentación</legend>
                  <div className="grid gap-2">
                    {p.variantes.map((v) => (
                      <label
                        key={v.id}
                        className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1 transition ${
                          !v.disponible
                            ? 'cursor-not-allowed bg-crema-2 text-tinta-3 ring-linea'
                            : varianteId === v.id
                              ? 'cursor-pointer bg-rosa/50 ring-2 ring-acento'
                              : 'cursor-pointer bg-papel ring-linea hover:bg-crema-2'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="variante"
                            className="h-4 w-4 accent-[var(--acento)]"
                            checked={varianteId === v.id}
                            disabled={!v.disponible}
                            onChange={() => setVarianteId(v.id)}
                          />
                          <span className="font-medium">{v.nombre}</span>
                          {!v.disponible && <span className="text-xs">(agotado)</span>}
                        </span>
                        <span className="precio font-semibold">{cop(v.precio ?? p.precio)}</span>
                      </label>
                    ))}
                  </div>
                  {intento && faltaVariante && <p className="mt-2 text-sm font-medium text-peligro">Elige una presentación.</p>}
                </fieldset>
              )}

              {p.sabores.length > 0 && (
                <fieldset>
                  <legend className="mb-2 font-semibold text-tinta">
                    {p.sabores_max > 1 ? `Sabores (elige hasta ${p.sabores_max})` : 'Sabor'}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {p.sabores.map((s) => {
                      const activo = sabores.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => alternarSabor(s)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                            activo ? 'bg-primario text-en-primario ring-primario' : 'bg-papel text-tinta-2 ring-linea hover:bg-crema-2'
                          }`}
                        >
                          {activo && <Check size={15} />} {s}
                        </button>
                      );
                    })}
                  </div>
                  {intento && faltaSabor && <p className="mt-2 text-sm font-medium text-peligro">Elige al menos un sabor.</p>}
                </fieldset>
              )}

              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-tinta">Cantidad</span>
                <Cantidad valor={cantidad} min={p.cantidad_minima} onChange={setCantidad} etiqueta="Cantidad" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => agregarAlCarrito(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primario px-6 py-4 text-base font-semibold text-en-primario shadow-[0_10px_24px_-12px_rgba(46,29,21,0.7)] hover:brightness-110"
                >
                  <ShoppingBag size={20} /> Agregar · <span className="precio">{cop(precio * cantidad)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => agregarAlCarrito(false)}
                  className="rounded-full px-5 py-4 font-semibold text-primario ring-1 ring-linea hover:bg-crema-2"
                >
                  Agregar y seguir viendo
                </button>
              </div>
            </div>
          )}

          {(p.ingredientes || p.alergenos || p.conservacion) && (
            <dl className="mt-8 space-y-3 rounded-2xl bg-papel p-5 text-[14px] ring-1 ring-linea/70">
              {p.ingredientes && (
                <div>
                  <dt className="font-semibold text-tinta">Ingredientes</dt>
                  <dd className="text-tinta-2">{p.ingredientes}</dd>
                </div>
              )}
              {p.alergenos && (
                <div>
                  <dt className="font-semibold text-tinta">Alérgenos</dt>
                  <dd className="text-tinta-2">{p.alergenos}</dd>
                </div>
              )}
              {p.conservacion && (
                <div>
                  <dt className="flex items-center gap-1.5 font-semibold text-tinta">
                    <Snowflake size={14} /> Conservación
                  </dt>
                  <dd className="text-tinta-2">{p.conservacion}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-semibold text-primario">También te puede gustar</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {relacionados.map((x) => (
              <TarjetaProducto key={x.id} p={x} catalogo={catalogo} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
