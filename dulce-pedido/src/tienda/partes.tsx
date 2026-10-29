import { useEffect, useState, type ReactNode } from 'react';
import { Minus, Plus, ShoppingBag, MessageCircle, Clock, Sparkles, X } from 'lucide-react';
import { cop } from '@/core/dinero';
import { precioDesde, unidadesCarrito, calcularLineas, subtotalCarrito } from '@/core/carrito';
import { textoPreparacion } from '@/core/fechas';
import { enlaceWhatsApp } from '@/core/whatsapp';
import type { Catalogo, Producto } from '@/core/tipos';
import { enlace } from '@/app/ruta';
import { Ilustracion } from './Ilustracion';
import { useTienda } from './estado';

export function nombreCategoria(c: Catalogo, id: string | null): string {
  return c.categorias.find((x) => x.id === id)?.nombre ?? '';
}

/** Foto real del producto o, si no hay, ilustración marcada como tal. */
export function FotoProducto({
  producto,
  categoria,
  className = '',
  grande = false,
}: {
  producto: Producto;
  categoria: string;
  className?: string;
  grande?: boolean;
}) {
  const [fallo, setFallo] = useState(false);
  const foto = producto.fotos[0];
  return (
    <div className={`relative overflow-hidden bg-crema-2 ${className}`}>
      {foto && !fallo ? (
        <img
          src={foto}
          alt={producto.nombre}
          loading={grande ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFallo(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <Ilustracion texto={`${producto.nombre} ${categoria}`} className="h-full w-full" />
          <span className="absolute bottom-2 left-2 rounded-full bg-papel/85 px-2 py-0.5 text-[11px] font-medium text-tinta-2 backdrop-blur-sm">
            Imagen ilustrativa
          </span>
        </>
      )}
    </div>
  );
}

export function Etiquetas({ p, compacto = false }: { p: Producto; compacto?: boolean }) {
  const chips: { t: string; c: string }[] = [];
  if (!p.disponible) chips.push({ t: 'Agotado', c: 'bg-tinta text-crema' });
  if (p.destacado) chips.push({ t: 'Destacado', c: 'bg-acento text-white' });
  if (p.nuevo) chips.push({ t: 'Nuevo', c: 'bg-rosa text-primario' });
  if (p.por_encargo) chips.push({ t: 'Por encargo', c: 'bg-papel text-primario ring-1 ring-linea' });
  if (chips.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${compacto ? '' : 'mb-2'}`}>
      {chips.map((x) => (
        <span key={x.t} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${x.c}`}>
          {x.t}
        </span>
      ))}
    </div>
  );
}

export function Precio({ p, className = '' }: { p: Producto; className?: string }) {
  const { valor, varios } = precioDesde(p);
  return (
    <span className={`precio ${className}`}>
      {varios && <span className="block text-[0.72em] font-normal leading-tight text-tinta-3">desde</span>}
      {cop(valor)}
    </span>
  );
}

export function TarjetaProducto({ p, catalogo }: { p: Producto; catalogo: Catalogo }) {
  const cat = nombreCategoria(catalogo, p.categoria_id);
  return (
    <a
      href={enlace(`/p/${p.id}`)}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-papel shadow-[0_1px_0_rgba(46,29,21,0.04),0_8px_24px_-12px_rgba(46,29,21,0.18)] ring-1 ring-linea/70 transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(46,29,21,0.3)] ${!p.disponible ? 'opacity-75' : ''}`}
    >
      <div className="relative">
        <FotoProducto producto={p} categoria={cat} className="aspect-[4/3]" />
        <div className="absolute left-2 top-2">
          <Etiquetas p={p} compacto />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="text-[1.05rem] font-semibold leading-snug text-tinta">{p.nombre}</h3>
        {p.presentacion && <p className="text-[13px] text-tinta-3">{p.presentacion}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Precio p={p} className="text-lg font-bold text-primario" />
          <span
            aria-hidden
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${p.disponible ? 'bg-primario text-en-primario' : 'bg-crema-2 text-tinta-3'}`}
          >
            <Plus size={18} />
          </span>
        </div>
        {p.horas_preparacion >= 24 && (
          <p className="flex items-center gap-1 text-[12px] text-tinta-3">
            <Clock size={12} /> {textoPreparacion(p.horas_preparacion)}
          </p>
        )}
      </div>
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
        className="aparecer mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-primario px-4 py-3.5 text-en-primario shadow-[0_12px_30px_-10px_rgba(46,29,21,0.55)]"
      >
        <span className="flex items-center gap-2.5 font-semibold">
          <span className="relative">
            <ShoppingBag size={22} />
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-acento px-1 text-[11px] font-bold text-white">
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
      <Sparkles size={16} className="mt-0.5 shrink-0 text-rosa-2" />
      <p className="flex-1">
        <strong className="font-semibold">Tienda de demostración.</strong> Productos, precios e imágenes son de ejemplo; los pedidos
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
      <h2 className="mb-5 text-2xl font-semibold text-primario sm:text-3xl">{titulo}</h2>
      {children}
    </section>
  );
}
