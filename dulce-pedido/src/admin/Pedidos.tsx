import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, MessageCircle, Phone, RefreshCw, Search, Store, Bike, X } from 'lucide-react';
import { cop } from '@/core/dinero';
import { fechaLarga, ahoraEn } from '@/core/fechas';
import { enlaceWhatsApp } from '@/core/whatsapp';
import { db, textoError } from './cliente';
import { Area, Boton, Tarjeta, Vacio, claseCampo, notificar } from './ui';
import { ESTADOS, claseEstado, textoEstado, type EstadoPedido, type PedidoFila, type TiendaFila } from './tipos';

type Filtro = 'activos' | 'todos' | EstadoPedido;
const ACTIVOS: EstadoPedido[] = ['solicitud_recibida', 'pendiente_confirmacion', 'confirmado', 'en_preparacion', 'listo'];

export function Pedidos({ tienda }: { tienda: TiendaFila }) {
  const [pedidos, setPedidos] = useState<PedidoFila[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('activos');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<PedidoFila | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await db()
      .from('dp_pedidos')
      .select('*, dp_pedido_items(nombre, detalle, cantidad, precio_unitario, subtotal, producto_id)')
      .eq('tienda_id', tienda.id)
      .order('creado_en', { ascending: false })
      .limit(300);
    setCargando(false);
    if (error) return notificar(textoError(error), 'error');
    setPedidos(data as PedidoFila[]);
  }, [tienda.id]);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void cargar();
    }, 60000);
    return () => clearInterval(t);
  }, [cargar]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (pedidos ?? [])
      .filter((p) => (filtro === 'todos' ? true : filtro === 'activos' ? ACTIVOS.includes(p.estado) : p.estado === filtro))
      .filter((p) => !q || `${p.codigo} ${p.cliente_nombre} ${p.cliente_telefono}`.toLowerCase().includes(q))
      .sort((a, b) =>
        filtro === 'activos' ? a.fecha_entrega.localeCompare(b.fecha_entrega) || a.creado_en.localeCompare(b.creado_en) : 0,
      );
  }, [pedidos, filtro, busqueda]);

  const nuevos = (pedidos ?? []).filter((p) => p.estado === 'solicitud_recibida').length;
  const hoy = ahoraEn().slice(0, 10);

  const actualizar = (p: PedidoFila) => setPedidos((ps) => (ps ?? []).map((x) => (x.id === p.id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primario">Pedidos</h1>
          <p className="text-sm text-tinta-2">
            Solicitudes registradas desde la tienda. {nuevos > 0 && <strong className="text-acento">{nuevos} sin revisar.</strong>}
          </p>
        </div>
        <Boton variante="secundario" onClick={() => void cargar()} cargando={cargando}>
          {!cargando && <RefreshCw size={16} />} Actualizar
        </Boton>
      </div>

      <p className="rounded-xl bg-crema-2 px-4 py-3 text-[13px] text-tinta-2">
        Aquí aparecen las solicitudes que el cliente completó en la tienda. Que esté registrada <strong>no garantiza</strong> que haya
        enviado el mensaje por WhatsApp: confirma con el cliente antes de preparar.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
          <input
            type="search"
            className={`${claseCampo} mt-0 pl-9`}
            placeholder="Buscar por código, nombre o teléfono"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <select className={`${claseCampo} mt-0 sm:w-64`} value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtrar por estado">
          <option value="activos">Activos (sin entregar ni cancelar)</option>
          <option value="todos">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.texto}
            </option>
          ))}
        </select>
      </div>

      {pedidos === null ? (
        <p className="py-10 text-center text-tinta-3">Cargando pedidos…</p>
      ) : lista.length === 0 ? (
        <Vacio
          titulo={pedidos.length === 0 ? 'Todavía no hay pedidos' : 'No hay pedidos con este filtro'}
          texto={pedidos.length === 0 ? 'Comparte el enlace de tu tienda; las solicitudes aparecerán aquí.' : undefined}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setAbierto(p)}
                className="w-full rounded-2xl bg-papel p-4 text-left ring-1 ring-linea/70 transition hover:ring-acento"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-tinta-3">{p.codigo}</p>
                    <p className="font-semibold text-tinta">{p.cliente_nombre}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${claseEstado(p.estado)}`}>{textoEstado(p.estado)}</span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-tinta-2">
                  <CalendarDays size={15} />
                  <span className="inline-block first-letter:uppercase">{fechaLarga(p.fecha_entrega)}</span>
                  {p.fecha_entrega === hoy && <span className="rounded bg-acento px-1.5 text-[11px] font-bold text-white">HOY</span>}
                  {p.franja && <span className="text-tinta-3">· {p.franja}</span>}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-tinta-2">
                  {p.modalidad === 'domicilio' ? <Bike size={15} /> : <Store size={15} />}
                  {p.modalidad === 'domicilio' ? `Domicilio · ${p.zona_nombre}` : 'Recoge'}
                </p>
                <p className="mt-2 line-clamp-1 text-sm text-tinta-3">
                  {(p.dp_pedido_items ?? []).map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}
                </p>
                <p className="precio mt-2 text-right text-lg font-bold text-primario">
                  {cop(p.total)}
                  {p.domicilio_pendiente && <span className="ml-1 text-xs font-normal text-tinta-3">+ dom.</span>}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <DetallePedido
          tienda={tienda}
          pedido={abierto}
          cerrar={() => setAbierto(null)}
          alGuardar={(p) => {
            actualizar(p);
            setAbierto(null);
          }}
        />
      )}
    </div>
  );
}

function DetallePedido({
  tienda,
  pedido,
  cerrar,
  alGuardar,
}: {
  tienda: TiendaFila;
  pedido: PedidoFila;
  cerrar: () => void;
  alGuardar: (p: PedidoFila) => void;
}) {
  const [estado, setEstado] = useState<EstadoPedido>(pedido.estado);
  const [notas, setNotas] = useState(pedido.notas_internas);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [cerrar]);

  const guardar = async () => {
    setGuardando(true);
    const { error } = await db().from('dp_pedidos').update({ estado, notas_internas: notas }).eq('id', pedido.id);
    setGuardando(false);
    if (error) return notificar(textoError(error), 'error');
    notificar(`Pedido ${pedido.codigo}: ${textoEstado(estado)}`);
    alGuardar({ ...pedido, estado, notas_internas: notas });
  };

  const tel = pedido.cliente_telefono;
  const telWa = tel.length === 10 && tel.startsWith('3') ? `+57${tel}` : tel;
  const mensajeConfirmacion = `Hola, ${pedido.cliente_nombre}. Te escribimos de ${tienda.nombre} sobre tu pedido ${pedido.codigo} para el ${fechaLarga(pedido.fecha_entrega)}.`;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/45 sm:items-center" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Pedido ${pedido.codigo}`}
        className="aparecer max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-papel p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-tinta-3">
              {pedido.codigo} · recibido {new Date(pedido.creado_en).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <h2 className="text-xl font-semibold text-primario">{pedido.cliente_nombre}</h2>
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-crema-2">
            <X size={18} />
          </button>
        </div>

        {!pedido.datos_anonimizados && tel && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={enlaceWhatsApp(telWa, mensajeConfirmacion)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-whatsapp px-3.5 py-2 text-sm font-semibold text-white"
            >
              <MessageCircle size={16} /> Escribir por WhatsApp
            </a>
            <a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-primario ring-1 ring-linea">
              <Phone size={16} /> {tel}
            </a>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-crema p-3 text-sm">
          <div>
            <dt className="text-tinta-3">Fecha deseada</dt>
            <dd className="font-medium first-letter:uppercase">{fechaLarga(pedido.fecha_entrega)}</dd>
          </div>
          <div>
            <dt className="text-tinta-3">Franja</dt>
            <dd className="font-medium">{pedido.franja || '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-tinta-3">Entrega</dt>
            <dd className="font-medium">
              {pedido.modalidad === 'recogida'
                ? 'Recoge en el punto de entrega'
                : `Domicilio — ${[pedido.direccion, pedido.barrio && `barrio ${pedido.barrio}`, pedido.zona_nombre].filter(Boolean).join(', ')}`}
            </dd>
          </div>
          {pedido.observaciones && (
            <div className="col-span-2">
              <dt className="text-tinta-3">Observaciones del cliente</dt>
              <dd className="whitespace-pre-line font-medium">{pedido.observaciones}</dd>
            </div>
          )}
        </dl>

        <ul className="mt-4 divide-y divide-linea text-sm">
          {(pedido.dp_pedido_items ?? []).map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>
                {it.cantidad} × {it.nombre}
                {it.detalle && <span className="block text-xs text-tinta-3">{it.detalle}</span>}
              </span>
              <span className="precio shrink-0">{cop(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-linea pt-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="precio">{cop(pedido.subtotal)}</dd>
          </div>
          {pedido.modalidad === 'domicilio' && (
            <div className="flex justify-between">
              <dt>Domicilio</dt>
              <dd className="precio">{pedido.domicilio_pendiente ? 'Por cotizar' : cop(pedido.domicilio ?? 0)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="precio text-primario">
              {cop(pedido.total)}
              {pedido.domicilio_pendiente && ' + domicilio'}
            </dd>
          </div>
        </dl>

        <Tarjeta className="mt-4 bg-crema">
          <label className="block text-sm font-semibold text-tinta">
            Estado
            <select className={claseCampo} value={estado} onChange={(e) => setEstado(e.target.value as EstadoPedido)}>
              {ESTADOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.texto}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold text-tinta">
            Notas internas (solo las ves tú)
            <Area value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={1000} placeholder="Abono recibido, detalles de decoración…" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Boton variante="suave" onClick={cerrar}>
              Cancelar
            </Boton>
            <Boton onClick={() => void guardar()} cargando={guardando}>
              Guardar cambios
            </Boton>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
