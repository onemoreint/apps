import { useEffect, useState, type ReactNode } from 'react';
import { Camera, Minus, Plus, ShoppingBag, MessageCircle, Clock, Sparkles, X } from 'lucide-react';
import { cop } from '@/core/dinero';
import { precioDesde, unidadesCarrito, calcularLineas, subtotalCarrito } from '@/core/carrito';
import { textoPreparacion } from '@/core/fechas';
import { enlaceWhatsApp } from '@/core/whatsapp';
import type { Catalogo, Producto } from '@/core/tipos';
import { enlace } from '@/app/ruta';
import { useTienda } from './estado';

export function nombreCategoria(c: Catalogo, id: string | null): string {
  return c.categorias.find((x) => x.id === id)?.nombre ?? '';
}

/** Espacio neutro cuando aún no hay fotografía (sin dibujos ni imágenes falsas). */
/** Contorno de blonda: el papel calado que va bajo una torta. Se calcula una vez. */
const BLONDA = (() => {
  const lobulos = 40;
  const punto = (r: number, a: number) => `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
  let d = `M${punto(95, 0)}`;
  for (let i = 0; i < lobulos; i++) {
    const a = (i * 2 * Math.PI) / lobulos;
    const paso = (2 * Math.PI) / lobulos;
    d += `Q${punto(103, a + paso / 2)} ${punto(95, a + paso)}`;
  }
  return d + 'Z';
})();
const CALADOS = (() => {
  const anillo = (r: number, n: number, radio: number, giro = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n + giro;
      const x = 100 + r * Math.cos(a);
      const y = 100 + r * Math.sin(a);
      return `M${(x - radio).toFixed(2)} ${y.toFixed(2)}a${radio} ${radio} 0 1 0 ${radio * 2} 0a${radio} ${radio} 0 1 0 ${-radio * 2} 0Z`;
    }).join('');
  return anillo(90.5, 40, 1.7, Math.PI / 40) + anillo(85.5, 40, 1, 0);
})();

/** Foto redonda sobre una blonda de papel. El calado deja ver el color que haya detrás. */
export function Plato({
  foto,
  alt = '',
  color = '#ffffff',
  referencia = false,
  sinCalados = false,
  prioridad = false,
  className = '',
}: {
  foto: string;
  alt?: string;
  color?: string;
  referencia?: boolean;
  sinCalados?: boolean;
  prioridad?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative aspect-square ${className}`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={sinCalados ? BLONDA : BLONDA + CALADOS} fill={color} fillRule="evenodd" />
      </svg>
      <div className={`absolute overflow-hidden rounded-full bg-crema-2 ${sinCalados ? 'inset-[6%]' : 'inset-[9.5%]'}`}>
        {foto ? (
          <img src={foto} alt={alt} loading={prioridad ? 'eager' : 'lazy'} fetchPriority={prioridad ? 'high' : undefined} className="h-full w-full object-cover" />
        ) : (
          <SinFoto className="h-full w-full" />
        )}
        {foto && referencia && <EtiquetaReferencia />}
      </div>
    </div>
  );
}

/** Borde inferior de la portada: el glaseado chorrea sobre la página. */
const GOTAS: [number, number, number][] = [
  [40, 34, 40], [120, 46, 74], [214, 30, 26], [292, 54, 96], [410, 32, 44], [486, 44, 66], [590, 28, 22],
  [664, 50, 88], [770, 34, 36], [850, 46, 104], [958, 30, 30], [1036, 52, 70], [1146, 32, 48], [1226, 44, 92], [1330, 36, 34],
];
const CHORREADO = (() => {
  const base = 8;
  const r = 14;
  let d = `M0 0H1440V${base}`;
  for (const [x, w, h] of [...GOTAS].reverse()) {
    const fondo = base + h;
    d += `L${x + w + r} ${base}Q${x + w} ${base} ${x + w} ${base + r}V${fondo - w / 2}A${w / 2} ${w / 2} 0 0 1 ${x} ${fondo - w / 2}V${base + r}Q${x} ${base} ${x - r} ${base}`;
  }
  return d + `L0 ${base}Z`;
})();

