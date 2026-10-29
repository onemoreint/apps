import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, MessageCircle, Phone, RefreshCw, Users, X } from 'lucide-react';
import { cop } from '@/core/dinero';
import { fechaLarga } from '@/core/fechas';
import { enlaceWhatsApp } from '@/core/whatsapp';
import { db, textoError } from './cliente';
import { Area, Boton, Tarjeta, Vacio, claseCampo, notificar } from './ui';
import type { TiendaFila } from './tipos';

type Estado = 'nueva' | 'respondida' | 'aceptada' | 'descartada';
const ESTADOS: { valor: Estado; texto: string; clase: string }[] = [
  { valor: 'nueva', texto: 'Nueva', clase: 'bg-rosa text-primario' },
  { valor: 'respondida', texto: 'Respondida', clase: 'bg-sky-100 text-sky-900' },
  { valor: 'aceptada', texto: 'Aceptada', clase: 'bg-emerald-100 text-emerald-900' },
  { valor: 'descartada', texto: 'Descartada', clase: 'bg-stone-200 text-stone-700' },
];
const info = (e: string) => ESTADOS.find((x) => x.valor === e) ?? ESTADOS[0]!;

type CotizacionFila = {
  id: string;
  codigo: string;
  estado: Estado;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_evento: string;
  fecha_evento: string | null;
  personas: number | null;
  presupuesto: number | null;
  descripcion: string;
  notas_internas: string;
  datos_anonimizados: boolean;
  creado_en: string;
};

export function Cotizaciones({ tienda }: { tienda: TiendaFila }) {
  const [filas, setFilas] = useState<CotizacionFila[] | null>(null);
  const [filtro, setFiltro] = useState<'abiertas' | 'todas' | Estado>('abiertas');
  const [abierta, setAbierta] = useState<CotizacionFila | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await db()
      .from('dp_cotizaciones')
      .select('*')
      .eq('tienda_id', tienda.id)
      .order('creado_en', { ascending: false })
      .limit(300);
    setCargando(false);
    if (error) return notificar(textoError(error), 'error');
    setFilas(data as CotizacionFila[]);
  }, [tienda.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const lista = (filas ?? []).filter((f) =>
    filtro === 'todas' ? true : filtro === 'abiertas' ? f.estado === 'nueva' || f.estado === 'respondida' : f.estado === filtro,
  );
  const nuevas = (filas ?? []).filter((f) => f.estado === 'nueva').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primario">Cotizaciones</h1>
          <p className="text-sm text-tinta-2">
            Pedidos especiales que te piden cotizar. {nuevas > 0 && <strong className="text-acento">{nuevas} nuevas.</strong>}
          </p>
        </div>
        <div className="flex gap-2">
          <select className={`${claseCampo} mt-0 w-auto`} value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar cotizaciones">
            <option value="abiertas">Abiertas</option>
            <option value="todas">Todas</option>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.texto}
              </option>
            ))}
          </select>
          <Boton variante="secundario" onClick={() => void cargar()} cargando={cargando} aria-label="Actualizar">
            {!cargando && <RefreshCw size={16} />}
          </Boton>
        </div>
      </div>

      {filas === null ? (
        <p className="py-10 text-center text-tinta-3">Cargando…</p>
      ) : lista.length === 0 ? (
        <Vacio titulo={filas.length === 0 ? 'Aún no hay solicitudes de cotización' : 'Nada con este filtro'} texto="Aparecen aquí cuando un cliente usa «Cotiza tu pedido especial»." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => setAbierta(f)} className="w-full rounded-2xl bg-papel p-4 text-left ring-1 ring-linea/70 hover:ring-acento">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-tinta-3">
                      {f.codigo} · {new Date(f.creado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="font-semibold text-tinta">{f.cliente_nombre}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${info(f.estado).clase}`}>{info(f.estado).texto}</span>
                </div>
                <p className="mt-1 text-sm text-tinta-2">
                  {[f.tipo_evento, f.fecha_evento && fechaLarga(f.fecha_evento), f.personas && `${f.personas} personas`].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-tinta-3">{f.descripcion}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {abierta && (
        <Detalle
          tienda={tienda}
          fila={abierta}
          cerrar={() => setAbierta(null)}
          alGuardar={(x) => {
            setFilas((fs) => (fs ?? []).map((y) => (y.id === x.id ? x : y)));
            setAbierta(null);
          }}
        />
      )}
    </div>
  );
}

function Detalle({ tienda, fila, cerrar, alGuardar }: { tienda: TiendaFila; fila: CotizacionFila; cerrar: () => void; alGuardar: (f: CotizacionFila) => void }) {
  const [estado, setEstado] = useState<Estado>(fila.estado);
  const [notas, setNotas] = useState(fila.notas_internas);
  const [guardando, setGuardando] = useState(false);
  const tel = fila.cliente_telefono;
  const telWa = tel.length === 10 && tel.startsWith('3') ? `+57${tel}` : tel;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [cerrar]);

  const guardar = async () => {
    setGuardando(true);
    const { error } = await db().from('dp_cotizaciones').update({ estado, notas_internas: notas }).eq('id', fila.id);
    setGuardando(false);
    if (error) return notificar(textoError(error), 'error');
    notificar(`Cotización ${fila.codigo}: ${info(estado).texto}`);
    alGuardar({ ...fila, estado, notas_internas: notas });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/45 sm:items-center" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Cotización ${fila.codigo}`}
        className="aparecer max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-papel p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-tinta-3">{fila.codigo}</p>
            <h2 className="text-xl font-semibold text-primario">{fila.cliente_nombre}</h2>
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-crema-2">
            <X size={18} />
          </button>
        </div>
        {!fila.datos_anonimizados && tel && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={enlaceWhatsApp(telWa, `Hola, ${fila.cliente_nombre}. Te escribimos de ${tienda.nombre} sobre tu solicitud de cotización ${fila.codigo}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-whatsapp px-3.5 py-2 text-sm font-semibold text-white"
            >
              <MessageCircle size={16} /> Responder por WhatsApp
            </a>
            <a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-primario ring-1 ring-linea">
              <Phone size={16} /> {tel}
            </a>
          </div>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-crema p-3 text-sm">
          <div>
            <dt className="text-tinta-3">Ocasión</dt>
            <dd className="font-medium">{fila.tipo_evento || '—'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-tinta-3">
              <CalendarDays size={13} /> Fecha
            </dt>
            <dd className="font-medium first-letter:uppercase">{fila.fecha_evento ? fechaLarga(fila.fecha_evento) : '—'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-tinta-3">
              <Users size={13} /> Personas
            </dt>
            <dd className="font-medium">{fila.personas ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-tinta-3">Presupuesto</dt>
            <dd className="precio font-medium">{fila.presupuesto !== null ? cop(fila.presupuesto) : '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-tinta-3">Lo que pide</dt>
            <dd className="whitespace-pre-line font-medium">{fila.descripcion}</dd>
          </div>
        </dl>
        <Tarjeta className="mt-4 bg-crema">
          <label className="block text-sm font-semibold text-tinta">
            Estado
            <select className={claseCampo} value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
              {ESTADOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.texto}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold text-tinta">
            Notas internas
            <Area value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={1000} placeholder="Precio propuesto, detalles acordados…" />
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
