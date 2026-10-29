import { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { Contenido } from '@/core/tipos';
import { whatsappValido } from '@/core/whatsapp';
import { colorValido } from '@/tienda/tema';
import { db, textoError } from './cliente';
import { subirFoto } from './fotos';
import { Area, Boton, Campo, Entrada, Tarjeta, notificar } from './ui';
import type { TiendaFila } from './tipos';

const CONTENIDO_BASE: Contenido = {
  eslogan: '',
  mensaje_bienvenida: '',
  logo_url: '',
  banner_url: '',
  colores: { primario: '#5a3222', acento: '#c4673f' },
  como_pedir: [],
  info_entregas: '',
  info_anticipacion: '',
  eventos_texto: '',
  faq: [],
  testimonios: [],
  ciudad: '',
  horario_texto: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  correo: '',
  privacidad: '',
};

export function Negocio({ tienda, puedeEditar, alGuardar }: { tienda: TiendaFila; puedeEditar: boolean; alGuardar: () => Promise<void> }) {
  const [nombre, setNombre] = useState(tienda.nombre);
  const [whatsapp, setWhatsapp] = useState(tienda.whatsapp);
  const [meses, setMeses] = useState(tienda.meses_retencion);
  const [c, setC] = useState<Contenido>(() => ({
    ...CONTENIDO_BASE,
    ...tienda.contenido,
    colores: { ...CONTENIDO_BASE.colores, ...(tienda.contenido.colores ?? {}) },
  }));
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<'' | 'logo' | 'banner'>('');

  const cambiar = (x: Partial<Contenido>) => setC((v) => ({ ...v, ...x }));

  const guardar = async () => {
    const wa = whatsapp.trim() ? '+' + whatsapp.replace(/\D/g, '') : '';
    if (nombre.trim().length < 2) return notificar('Escribe el nombre del negocio', 'error');
    if (wa && !whatsappValido(wa)) return notificar('El WhatsApp debe incluir el código de país, ej.: +57 300 123 4567', 'error');
    if (!colorValido(c.colores.primario) || !colorValido(c.colores.acento)) return notificar('Revisa los colores', 'error');
    const contenido: Contenido = {
      ...c,
      como_pedir: c.como_pedir.map((s) => s.trim()).filter(Boolean),
      faq: c.faq.filter((f) => f.pregunta.trim() && f.respuesta.trim()),
      testimonios: c.testimonios.filter((t) => t.nombre.trim() && t.texto.trim()),
    };
    setGuardando(true);
    const { error } = await db()
      .from('dp_tiendas')
      .update({ nombre: nombre.trim(), whatsapp: wa, contenido, meses_retencion: Math.min(60, Math.max(1, Math.round(meses))) })
      .eq('id', tienda.id);
    setGuardando(false);
    if (error) return notificar(textoError(error), 'error');
    setWhatsapp(wa);
    notificar('Datos del negocio guardados');
    void alGuardar();
  };

  const subir = async (tipo: 'logo' | 'banner', archivos: FileList | null) => {
    const f = archivos?.[0];
    if (!f) return;
    setSubiendo(tipo);
    try {
      const url = await subirFoto(tienda.id, f, 'marca', tipo === 'logo' ? 400 : 1800);
      cambiar(tipo === 'logo' ? { logo_url: url } : { banner_url: url });
      notificar('Imagen lista. Recuerda guardar.');
    } catch (e) {
      notificar(textoError(e), 'error');
    } finally {
      setSubiendo('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primario">Mi negocio</h1>
          <p className="text-sm text-tinta-2">Nombre, contacto, apariencia y todos los textos de tu tienda.</p>
        </div>
        {puedeEditar && (
          <Boton onClick={() => void guardar()} cargando={guardando} disabled={!!subiendo}>
            Guardar cambios
          </Boton>
        )}
      </div>

      <fieldset disabled={!puedeEditar} className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Datos principales">
          <div className="space-y-4">
            <Campo etiqueta="Nombre del negocio">
              <Entrada value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
            </Campo>
            <Campo etiqueta="WhatsApp para pedidos" ayuda="Con código de país. Colombia: +57 seguido del celular.">
              <Entrada value={whatsapp} inputMode="tel" placeholder="+57 300 123 4567" onChange={(e) => setWhatsapp(e.target.value)} />
            </Campo>
            <Campo etiqueta="Ciudad o sector">
              <Entrada value={c.ciudad} onChange={(e) => cambiar({ ciudad: e.target.value })} placeholder="La Estrella, Antioquia" />
            </Campo>
            <Campo etiqueta="Horario de atención">
              <Entrada value={c.horario_texto} onChange={(e) => cambiar({ horario_texto: e.target.value })} placeholder="Lunes a sábado, 9:00 a. m. a 6:00 p. m." />
            </Campo>
            <Campo etiqueta="Correo (opcional)">
              <Entrada type="email" value={c.correo} onChange={(e) => cambiar({ correo: e.target.value })} />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Apariencia">
          <div className="grid grid-cols-2 gap-4">
            <ImagenMarca titulo="Logotipo" url={c.logo_url} cargando={subiendo === 'logo'} redonda onElegir={(f) => void subir('logo', f)} onQuitar={() => cambiar({ logo_url: '' })} />
            <ImagenMarca titulo="Foto principal" url={c.banner_url} cargando={subiendo === 'banner'} onElegir={(f) => void subir('banner', f)} onQuitar={() => cambiar({ banner_url: '' })} />
            <Campo etiqueta="Color principal">
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={c.colores.primario}
                  onChange={(e) => cambiar({ colores: { ...c.colores, primario: e.target.value } })}
                  className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <code className="text-xs text-tinta-3">{c.colores.primario}</code>
              </span>
            </Campo>
            <Campo etiqueta="Color de acento">
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={c.colores.acento}
                  onChange={(e) => cambiar({ colores: { ...c.colores, acento: e.target.value } })}
                  className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <code className="text-xs text-tinta-3">{c.colores.acento}</code>
              </span>
            </Campo>
          </div>
          <p className="mt-3 text-xs text-tinta-3">Los colores oscuros dan mejor lectura. Sugerencia: chocolate, terracota o vino.</p>
        </Tarjeta>

        <Tarjeta titulo="Textos de la página de inicio" className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo etiqueta="Frase principal">
              <Entrada value={c.eslogan} maxLength={90} onChange={(e) => cambiar({ eslogan: e.target.value })} />
            </Campo>
            <Campo etiqueta="Mensaje de bienvenida">
              <Area value={c.mensaje_bienvenida} maxLength={300} onChange={(e) => cambiar({ mensaje_bienvenida: e.target.value })} />
            </Campo>
            <Campo etiqueta="Entregas y domicilios">
              <Area value={c.info_entregas} maxLength={400} onChange={(e) => cambiar({ info_entregas: e.target.value })} />
            </Campo>
            <Campo etiqueta="Pedidos anticipados">
              <Area value={c.info_anticipacion} maxLength={400} onChange={(e) => cambiar({ info_anticipacion: e.target.value })} />
            </Campo>
            <Campo etiqueta="Cumpleaños, reuniones y eventos">
              <Area value={c.eventos_texto} maxLength={400} onChange={(e) => cambiar({ eventos_texto: e.target.value })} />
            </Campo>
            <Campo etiqueta="Pasos de «Cómo hacer tu pedido»" ayuda="Un paso por línea.">
              <Area
                rows={5}
                value={c.como_pedir.join('\n')}
                onChange={(e) => cambiar({ como_pedir: e.target.value.split('\n') })}
              />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Preguntas frecuentes"
          acciones={
            puedeEditar && (
              <Boton variante="secundario" onClick={() => cambiar({ faq: [...c.faq, { pregunta: '', respuesta: '' }] })}>
                <Plus size={16} /> Agregar
              </Boton>
            )
          }
        >
          <ul className="space-y-4">
            {c.faq.map((f, i) => (
              <li key={i} className="rounded-xl bg-crema p-3">
                <div className="flex gap-2">
                  <Entrada
                    value={f.pregunta}
                    placeholder="Pregunta"
                    className="mt-0 font-semibold"
                    onChange={(e) => cambiar({ faq: c.faq.map((x, k) => (k === i ? { ...x, pregunta: e.target.value } : x)) })}
                  />
                  <Boton variante="suave" className="px-2.5" aria-label="Quitar pregunta" onClick={() => cambiar({ faq: c.faq.filter((_, k) => k !== i) })}>
                    <Trash2 size={16} />
                  </Boton>
                </div>
                <Area
                  value={f.respuesta}
                  placeholder="Respuesta"
                  onChange={(e) => cambiar({ faq: c.faq.map((x, k) => (k === i ? { ...x, respuesta: e.target.value } : x)) })}
                />
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta
          titulo="Testimonios"
          acciones={
            puedeEditar && (
              <Boton variante="secundario" onClick={() => cambiar({ testimonios: [...c.testimonios, { nombre: '', texto: '' }] })}>
                <Plus size={16} /> Agregar
              </Boton>
            )
          }
        >
          <p className="mb-3 text-xs text-tinta-3">
            Solo opiniones reales de clientes, con su permiso. Si no hay ninguno, la sección no aparece en la tienda.
          </p>
          <ul className="space-y-4">
            {c.testimonios.map((t, i) => (
              <li key={i} className="rounded-xl bg-crema p-3">
                <div className="flex gap-2">
                  <Entrada
                    value={t.nombre}
                    placeholder="Nombre del cliente"
                    className="mt-0"
                    onChange={(e) => cambiar({ testimonios: c.testimonios.map((x, k) => (k === i ? { ...x, nombre: e.target.value } : x)) })}
                  />
                  <Boton variante="suave" className="px-2.5" aria-label="Quitar testimonio" onClick={() => cambiar({ testimonios: c.testimonios.filter((_, k) => k !== i) })}>
                    <Trash2 size={16} />
                  </Boton>
                </div>
                <Area
                  value={t.texto}
                  placeholder="Lo que dijo"
                  maxLength={280}
                  onChange={(e) => cambiar({ testimonios: c.testimonios.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)) })}
                />
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Redes sociales">
          <div className="space-y-4">
            <Campo etiqueta="Instagram" ayuda="@usuario o enlace completo">
              <Entrada value={c.instagram} onChange={(e) => cambiar({ instagram: e.target.value })} />
            </Campo>
            <Campo etiqueta="Facebook">
              <Entrada value={c.facebook} onChange={(e) => cambiar({ facebook: e.target.value })} />
            </Campo>
            <Campo etiqueta="TikTok">
              <Entrada value={c.tiktok} onChange={(e) => cambiar({ tiktok: e.target.value })} />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Privacidad de datos (Ley 1581 de 2012)">
          <Campo etiqueta="Política de privacidad" ayuda="Se muestra en la tienda y el cliente la acepta antes de enviar su pedido.">
            <Area rows={7} value={c.privacidad} onChange={(e) => cambiar({ privacidad: e.target.value })} />
          </Campo>
          <Campo etiqueta="Conservar datos de clientes durante (meses)" className="mt-4">
            <Entrada type="number" min={1} max={60} value={meses} onChange={(e) => setMeses(Number(e.target.value) || 12)} />
          </Campo>
          <Anonimizar tienda={tienda} habilitado={puedeEditar} />
        </Tarjeta>
      </fieldset>

      {puedeEditar && <Equipo tienda={tienda} />}

      <Tarjeta titulo="Enlace de tu tienda">
        <p className="break-all rounded-xl bg-crema px-3 py-2 font-mono text-sm">
          {window.location.origin + window.location.pathname}?tienda={tienda.slug}
        </p>
        <p className="mt-2 text-xs text-tinta-3">Compártelo en WhatsApp, Instagram, Facebook o conviértelo en código QR.</p>
      </Tarjeta>
    </div>
  );
}

function ImagenMarca({
  titulo,
  url,
  cargando,
  redonda,
  onElegir,
  onQuitar,
}: {
  titulo: string;
  url: string;
  cargando: boolean;
  redonda?: boolean;
  onElegir: (f: FileList | null) => void;
  onQuitar: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-tinta">{titulo}</p>
      <div className={`relative mt-1 aspect-square overflow-hidden bg-crema-2 ring-1 ring-linea ${redonda ? 'rounded-full' : 'rounded-xl'}`}>
        {url ? (
          <>
            <img src={url} alt={titulo} className="h-full w-full object-cover" />
            <button type="button" onClick={onQuitar} aria-label={`Quitar ${titulo}`} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-tinta/70 text-white">
              <X size={14} />
            </button>
          </>
        ) : (
          <label className="grid h-full w-full cursor-pointer place-items-center text-tinta-3 hover:text-acento">
            {cargando ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onElegir(e.target.files)} />
          </label>
        )}
      </div>
    </div>
  );
}

function Anonimizar({ tienda, habilitado }: { tienda: TiendaFila; habilitado: boolean }) {
  const [cargando, setCargando] = useState(false);
  const ejecutar = async () => {
    if (!window.confirm(`Se borrarán nombre, teléfono y dirección de los pedidos con más de ${tienda.meses_retencion} meses. Los totales se conservan para tus estadísticas. ¿Continuar?`)) return;
    setCargando(true);
    const { data, error } = await db().rpc('dp_anonimizar_pedidos', { p_tienda: tienda.id });
    setCargando(false);
    if (error) return notificar(textoError(error), 'error');
    notificar(`${data as number} pedidos anonimizados`);
  };
  return (
    <div className="mt-4 rounded-xl bg-crema p-3 text-sm text-tinta-2">
      <p>Borra los datos personales de pedidos antiguos según el plazo guardado.</p>
      <Boton variante="secundario" className="mt-2" onClick={() => void ejecutar()} cargando={cargando} disabled={!habilitado}>
        Anonimizar pedidos vencidos
      </Boton>
    </div>
  );
}

function Equipo({ tienda }: { tienda: TiendaFila }) {
  const [invitaciones, setInvitaciones] = useState<{ email: string; rol: string }[]>([]);
  const [email, setEmail] = useState('');

  const cargar = useCallback(async () => {
    const { data } = await db().from('dp_invitaciones').select('email, rol').eq('tienda_id', tienda.id);
    setInvitaciones(data ?? []);
  }, [tienda.id]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return notificar('Correo no válido', 'error');
    const { error } = await db().from('dp_invitaciones').insert({ tienda_id: tienda.id, email: v, rol: 'equipo' });
    if (error) return notificar(textoError(error), 'error');
    setEmail('');
    notificar('Invitación guardada');
    void cargar();
  };

  const quitar = async (correo: string) => {
    await db().from('dp_invitaciones').delete().eq('tienda_id', tienda.id).eq('email', correo);
    void cargar();
  };

  return (
    <Tarjeta titulo="Equipo">
      <p className="text-sm text-tinta-2">
        Autoriza el correo de alguien de tu equipo para que gestione pedidos y productos. Cuando esa persona entre al panel con ese correo
        (verificado), tendrá acceso. No podrá cambiar los datos del negocio.
      </p>
      {invitaciones.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {invitaciones.map((i) => (
            <li key={i.email} className="inline-flex items-center gap-1 rounded-full bg-crema-2 py-1 pl-3 pr-1 text-sm">
              {i.email} <span className="text-tinta-3">· pendiente</span>
              <button type="button" aria-label="Quitar invitación" onClick={() => void quitar(i.email)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-linea">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={invitar} className="mt-3 flex gap-2">
        <Entrada type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className="mt-0" />
        <Boton type="submit" disabled={!email.trim()}>
          Autorizar
        </Boton>
      </form>
    </Tarjeta>
  );
}