export function Chorreado() {
  return (
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="xMidYMin slice"
      className="chorreado -mt-px block h-[max(96px,8.34vw)] w-full"
      aria-hidden
    >
      <path d={CHORREADO} fill="var(--acento)" />
    </svg>
  );
}

export function SinFoto({ className = '', texto = 'Foto próximamente' }: { className?: string; texto?: string }) {
  return (
    <div className={`grid place-items-center bg-rosa text-tinta-2 ${className}`}>
      <span className="flex flex-col items-center gap-1 text-[12px] font-medium">
        <Camera size={22} strokeWidth={1.6} aria-hidden />
        {texto}
      </span>
    </div>
  );
}

/**
 * Fotografía del producto. En la tienda de demostración las fotos son de
 * referencia (banco de imágenes) y se marcan como tales.
 */
export function FotoProducto({
  producto,
  referencia = false,
  className = '',
  grande = false,
}: {
  producto: Producto;
  referencia?: boolean;
  className?: string;
  grande?: boolean;
}) {
  const [fallo, setFallo] = useState(false);
  const foto = producto.fotos[0];
  if (!foto || fallo) return <SinFoto className={className} />;
  return (
    <div className={`relative overflow-hidden bg-crema-2 ${className}`}>
      <img
        src={foto}
        alt={producto.nombre}
        loading={grande ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFallo(true)}
        className="h-full w-full object-cover"
      />
      {referencia && <EtiquetaReferencia />}
    </div>
  );
}

export function EtiquetaReferencia() {
  return (
    <span className="absolute bottom-1.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-tinta/70 px-2 py-0.5 text-[10px] font-medium text-white">
      Foto de referencia
    </span>
  );
}

export function Etiquetas({ p, compacto = false }: { p: Producto; compacto?: boolean }) {
  const textos: string[] = [];
  if (p.nuevo) textos.push('Nuevo');
  if (p.por_encargo) textos.push('Por encargo');
  if (!compacto && p.destacado) textos.push('De los más pedidos');
  if (textos.length === 0) return compacto ? <span className="mb-2" /> : null;
  return <p className={`text-[13px] font-bold text-acento ${compacto ? 'mb-2 mt-0.5' : 'mb-2'}`}>{textos.join(', ')}</p>;
}

export function Precio({ p, className = '' }: { p: Producto; className?: string }) {
  const { valor, varios } = precioDesde(p);
  return (
    <span className={`precio ${className}`}>
      {varios && <span className="mr-1 text-[0.8em] font-medium">desde</span>}
      {cop(valor)}
    </span>
  );
}

/** Producto en vitrina: foto bajo una campana de cristal, sobre su base. */
export function Campana({ p, referencia, grande = false }: { p: Producto; referencia: boolean; grande?: boolean }) {
  return (
    <div className="campana">
      <div className="campana__cristal">
        <FotoProducto producto={p} referencia={referencia} grande={grande} className={`campana__foto aspect-[4/5] ${!p.disponible ? 'grayscale-[0.6]' : ''}`} />
        {!p.disponible && (
          <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-6 bg-tinta px-3 py-1 text-sm font-extrabold text-white">
            Agotado
          </span>
        )}
      </div>
      <div className="campana__base" />
      <div className="campana__pie" />
    </div>
  );
}

export function TarjetaProducto({ p, catalogo }: { p: Producto; catalogo: Catalogo }) {
  return (
    <a href={enlace(`/p/${p.id}`)} className="flex flex-col items-center text-center">
      <div className="w-full px-[5%]">
        <Campana p={p} referencia={catalogo.tienda.demo} />
      </div>
      <h3 className="mt-3 font-sans text-[1.06rem] font-bold leading-snug text-tinta">{p.nombre}</h3>
      {p.presentacion && <p className="mt-0.5 text-[13px] text-tinta-3">{p.presentacion}</p>}
      <Etiquetas p={p} compacto />
      <Precio p={p} className="etiqueta-precio mt-auto translate-y-1 text-[1.02rem]" />
      {p.horas_preparacion >= 24 && (
        <p className="mt-3 flex items-center gap-1 text-[12px] text-tinta-3">
          <Clock size={12} aria-hidden /> {textoPreparacion(p.horas_preparacion)}
        </p>
      )}
    </a>
  );
}

