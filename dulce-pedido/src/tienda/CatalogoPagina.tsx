import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Catalogo, Producto } from '@/core/tipos';
import { ir } from '@/app/ruta';
import { TarjetaProducto } from './partes';

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function filtrarProductos(productos: Producto[], categoria: string, busqueda: string): Producto[] {
  const q = normalizar(busqueda.trim());
  return productos.filter((p) => {
    if (categoria && p.categoria_id !== categoria) return false;
    if (!q) return true;
    return normalizar(`${p.nombre} ${p.descripcion} ${p.presentacion} ${p.sabores.join(' ')}`).includes(q);
  });
}

export function CatalogoPagina({ catalogo, categoria, busqueda }: { catalogo: Catalogo; categoria: string; busqueda: string }) {
  const [texto, setTexto] = useState(busqueda);
  useEffect(() => setTexto(busqueda), [busqueda]);

  const actualizar = (c: string, q: string) => {
    const params = new URLSearchParams();
    if (c) params.set('c', c);
    if (q.trim()) params.set('q', q.trim());
    const s = params.toString();
    ir(`/catalogo${s ? `?${s}` : ''}`, { reemplazar: true, arriba: false });
  };

  // Búsqueda mientras se escribe, con una pequeña pausa.
  useEffect(() => {
    if (texto === busqueda) return;
    const t = setTimeout(() => actualizar(categoria, texto), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const lista = useMemo(() => filtrarProductos(catalogo.productos, categoria, busqueda), [catalogo, categoria, busqueda]);
  const agrupar = !categoria && !busqueda.trim();
  const sinCategoria = catalogo.productos.filter((p) => !catalogo.categorias.some((c) => c.id === p.categoria_id));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-6">
      <h1 className="text-3xl font-semibold text-primario sm:text-4xl">Catálogo</h1>
      <p className="mt-1 text-tinta-2">Precios en pesos colombianos. Agrega lo que quieras y envía tu pedido por WhatsApp.</p>

      <div className="sticky top-16 z-10 -mx-4 mt-5 bg-crema/95 px-4 pb-3 pt-2 backdrop-blur-md">
        <label className="relative block">
          <span className="sr-only">Buscar productos</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tinta-3" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar: torta, brownie, arequipe…"
            className="h-12 w-full rounded-full border-0 bg-papel pl-11 pr-11 text-[16px] ring-1 ring-linea placeholder:text-tinta-3 focus:outline-none focus:ring-2 focus:ring-acento"
          />
          {texto && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => {
                setTexto('');
                actualizar(categoria, '');
              }}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-tinta-3 hover:bg-crema-2"
            >
              <X size={16} />
            </button>
          )}
        </label>
        <div className="sin-barra -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Categorías">
          <Chip activo={!categoria} onClick={() => actualizar('', busqueda)}>
            Todo
          </Chip>
          {catalogo.categorias.map((c) => (
            <Chip key={c.id} activo={categoria === c.id} foto={c.foto_url} onClick={() => actualizar(c.id, busqueda)}>
              {c.nombre}
            </Chip>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-papel p-8 text-center ring-1 ring-linea/70">
          <p className="font-display text-xl text-primario">No encontramos productos</p>
          <p className="mt-1 text-tinta-2">Prueba con otra palabra o mira todas las categorías.</p>
          <button
            type="button"
            onClick={() => {
              setTexto('');
              actualizar('', '');
            }}
            className="mt-4 rounded-full bg-primario px-5 py-2.5 font-semibold text-en-primario"
          >
            Ver todo
          </button>
        </div>
      ) : agrupar ? (
        <div className="mt-4 space-y-10">
          {catalogo.categorias.map((c) => {
            const ps = lista.filter((p) => p.categoria_id === c.id);
            if (ps.length === 0) return null;
            return (
              <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                <h2 id={`cat-${c.id}`} className="mb-1 text-2xl font-semibold text-primario">
                  {c.nombre}
                </h2>
                {c.descripcion && <p className="mb-3 text-tinta-2">{c.descripcion}</p>}
                <Rejilla productos={ps} catalogo={catalogo} />
              </section>
            );
          })}
          {sinCategoria.length > 0 && (
            <section>
              <h2 className="mb-3 text-2xl font-semibold text-primario">Otros productos</h2>
              <Rejilla productos={sinCategoria} catalogo={catalogo} />
            </section>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-3 text-sm text-tinta-3">
            {lista.length} {lista.length === 1 ? 'producto' : 'productos'}
          </p>
          <Rejilla productos={lista} catalogo={catalogo} />
        </div>
      )}
    </div>
  );
}

function Rejilla({ productos, catalogo }: { productos: Producto[]; catalogo: Catalogo }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {productos.map((p) => (
        <TarjetaProducto key={p.id} p={p} catalogo={catalogo} />
      ))}
    </div>
  );
}

function Chip({ activo, onClick, foto, children }: { activo: boolean; onClick: () => void; foto?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 text-sm font-medium transition ${foto ? 'pl-1.5 pr-4' : 'px-4'} ${
        activo ? 'bg-primario text-en-primario' : 'bg-papel text-tinta-2 ring-1 ring-linea hover:bg-rosa/60'
      }`}
    >
      {foto && <img src={foto} alt="" loading="lazy" className="h-7 w-7 rounded-full object-cover" />}
      {children}
    </button>
  );
}
