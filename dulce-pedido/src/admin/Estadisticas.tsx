import { useEffect, useMemo, useState } from 'react';
import { cop } from '@/core/dinero';
import { ahoraEn, sumarDias } from '@/core/fechas';
import { db, textoError } from './cliente';
import { Tarjeta, Vacio, notificar } from './ui';
import { ESTADOS, type PedidoFila, type TiendaFila } from './tipos';

type Periodo = 7 | 30 | 90 | 365;

export function Estadisticas({ tienda }: { tienda: TiendaFila }) {
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [pedidos, setPedidos] = useState<PedidoFila[] | null>(null);
  const [productos, setProductos] = useState<{ total: number; activos: number; agotados: number }>({ total: 0, activos: 0, agotados: 0 });

  useEffect(() => {
    const desde = sumarDias(ahoraEn().slice(0, 10), -periodo);
    void (async () => {
      const [p, pr] = await Promise.all([
        db()
          .from('dp_pedidos')
          .select('id, estado, total, subtotal, creado_en, fecha_entrega, modalidad, dp_pedido_items(nombre, cantidad, subtotal, producto_id)')
          .eq('tienda_id', tienda.id)
          .gte('creado_en', `${desde}T00:00:00-05:00`)
          .limit(2000),
        db().from('dp_productos').select('activo, disponible').eq('tienda_id', tienda.id),
      ]);
      if (p.error) return notificar(textoError(p.error), 'error');
      setPedidos(p.data as PedidoFila[]);
      const filas = (pr.data ?? []) as { activo: boolean; disponible: boolean }[];
      setProductos({ total: filas.length, activos: filas.filter((x) => x.activo).length, agotados: filas.filter((x) => x.activo && !x.disponible).length });
    })();
  }, [tienda.id, periodo]);

  const datos = useMemo(() => {
    const ps = pedidos ?? [];
    const validos = ps.filter((p) => p.estado !== 'cancelado');
    const confirmados = ps.filter((p) => ['confirmado', 'en_preparacion', 'listo', 'entregado'].includes(p.estado));
    const porEstado = ESTADOS.map((e) => ({ ...e, n: ps.filter((p) => p.estado === e.valor).length }));
    const top = new Map<string, { nombre: string; unidades: number; valor: number }>();
    for (const p of confirmados) {
      for (const it of p.dp_pedido_items ?? []) {
        const k = it.producto_id ?? it.nombre;
        const act = top.get(k) ?? { nombre: it.nombre, unidades: 0, valor: 0 };
        act.unidades += it.cantidad;
        act.valor += it.subtotal;
        top.set(k, act);
      }
    }
    return {
      total: ps.length,
      validos: validos.length,
      confirmados: confirmados.length,
      ventas: confirmados.reduce((s, p) => s + p.subtotal, 0),
      ticket: confirmados.length ? Math.round(confirmados.reduce((s, p) => s + p.subtotal, 0) / confirmados.length) : 0,
      tasa: ps.length ? Math.round((confirmados.length / ps.length) * 100) : 0,
      domicilios: validos.filter((p) => p.modalidad === 'domicilio').length,
      porEstado,
      top: [...top.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 8),
    };
  }, [pedidos]);

  const maxEstado = Math.max(1, ...datos.porEstado.map((e) => e.n));
  const maxTop = Math.max(1, ...datos.top.map((t) => t.unidades));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primario">Estadísticas</h1>
          <p className="text-sm text-tinta-2">Basadas en las solicitudes registradas en la tienda.</p>
        </div>
        <div className="flex rounded-full bg-papel p-1 ring-1 ring-linea" role="group" aria-label="Periodo">
          {([7, 30, 90, 365] as Periodo[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={periodo === d}
              onClick={() => setPeriodo(d)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${periodo === d ? 'bg-primario text-en-primario' : 'text-tinta-2'}`}
            >
              {d === 365 ? '1 año' : `${d} días`}
            </button>
          ))}
        </div>
      </div>

      {pedidos === null ? (
        <p className="py-10 text-center text-tinta-3">Calculando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra titulo="Solicitudes" valor={String(datos.total)} nota={`${datos.domicilios} con domicilio`} />
            <Cifra titulo="Confirmadas" valor={String(datos.confirmados)} nota={`${datos.tasa}% de las solicitudes`} />
            <Cifra titulo="Ventas confirmadas" valor={cop(datos.ventas)} nota="Sin domicilios" />
            <Cifra titulo="Ticket promedio" valor={cop(datos.ticket)} nota="Pedidos confirmados" />
          </div>
          <p className="text-xs text-tinta-3">
            «Confirmadas» incluye confirmados, en preparación, listos y entregados. Las ventas se basan en los precios registrados; pagos y
            abonos no se registran en el sistema.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Pedidos por estado">
              {datos.total === 0 ? (
                <Vacio titulo="Sin pedidos en este periodo" />
              ) : (
                <ul className="space-y-2">
                  {datos.porEstado.map((e) => (
                    <li key={e.valor} className="grid grid-cols-[150px_1fr_32px] items-center gap-2 text-sm">
                      <span className="text-tinta-2">{e.texto}</span>
                      <span className="h-3 overflow-hidden rounded-full bg-crema-2">
                        <span className="block h-full rounded-full bg-acento" style={{ width: `${(e.n / maxEstado) * 100}%` }} />
                      </span>
                      <span className="precio text-right font-semibold">{e.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
            <Tarjeta titulo="Productos más pedidos (confirmados)">
              {datos.top.length === 0 ? (
                <Vacio titulo="Aún no hay pedidos confirmados" />
              ) : (
                <ul className="space-y-2">
                  {datos.top.map((t) => (
                    <li key={t.nombre} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="truncate text-tinta">{t.nombre}</span>
                        <span className="precio shrink-0 text-tinta-3">
                          {t.unidades} u · {cop(t.valor)}
                        </span>
                      </div>
                      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-crema-2">
                        <span className="block h-full rounded-full bg-primario" style={{ width: `${(t.unidades / maxTop) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>

          <Tarjeta titulo="Catálogo">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Cifra titulo="Productos" valor={String(productos.total)} />
              <Cifra titulo="Visibles" valor={String(productos.activos)} />
              <Cifra titulo="Agotados" valor={String(productos.agotados)} />
            </div>
          </Tarjeta>
        </>
      )}
    </div>
  );
}

function Cifra({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-2xl bg-papel p-4 ring-1 ring-linea/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-tinta-3">{titulo}</p>
      <p className="precio mt-1 font-display text-2xl font-semibold text-primario">{valor}</p>
      {nota && <p className="text-xs text-tinta-3">{nota}</p>}
    </div>
  );
}