export function Cantidad({
  valor,
  min = 1,
  onChange,
  etiqueta,
}: {
  valor: number;
  min?: number;
  onChange: (n: number) => void;
  etiqueta: string;
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-crema-2 ring-1 ring-linea" role="group" aria-label={etiqueta}>
      <button
        type="button"
        aria-label="Quitar uno"
        disabled={valor <= min}
        onClick={() => onChange(valor - 1)}
        className="grid h-10 w-10 place-items-center rounded-full text-primario disabled:opacity-35"
      >
        <Minus size={18} />
      </button>
      <span className="precio min-w-8 text-center font-semibold" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        aria-label="Agregar uno"
        disabled={valor >= 999}
        onClick={() => onChange(valor + 1)}
        className="grid h-10 w-10 place-items-center rounded-full text-primario disabled:opacity-35"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

/** Barra fija con el carrito, visible cuando hay productos (oculta en carrito y pedido). */
export function BarraCarrito({ catalogo, oculta }: { catalogo: Catalogo; oculta: boolean }) {
  const lineas = useTienda((s) => s.lineas);
  if (oculta || lineas.length === 0) return null;
  const total = subtotalCarrito(calcularLineas(lineas, catalogo.productos));
  const n = unidadesCarrito(lineas);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <a
        href={enlace('/carrito')}
        className="aparecer mx-auto flex max-w-xl items-center justify-between gap-3 rounded-full bg-primario px-6 py-3.5 text-en-primario shadow-[0_10px_24px_-10px_rgba(42,20,32,0.6)]"
      >
        <span className="flex items-center gap-2.5 font-semibold">
          <span className="relative">
            <ShoppingBag size={22} />
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-maracuya px-1 text-[11px] font-extrabold text-tinta">
              {n}
            </span>
          </span>
          Ver mi pedido
        </span>
        <span className="precio text-lg font-bold">{cop(total)}</span>
      </a>
    </div>
  );
}

export function WhatsAppFlotante({ numero, nombre, subir }: { numero: string; nombre: string; subir: boolean }) {
  if (!numero) return null;
  return (
    <a
      href={enlaceWhatsApp(numero, `Hola, ${nombre}. Tengo una pregunta.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      className={`fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-whatsapp text-white shadow-[0_10px_25px_-8px_rgba(18,140,74,0.7)] transition-[bottom] hover:bg-whatsapp-oscuro ${subir ? 'bottom-[92px]' : 'bottom-[max(18px,env(safe-area-inset-bottom))]'}`}
    >
      <MessageCircle size={26} />
    </a>
  );
}

export function BannerDemo() {
  const [cerrado, setCerrado] = useState(false);
  if (cerrado) return null;
  return (
    <div className="flex items-start gap-2 bg-tinta px-4 py-2 text-[13px] text-crema">
      <Sparkles size={16} className="mt-0.5 shrink-0 text-maracuya" />
      <p className="flex-1">
        <strong className="font-semibold">Tienda de demostración.</strong> Productos y precios de ejemplo, fotos de referencia; los pedidos
        de prueba no se preparan.
      </p>
      <button type="button" onClick={() => setCerrado(true)} aria-label="Cerrar aviso" className="text-crema/70">
        <X size={16} />
      </button>
    </div>
  );
}

export function Aviso() {
  const aviso = useTienda((s) => s.aviso);
  const avisar = useTienda((s) => s.avisar);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => avisar(null), 2600);
    return () => clearTimeout(t);
  }, [aviso, avisar]);
  if (!aviso) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="aparecer rounded-full bg-tinta px-4 py-2.5 text-sm font-medium text-crema shadow-lg">{aviso}</div>
    </div>
  );
}

export function Seccion({ id, titulo, children, className = '' }: { id?: string; titulo: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-4 py-10 sm:py-14 ${className}`}>
      <h2 className="mb-7 text-[clamp(2rem,6vw,3.2rem)] leading-tight text-primario">{titulo}</h2>
      {children}
    </section>
  );
}
