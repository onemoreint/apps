import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { brand } from '@/config/brand';
import { SECURITY_CONTACT } from '@/config/security';
import { go } from '@/state/router';

export type LegalDoc = 'privacidad' | 'condiciones' | 'fuentes' | 'seguridad' | 'cookies' | 'derechos';

export const LEGAL_INDEX: Array<{ doc: LegalDoc; title: string; summary: string }> = [
  { doc: 'privacidad', title: 'Política de privacidad y tratamiento de datos', summary: 'Qué datos se usan, para qué y cómo ejercer tus derechos.' },
  { doc: 'seguridad', title: 'Política de seguridad', summary: 'Cómo se protege la app y cómo reportar una vulnerabilidad.' },
  { doc: 'cookies', title: 'Política de cookies y almacenamiento', summary: 'Qué se guarda en tu dispositivo y por cuánto tiempo.' },
  { doc: 'condiciones', title: 'Términos y condiciones de uso', summary: 'Reglas de uso, responsabilidades y uso aceptable.' },
  { doc: 'derechos', title: 'Derechos de autor y retirada de contenido', summary: 'Licencias musicales y cómo pedir que se retire una fuente.' },
  { doc: 'fuentes', title: 'Fuentes y licencias', summary: 'De dónde viene el audio de cada emisora y con qué permiso.' },
];

const mail = (subject: string) => `mailto:${brand.contact.email}?subject=${encodeURIComponent(subject)}`;

export function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="max-w-2xl space-y-4 text-sm leading-relaxed text-soft [&_a]:text-accent-3 [&_a]:underline [&_h2]:mt-7 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_td]:border [&_td]:border-line [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-line [&_th]:bg-surface-2 [&_th]:p-2 [&_th]:text-left">
      <h1 className="font-display text-3xl font-extrabold text-white">{title}</h1>
      <p className="text-xs text-muted">
        Versión vigente desde el {brand.legalUpdated} · Responsable: {brand.contact.owner} ·{' '}
        <a href={mail(title)}>{brand.contact.email}</a>
      </p>
      {children}
      <p className="pt-4 text-xs text-muted">
        Ver también:{' '}
        {LEGAL_INDEX.filter((d) => d.title !== title).map((d, i) => (
          <span key={d.doc}>
            {i > 0 && ' · '}
            <a href={`#/${d.doc}`}>{d.title}</a>
          </span>
        ))}
      </p>
    </article>
  );
}

