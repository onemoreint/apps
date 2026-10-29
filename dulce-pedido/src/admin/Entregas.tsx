import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { cop, leerPesos } from '@/core/dinero';
import { fechaLarga, nombreDia, ahoraEn } from '@/core/fechas';
import { db, textoError } from './cliente';
import { Boton, Campo, Entrada, Interruptor, Tarjeta, notificar } from './ui';
import type { TiendaFila, ZonaFila } from './tipos';

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

export function Entregas({ tienda, puedeEditar, alGuardar }: { tienda: TiendaFila; puedeEditar: boolean; alGuardar: () => Promise<void> }) {
  const [t, setT] = useState(tienda);
  const [nuevaFranja, setNuevaFranja] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiar = (c: Partial<TiendaFila>) => setT((x) => ({ ...x, ...c }));

  const guardar = async () => {
    if (!t.recogida && !t.domicilio) return notificar('Activa al menos recogida o domicilio', 'error');
    setGuardando(true);
    const { error } = await db()
      .from('dp_tiendas')
      .update({
        recogida: t.recogida,
        domicilio: t.domicilio,
        direccion_recogida: t.direccion_recogida.trim(),
        dias_atencion: t.dias_atencion,
        dias_max_anticipacion: Math.min(365, Math.max(1, Math.round(t.dias_max_anticipacion))),
        franjas: t.franjas,
      })
      .eq('id', t.id);
    setGuardando(false);
    if (error) return notificar(textoError(error), 'error');
    notificar('Configuración de entregas guardada');
    void alGuardar();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primario">Entregas y calendario</h1>
          <p className="text-sm text-tinta-2">Define cómo entregas, qué días atiendes y qué fechas no recibes pedidos.</p>
        </div>
        {puedeEditar && (
          <Boton onClick={() => void guardar()} cargando={guardando}>
            Guardar cambios
          </Boton>
        )}
      </div>

      <fieldset disabled={!puedeEditar} className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Modalidades">
          <div className="space-y-4">
            <Interruptor activo={t.recogida} onChange={(v) => cambiar({ recogida: v })} etiqueta="Recogida en punto de entrega" />
            {t.recogida && (
              <Campo etiqueta="Dirección o indicación de recogida" ayuda="Se muestra al cliente. Puedes dejar solo el sector si prefieres dar la dirección al confirmar.">
                <Entrada value={t.direccion_recogida} maxLength={200} onChange={(e) => cambiar({ direccion_recogida: e.target.value })} />
              </Campo>
            )}
            <Interruptor activo={t.domicilio} onChange={(v) => cambiar({ domicilio: v })} etiqueta="Domicilios" ayuda="Las zonas y tarifas se configuran abajo." />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Días y horarios">
          <p className="text-sm font-semibold text-tinta">Días en que entregas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ORDEN_DIAS.map((d) => {
              const activo = t.dias_atencion.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => cambiar({ dias_atencion: activo ? t.dias_atencion.filter((x) => x !== d) : [...t.dias_atencion, d].sort() })}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ring-1 ${activo ? 'bg-primario text-en-primario ring-primario' : 'bg-white text-tinta-2 ring-linea'}`}
                >
                  {nombreDia(d)}
                </button>
              );
            })}
          </div>
          {t.dias_atencion.length === 0 && <p className="mt-1 text-xs text-aviso">Sin días marcados se aceptan todos los días.</p>}
          <Campo etiqueta="Recibir pedidos hasta con … días de anticipación" className="mt-4">
            <Entrada type="number" min={1} max={365} value={t.dias_max_anticipacion} onChange={(e) => cambiar({ dias_max_anticipacion: Number(e.target.value) || 1 })} />
          </Campo>
          <p className="mt-4 text-sm font-semibold text-tinta">Franjas horarias</p>
          <p className="text-xs text-tinta-3">Opcional. Si agregas franjas, el cliente debe elegir una.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {t.franjas.map((f) => (
              <li key={f} className="inline-flex items-center gap-1 rounded-full bg-crema-2 py-1 pl-3 pr-1 text-sm">
                {f}
                <button type="button" aria-label={`Quitar ${f}`} onClick={() => cambiar({ franjas: t.franjas.filter((x) => x !== f) })} className="grid h-6 w-6 place-items-center rounded-full hover:bg-linea">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Entrada value={nuevaFranja} onChange={(e) => setNuevaFranja(e.target.value)} placeholder="Ej.: Tarde (2:00 – 6:00 p. m.)" maxLength={60} className="mt-0" />
            <Boton
              variante="secundario"
              disabled={!nuevaFranja.trim()}
              onClick={() => {
                const v = nuevaFranja.trim();
                if (v && !t.franjas.includes(v)) cambiar({ franjas: [...t.franjas, v] });
                setNuevaFranja('');
              }}
            >
              <Plus size={16} />
            </Boton>
          </div>
        </Tarjeta>
      </fieldset>

      <Zonas tienda={tienda} puedeEditar={puedeEditar} />
      <FechasBloqueadas tienda={tienda} puedeEditar={puedeEditar} />
      <p className="text-xs text-tinta-3">
        El tiempo mínimo de preparación se define en cada producto. El calendario del cliente combina esas horas con los días y las fechas de esta
        página; la confirmación final siempre la das tú por WhatsApp.
      </p>
    </div>
  );
}

function Zonas({ tienda, puedeEditar }: { tienda: TiendaFila; puedeEditar: boolean }) {
  const [zonas, setZonas] = useState<ZonaFila[]>([]);
  const [nombre, setNombre] = useState('');
  const [tarifa, setTarifa] = useState('');

  const cargar = useCallback(async () => {
    const { data, error } = await db().from('dp_zonas').select('*').eq('tienda_id', tienda.id).order('orden').order('nombre');
    if (error) return notificar(textoError(error), 'error');
    setZonas(data as ZonaFila[]);
  }, [tienda.id]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) return;
    const { error } = await db()
      .from('dp_zonas')
      .insert({ tienda_id: tienda.id, nombre: nombre.trim(), tarifa: tarifa.trim() ? leerPesos(tarifa) : null, orden: zonas.length + 1 });
    if (error) return notificar(textoError(error), 'error');
    setNombre('');
    setTarifa('');
    void cargar();
  };

  const actualizar = async (z: ZonaFila, c: Partial<ZonaFila>) => {
    setZonas((zs) => zs.map((x) => (x.id === z.id ? { ...x, ...c } : x)));
    const { error } = await db().from('dp_zonas').update(c).eq('id', z.id);
    if (error) {
      notificar(textoError(error), 'error');
      void cargar();
    }
  };

  const eliminar = async (z: ZonaFila) => {
    if (!window.confirm(`¿Eliminar la zona "${z.nombre}"?`)) return;
    const { error } = await db().from('dp_zonas').delete().eq('id', z.id);
    if (error) return notificar(textoError(error), 'error');
    void cargar();
  };

  return (
    <Tarjeta titulo="Zonas y tarifas de domicilio">
      <p className="mb-3 text-xs text-tinta-3">Deja la tarifa vacía para que el domicilio se cotice por WhatsApp (el total lo indicará al cliente).</p>
      <ul className="divide-y divide-linea">
        {zonas.map((z) => (
          <li key={z.id} className="grid grid-cols-[1fr_120px_auto] items-center gap-2 py-2">
            <Entrada
              defaultValue={z.nombre}
              disabled={!puedeEditar}
              className="mt-0"
              aria-label="Nombre de la zona"
              onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== z.nombre && void actualizar(z, { nombre: e.target.value.trim() })}
            />
            <Entrada
              defaultValue={z.tarifa ?? ''}
              disabled={!puedeEditar}
              inputMode="numeric"
              placeholder="Se cotiza"
              className="mt-0"
              aria-label="Tarifa"
              onBlur={(e) => {
                const v = e.target.value.trim() ? leerPesos(e.target.value) : null;
                if (v !== z.tarifa) void actualizar(z, { tarifa: v });
              }}
            />
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1 text-xs text-tinta-2">
                <input type="checkbox" checked={z.activa} disabled={!puedeEditar} onChange={(e) => void actualizar(z, { activa: e.target.checked })} className="h-4 w-4 accent-[var(--primario)]" />
                Activa
              </label>
              {puedeEditar && (
                <Boton variante="suave" className="px-2.5" aria-label="Eliminar zona" onClick={() => void eliminar(z)}>
                  <Trash2 size={16} />
                </Boton>
              )}
            </div>
          </li>
        ))}
      </ul>
      {zonas.length > 0 && (
        <p className="mt-2 text-xs text-tinta-3">
          Vista del cliente: {zonas.filter((z) => z.activa).map((z) => `${z.nombre} (${z.tarifa === null ? 'se cotiza' : cop(z.tarifa)})`).join(' · ')}
        </p>
      )}
      {puedeEditar && (
        <form onSubmit={agregar} className="mt-4 grid grid-cols-[1fr_120px_auto] gap-2">
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nueva zona (ej.: Sabaneta)" maxLength={80} className="mt-0" />
          <Entrada value={tarifa} onChange={(e) => setTarifa(e.target.value)} placeholder="Tarifa" inputMode="numeric" className="mt-0" />
          <Boton type="submit" disabled={nombre.trim().length < 2}>
            <Plus size={16} />
          </Boton>
        </form>
      )}
    </Tarjeta>
  );
}

function FechasBloqueadas({ tienda, puedeEditar }: { tienda: TiendaFila; puedeEditar: boolean }) {
  const [fechas, setFechas] = useState<{ fecha: string; motivo: string }[]>([]);
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const hoy = ahoraEn().slice(0, 10);

  const cargar = useCallback(async () => {
    const { data, error } = await db().from('dp_fechas_bloqueadas').select('fecha, motivo').eq('tienda_id', tienda.id).gte('fecha', hoy).order('fecha');
    if (error) return notificar(textoError(error), 'error');
    setFechas(data ?? []);
  }, [tienda.id, hoy]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) return;
    const { error } = await db().from('dp_fechas_bloqueadas').upsert({ tienda_id: tienda.id, fecha, motivo: motivo.trim() });
    if (error) return notificar(textoError(error), 'error');
    setFecha('');
    setMotivo('');
    void cargar();
  };

  const quitar = async (f: string) => {
    const { error } = await db().from('dp_fechas_bloqueadas').delete().eq('tienda_id', tienda.id).eq('fecha', f);
    if (error) return notificar(textoError(error), 'error');
    void cargar();
  };

  return (
    <Tarjeta titulo="Fechas no disponibles">
      <p className="mb-3 text-xs text-tinta-3">Vacaciones, festivos o días con la agenda llena. Los clientes no podrán elegirlas.</p>
      {fechas.length === 0 ? (
        <p className="text-sm text-tinta-3">No hay fechas bloqueadas.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {fechas.map((f) => (
            <li key={f.fecha} className="inline-flex items-center gap-1 rounded-full bg-crema-2 py-1 pl-3 pr-1 text-sm">
              <span className="inline-block first-letter:uppercase">{fechaLarga(f.fecha)}</span>
              {f.motivo && <span className="text-tinta-3">· {f.motivo}</span>}
              {puedeEditar && (
                <button type="button" aria-label="Quitar fecha" onClick={() => void quitar(f.fecha)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-linea">
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {puedeEditar && (
        <form onSubmit={agregar} className="mt-4 flex flex-wrap gap-2">
          <Entrada type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-0 w-auto" aria-label="Fecha" />
          <Entrada value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional, solo lo ves tú)" maxLength={80} className="mt-0 min-w-[180px] flex-1" />
          <Boton type="submit" disabled={!fecha}>
            Bloquear
          </Boton>
        </form>
      )}
    </Tarjeta>
  );
}
