import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { db, textoError } from './cliente';
import { Boton, Entrada, Interruptor, Tarjeta, Vacio, notificar } from './ui';
import type { CategoriaFila, TiendaFila } from './tipos';

export function Categorias({ tienda }: { tienda: TiendaFila }) {
  const [cats, setCats] = useState<CategoriaFila[] | null>(null);
  const [conteo, setConteo] = useState<Record<string, number>>({});
  const [nueva, setNueva] = useState('');

  const cargar = useCallback(async () => {
    const [c, p] = await Promise.all([
      db().from('dp_categorias').select('*').eq('tienda_id', tienda.id).order('orden').order('nombre'),
      db().from('dp_productos').select('categoria_id').eq('tienda_id', tienda.id),
    ]);
    if (c.error) return notificar(textoError(c.error), 'error');
    setCats(c.data as CategoriaFila[]);
    const n: Record<string, number> = {};
    for (const x of (p.data ?? []) as { categoria_id: string | null }[]) if (x.categoria_id) n[x.categoria_id] = (n[x.categoria_id] ?? 0) + 1;
    setConteo(n);
  }, [tienda.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nueva.trim();
    if (!nombre) return;
    const { error } = await db().from('dp_categorias').insert({ tienda_id: tienda.id, nombre, orden: (cats?.length ?? 0) + 1 });
    if (error) return notificar(textoError(error), 'error');
    setNueva('');
    notificar('Categoría creada');
    void cargar();
  };

  const guardar = async (c: CategoriaFila, cambios: Partial<CategoriaFila>) => {
    setCats((cs) => (cs ?? []).map((x) => (x.id === c.id ? { ...x, ...cambios } : x)));
    const { error } = await db().from('dp_categorias').update(cambios).eq('id', c.id);
    if (error) {
      notificar(textoError(error), 'error');
      void cargar();
    }
  };

  const mover = async (i: number, dir: -1 | 1) => {
    if (!cats) return;
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const lista = [...cats];
    [lista[i], lista[j]] = [lista[j]!, lista[i]!];
    setCats(lista.map((c, k) => ({ ...c, orden: k + 1 })));
    const res = await Promise.all(lista.map((c, k) => db().from('dp_categorias').update({ orden: k + 1 }).eq('id', c.id)));
    if (res.some((r) => r.error)) notificar('No se pudo guardar el orden', 'error');
  };

  const eliminar = async (c: CategoriaFila) => {
    const n = conteo[c.id] ?? 0;
    const aviso = n > 0 ? `Tiene ${n} productos: quedarán "sin categoría" (no se borran).` : '';
    if (!window.confirm(`¿Eliminar la categoría "${c.nombre}"? ${aviso}`)) return;
    const { error } = await db().from('dp_categorias').delete().eq('id', c.id);
    if (error) return notificar(textoError(error), 'error');
    notificar('Categoría eliminada');
    void cargar();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-primario">Categorías</h1>
        <p className="text-sm text-tinta-2">Organizan tu catálogo. Las categorías sin productos visibles no se muestran a los clientes.</p>
      </div>
      <Tarjeta>
        <form onSubmit={crear} className="flex gap-2">
          <Entrada value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva categoría (ej.: Postres fríos)" maxLength={60} className="mt-0" />
          <Boton type="submit" disabled={!nueva.trim()}>
            <Plus size={16} /> Agregar
          </Boton>
        </form>
      </Tarjeta>
      {cats === null ? (
        <p className="py-8 text-center text-tinta-3">Cargando…</p>
      ) : cats.length === 0 ? (
        <Vacio titulo="Sin categorías" texto="Ejemplos: Tortas, Brownies, Galletas, Cajas de regalo." />
      ) : (
        <Tarjeta>
          <ul className="divide-y divide-linea">
            {cats.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="min-w-[180px] flex-1">
                  <Entrada
                    defaultValue={c.nombre}
                    maxLength={60}
                    className="mt-0 font-semibold"
                    aria-label="Nombre de la categoría"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.nombre) void guardar(c, { nombre: v });
                    }}
                  />
                  <p className="mt-1 text-xs text-tinta-3">{conteo[c.id] ?? 0} productos</p>
                </div>
                <div className="w-36">
                  <Interruptor activo={c.activa} onChange={(v) => void guardar(c, { activa: v })} etiqueta="Visible" />
                </div>
                <div className="flex">
                  <Boton variante="suave" aria-label="Subir" onClick={() => void mover(i, -1)} disabled={i === 0} className="px-2.5">
                    <ArrowUp size={16} />
                  </Boton>
                  <Boton variante="suave" aria-label="Bajar" onClick={() => void mover(i, 1)} disabled={i === cats.length - 1} className="px-2.5">
                    <ArrowDown size={16} />
                  </Boton>
                  <Boton variante="suave" aria-label="Eliminar" onClick={() => void eliminar(c)} className="px-2.5 hover:text-peligro">
                    <Trash2 size={16} />
                  </Boton>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