export function LegalHub() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold">Legal y seguridad</h1>
      <p className="text-sm text-muted">Todas las políticas de {brand.name} en un solo lugar.</p>
      <nav className="overflow-hidden rounded-2xl border border-line" aria-label="Políticas">
        {LEGAL_INDEX.map((d) => (
          <button key={d.doc} type="button" onClick={() => go(`/${d.doc}`)} className="flex w-full items-center gap-3 border-b border-line bg-surface px-4 py-3.5 text-left last:border-0 hover:bg-surface-2">
            <span className="flex-1">
              <span className="block text-sm font-semibold">{d.title}</span>
              <span className="block text-xs text-muted">{d.summary}</span>
            </span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ───────────── Privacidad (Ley 1581 de 2012, Colombia) ───────────── */

export function Privacy() {
  return (
    <Doc title="Política de privacidad y tratamiento de datos">
      <h2>1. Responsable del tratamiento</h2>
      <p>
        {brand.contact.owner}, operador de {brand.name}. Correo para consultas y reclamos: <a href={mail('Datos personales')}>{brand.contact.email}</a>. WhatsApp: {brand.contact.whatsapp}.
      </p>

      <h2>2. Principio general: mínimos datos</h2>
      <p>
        La app no pide registro, nombre, correo ni teléfono para escuchar. No usa analítica, publicidad, perfiles ni cookies de seguimiento. No vende ni cede datos a terceros.
      </p>

      <h2>3. Datos que se tratan y finalidad</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th>Dato</th>
            <th>Dónde se guarda</th>
            <th>Finalidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Favoritos, recientes, volumen, playlists que añadas</td>
            <td>Solo en tu dispositivo</td>
            <td>Recordar tus preferencias. Nunca se envían al operador.</td>
          </tr>
          <tr>
            <td>Dirección IP y datos técnicos de la conexión</td>
            <td>Servidores de alojamiento y de las fuentes de audio</td>
            <td>Entregar la página y el audio (inevitable en cualquier visita web).</td>
          </tr>
          <tr>
            <td>Permiso temporal de Spotify (solo el administrador)</td>
            <td>Solo en la pestaña abierta; se borra al cerrarla</td>
            <td>Listar las playlists propias para organizarlas en la radio.</td>
          </tr>
          <tr>
            <td>Lo que nos escribas por correo o WhatsApp</td>
            <td>Buzón del operador</td>
            <td>Responder tu solicitud. Se conserva el tiempo necesario para atenderla.</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Terceros que intervienen</h2>
      <ul>
        <li>
          <b>GitHub Pages</b> (alojamiento): registra datos técnicos de acceso según su propia política.
        </li>
        <li>
          <b>Internet Archive</b> y los servidores de cada emisora: tu navegador se conecta directamente a ellos para recibir el audio.
        </li>
        <li>
          <b>Spotify</b>: solo si abres una playlist se carga su reproductor, que aplica su política de privacidad y sus cookies dentro de ese recuadro.
        </li>
      </ul>
      <p>Algunos de estos servicios están fuera de Colombia, por lo que la conexión implica una transmisión internacional de datos técnicos necesaria para prestar el servicio.</p>

      <h2>5. Tus derechos</h2>
      <p>Como titular puedes:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de la autorización otorgada, cuando aplique.</li>
        <li>Ser informado del uso que se ha dado a tus datos.</li>
        <li>Revocar la autorización y pedir la supresión de tus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) después de agotar el trámite ante el responsable.</li>
        <li>Acceder gratuitamente a tus datos.</li>
      </ul>
      <p>
        Los datos de tu dispositivo los borras tú mismo en «Mi radio → Borrar mis datos de este dispositivo» o desde la configuración del navegador; el operador no tiene acceso a ellos.
      </p>

      <h2>6. Cómo ejercerlos</h2>
      <ul>
        <li>
          Escribe a <a href={mail('Solicitud de datos personales')}>{brand.contact.email}</a> indicando tu nombre, la solicitud y un medio de respuesta.
        </li>
        <li>
          <b>Consultas:</b> se responden en máximo 10 días hábiles (prorrogables 5 días hábiles más, avisando el motivo).
        </li>
        <li>
          <b>Reclamos</b> (corrección, actualización o supresión): se responden en máximo 15 días hábiles (prorrogables 8 días hábiles más, avisando el motivo).
        </li>
      </ul>

      <h2>7. Menores de edad</h2>
      <p>La app no recoge datos de menores. Los padres o tutores pueden borrar los datos locales en cualquier momento.</p>

      <h2>8. Seguridad y cambios</h2>
      <p>
        Las medidas de protección se describen en la <a href="#/seguridad">Política de seguridad</a>. Si esta política cambia, se publicará aquí con su nueva fecha de vigencia. Marco legal: Ley 1581 de 2012 y
        Decreto 1074 de 2015 (Colombia).
      </p>
    </Doc>
  );
}

/* ───────────── Seguridad ───────────── */

export function Security() {
  return (
    <Doc title="Política de seguridad">
      <h2>1. Compromiso</h2>
      <p>
        {brand.name} se diseña para recoger el mínimo de información y proteger a quien la usa. Esta política explica las medidas aplicadas, cómo reportar fallos y cómo se gestionan los incidentes.
      </p>

      <h2>2. Medidas técnicas aplicadas</h2>
      <h3>Conexión y navegador</h3>
      <ul>
        <li>Toda la app se sirve por HTTPS. Solo se aceptan fuentes de audio, imágenes y metadatos por HTTPS.</li>
        <li>
          Política de seguridad del contenido (CSP): solo se ejecuta el código propio de la app; sin <code>eval</code>, sin scripts en línea y sin librerías cargadas desde terceros. Se bloquean plugins
          (<code>object-src &apos;none&apos;</code>) y el único contenido incrustado permitido es el reproductor oficial de Spotify.
        </li>
        <li>Donde el alojamiento lo permite: HSTS, prohibición de incrustar la app en otros sitios (anti-clickjacking), <code>nosniff</code> y desactivación de cámara, micrófono, ubicación y pagos.</li>
        <li>Los enlaces externos se abren sin pasar referencias ni permitir que la página nueva controle la app.</li>
      </ul>
      <h3>Datos y credenciales</h3>
      <ul>
        <li>No hay cuentas de usuario, contraseñas ni bases de datos con datos personales.</li>
        <li>No hay secretos en el código: la conexión con Spotify usa OAuth 2.0 con PKCE, que no requiere clave secreta, y valida el parámetro <code>state</code> contra falsificación de solicitudes.</li>
        <li>El permiso de Spotify se guarda solo en la pestaña (sessionStorage) y caduca solo; nunca se envía a otros servidores.</li>
        <li>Las preferencias se guardan en el dispositivo y se pueden borrar desde la app.</li>
      </ul>
      <h3>Contenido y fuentes</h3>
      <ul>
        <li>Cada URL de audio o imagen se valida: solo https, sin usuario/contraseña embebidos y sin direcciones locales o privadas (127.x, 10.x, 192.168.x…).</li>
        <li>Una emisora sin licencia declarada no se puede reproducir.</li>
        <li>El catálogo importado en el panel se valida antes de usarse y tiene un tamaño máximo.</li>
      </ul>
      <h3>Desarrollo y publicación</h3>
      <ul>
        <li>Cada cambio pasa por comprobación de tipos, pruebas automáticas, auditoría de dependencias y compilación en GitHub Actions.</li>
        <li>Las dependencias se revisan semanalmente con Dependabot.</li>
        <li>Publicar el catálogo exige la cuenta de GitHub del propietario (recomendado: verificación en dos pasos activada).</li>
        <li>Las actualizaciones de la app instalada se aplican cuando la persona pulsa «Actualizar».</li>
      </ul>

      <h2>3. Reportar una vulnerabilidad</h2>
      <p>
        Si encuentras un fallo de seguridad, escribe a <a href={`mailto:${SECURITY_CONTACT}?subject=${encodeURIComponent('Vulnerabilidad en Radio Mix')}`}>{SECURITY_CONTACT}</a> con el asunto
        «Vulnerabilidad en Radio Mix», describiendo el problema, los pasos para reproducirlo y su posible impacto. También está publicado en <code>/.well-known/security.txt</code>.
      </p>
      <ul>
        <li>Acuse de recibo en máximo 3 días hábiles.</li>
        <li>Evaluación inicial en máximo 10 días hábiles.</li>
        <li>Corrección de fallos graves lo antes posible; te informaremos cuando esté resuelto y, si lo deseas, te daremos el crédito.</li>
      </ul>
      <h3>Investigación de buena fe</h3>
      <p>
        No emprenderemos acciones contra quien investigue de buena fe, siempre que: no acceda ni modifique datos de otras personas, no degrade el servicio (sin pruebas de denegación de servicio ni envío masivo),
        no ataque a terceros (GitHub, Spotify, Internet Archive, emisoras) y nos dé un plazo razonable antes de hacer público el hallazgo.
      </p>
      <h3>Fuera de alcance</h3>
      <ul>
        <li>Fallos en servicios de terceros: repórtalos a ellos directamente.</li>
        <li>Cabeceras que GitHub Pages no permite configurar (la CSP se aplica igualmente desde la propia página).</li>
        <li>Ingeniería social, ataques físicos o a dispositivos de otras personas.</li>
      </ul>

      <h2>4. Gestión de incidentes</h2>
      <ol>
        <li>Contención inmediata: retirar la fuente, versión o enlace afectado.</li>
        <li>Análisis de causa y corrección.</li>
        <li>Aviso a las personas afectadas cuando corresponda y, si hubiera datos personales comprometidos, reporte a la Superintendencia de Industria y Comercio dentro de los 15 días hábiles siguientes a su detección.</li>
        <li>Registro de lo ocurrido y de las medidas para evitar que se repita.</li>
      </ol>

      <h2>5. Recomendaciones para ti</h2>
      <ul>
        <li>Instala la app solo desde la dirección oficial: https://onemoreint.github.io/apps/radio-mix/app/</li>
        <li>La radio nunca te pedirá contraseñas, datos bancarios ni códigos por WhatsApp o correo.</li>
        <li>Mantén tu navegador y sistema actualizados.</li>
      </ul>
    </Doc>
  );
}

/* ───────────── Cookies y almacenamiento ───────────── */

export function Cookies() {
  const rows: Array<[string, string, string, string]> = [
    ['radiomix:favorites', 'Almacenamiento local', 'Tus emisoras favoritas', 'Hasta que las borres'],
    ['radiomix:recents', 'Almacenamiento local', 'Últimas 12 emisoras escuchadas', 'Hasta que las borres'],
    ['radiomix:volume', 'Almacenamiento local', 'Recordar el volumen', 'Hasta que lo borres'],
    ['radiomix:myPlaylists', 'Almacenamiento local', 'Playlists de Spotify que añadas', 'Hasta que las borres'],
    ['radiomix:oembed', 'Almacenamiento local', 'Título y portada de playlists (evita repetir consultas)', 'Hasta que lo borres'],
    ['radiomix:program:…', 'Almacenamiento local', 'Lista de pistas de cada programa', '7 días'],
    ['radiomix:draft, previewDraft, spotifyClientId', 'Almacenamiento local', 'Solo administración: borrador del catálogo y configuración', 'Hasta que se descarte'],
    ['radiomix:splash', 'Sesión', 'Mostrar la bienvenida una vez', 'Al cerrar la pestaña'],
    ['radiomix:spotify-token, radiomix:pkce', 'Sesión', 'Solo administración: permiso temporal de Spotify', 'Al cerrar la pestaña'],
    ['Caché de la app (workbox-…, catalogo-pistas, portadas)', 'Caché del navegador', 'Abrir rápido y funcionar como app instalada. No guarda audio.', 'Se renueva con cada versión; listas 7 días, portadas 30 días'],
  ];
  return (
    <Doc title="Política de cookies y almacenamiento">
      <h2>1. ¿Usa cookies la app?</h2>
      <p>
        <b>No.</b> {brand.name} no instala cookies propias, ni de analítica, ni de publicidad. Por eso no te mostramos un aviso de consentimiento de cookies.
      </p>
      <h2>2. Lo que sí se guarda en tu dispositivo</h2>
      <p>Para funcionar usa el almacenamiento del navegador. Todo es estrictamente necesario o de preferencia, y nada sale de tu dispositivo.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Para qué</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i}>{i === 0 ? <code>{c}</code> : c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>3. Cookies de terceros</h2>
      <p>
        Si abres una playlist, el reproductor de <b>Spotify</b> funciona dentro de un recuadro aislado y puede usar sus propias cookies según la política de Spotify. Si no abres playlists, ese reproductor no se
        carga.
      </p>
      <h2>4. Cómo borrarlo</h2>
      <ul>
        <li>En la app: «Mi radio → Borrar mis datos de este dispositivo».</li>
        <li>En el navegador: Configuración → Privacidad → Datos de sitios → borrar los de este sitio.</li>
        <li>Si desinstalas la app instalada, el sistema borra sus datos.</li>
      </ul>
    </Doc>
  );
}

/* ───────────── Términos y condiciones ───────────── */

export function Terms() {
  return (
    <Doc title="Términos y condiciones de uso">
      <h2>1. Aceptación</h2>
      <p>Al usar {brand.name} aceptas estas condiciones. Si no estás de acuerdo, no uses la app.</p>
      <h2>2. El servicio</h2>
      <ul>
        <li>La app es gratuita y se ofrece «tal cual». Las emisoras dependen de servidores externos y pueden interrumpirse, cambiar o retirarse sin aviso.</li>
        <li>
          La escucha en segundo plano depende del sistema: en iPhone/iPad el audio de las apps web puede detenerse al bloquear la pantalla o cambiar de app; en Android suele continuar según el navegador y el
          ahorro de batería.
        </li>
        <li>No se ofrece escucha sin conexión.</li>
      </ul>
      <h2>3. Uso permitido</h2>
      <p>Puedes escuchar para uso personal y compartir el enlace de la app.</p>
      <h2>4. Uso prohibido</h2>
      <ul>
        <li>Grabar, descargar, retransmitir o comercializar el audio, salvo lo que permita expresamente la licencia de cada obra.</li>
        <li>Intentar acceder sin autorización, interferir con el servicio, sobrecargarlo o automatizar el acceso de forma abusiva.</li>
        <li>Usar la marca, el nombre o la apariencia de la app para suplantarla o confundir a otras personas.</li>
        <li>Introducir en el panel fuentes sin licencia, contenidos ilegales o enlaces maliciosos.</li>
      </ul>
      <h2>5. Spotify</h2>
      <p>
        Las playlists se escuchan con el reproductor de Spotify y bajo sus condiciones. {brand.name} no aloja, descarga ni retransmite contenido de Spotify y no está afiliada a Spotify.
      </p>
      <h2>6. Propiedad intelectual</h2>
      <p>
        El nombre, logotipo, diseño y código de la app pertenecen a su titular. Las obras musicales pertenecen a sus autores y se usan según la licencia indicada en <a href="#/fuentes">Fuentes y licencias</a>.
        Ver también <a href="#/derechos">Derechos de autor y retirada de contenido</a>.
      </p>
      <h2>7. Responsabilidad</h2>
      <p>
        En la medida que permita la ley, el operador no responde por interrupciones de servicios de terceros, por el contenido de emisoras externas ni por daños derivados de un uso contrario a estas
        condiciones. Nada de esto limita los derechos que te reconoce la ley de protección al consumidor.
      </p>
      <h2>8. Cambios y ley aplicable</h2>
      <p>
        Estas condiciones pueden actualizarse; la versión vigente es la publicada aquí con su fecha. Se rigen por las leyes de la República de Colombia. Contacto:{' '}
        <a href={mail('Condiciones de uso')}>{brand.contact.email}</a>.
      </p>
    </Doc>
  );
}

/* ───────────── Derechos de autor y retirada ───────────── */

export function Copyright() {
  return (
    <Doc title="Derechos de autor y retirada de contenido">
      <h2>1. Política de licencias</h2>
      <ul>
        <li>Solo se publican fuentes con un permiso verificable para difundirse en esta app: dominio público, licencias abiertas (como CC BY) o licencias/autorizaciones escritas.</li>
        <li>Una URL pública no se considera un permiso.</li>
        <li>
          La música comercial requiere licencia de comunicación pública en cada país donde se ofrezca: en Colombia ante la Organización Sayco-Acinpro (OSA); en Venezuela ante SACVEN y AVINPRO; en otros países,
          ante su sociedad de gestión.
        </li>
        <li>Las obras con licencia CC BY muestran su atribución en el reproductor y en <a href="#/fuentes">Fuentes y licencias</a>.</li>
      </ul>
      <h2>2. Cómo pedir que se retire una fuente</h2>
      <p>
        Si eres titular de derechos (o su representante) y consideras que una emisora o pista no debería estar aquí, escribe a{' '}
        <a href={mail('Solicitud de retirada de contenido')}>{brand.contact.email}</a> con:
      </p>
      <ol>
        <li>Tu nombre y datos de contacto, y en qué calidad actúas.</li>
        <li>La obra protegida y la emisora o pista concreta donde aparece.</li>
        <li>Una declaración de buena fe de que el uso no está autorizado.</li>
        <li>Una declaración de que la información es exacta.</li>
      </ol>
      <h2>3. Qué haremos</h2>
      <ul>
        <li>Desactivar la fuente señalada en máximo 2 días hábiles mientras se revisa.</li>
        <li>Revisar la licencia o autorización y responderte en máximo 10 días hábiles.</li>
        <li>Si la fuente tenía permiso válido, te enviaremos la prueba y podrá restablecerse; si no, se retira de forma definitiva.</li>
      </ul>
      <h2>4. Uso de marcas</h2>
      <p>Spotify, Internet Archive y otras marcas citadas pertenecen a sus titulares; se mencionan solo para identificar los servicios. No implican patrocinio ni afiliación.</p>
    </Doc>
  );
}
