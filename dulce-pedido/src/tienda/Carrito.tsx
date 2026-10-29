import { ArrowLeft, ArrowRight, ShoppingBag, Trash2, TriangleAlert } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { cop } from '@/core/dinero';
import { calcularLineas, detalleLinea, subtotalCarrito } from '@/core/carrito';
import { enlace } from '@/app/ruta';
import { Cantidad, FotoProducto, nombreCategoria } from './partes';
import { useTienda } from './estado';

export function Carrito({ catalogo }: { catalogo: Catalogo }) {
  const lineas = useTienda((s) => s.lineas);
  const cambiar = useTienda((s) => s.cambiarCantidad);
  const quitar = useTienda((s) => s.quitar);
  const vaciar = useTienda((s) => s.vaciar);
  const calc = calcularLineas(lineas, catalogo.productos);
  const validas = calc.filter((l) => !l.problema);
  const subtotal = subtotalCarrito(validas);
  const conProblema = calc.some((l) => l.problema);

  if (calc.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rosa text-primario">
          <ShoppingBag size={28} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-primario">Tu pedido está vacío</h1>
        <p className="mt-1 text-tinta-2">Explora el catálogo y agrega lo que se te antoje.</p>
        <a href={enlace('/catalogo')} className="mt-6 inline-flex rounded-full bg-primario px-6 py-3.5 font-semibold text-en-primario">
          Ver catálogo
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold text-primario">Tu pedido</h1>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('¿Vaciar el carrito?')) vaciar();
          }}
          className="text-sm font-medium text-tinta-3 underline-offset-2 hover:text-peligro hover:underline"
        >
          Vaciar carrito
        </button>
      </div>

      <ul className="mt-5 space-y-3">
        {calc.map((l) => (
          <li key={l.linea.clave} className="flex gap-3 rounded-2xl bg-papel p-3 ring-1 ring-linea/70 sm:gap-4 sm:p-4">
            <a href={enlace(`/p/${l.producto.id}`)} className="shrink-0">
              <FotoProducto
                producto={l.producto}
                categoria={nombreCategoria(catalogo, l.producto.categoria_id)}
                className="h-20 w-20 rounded-xl sm:h-24 sm:w-24 [&_span]:hidden"
              />
            </a>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold leading-tight text-tinta">{l.producto.nombre}</p>
                  {detalleLinea(l.variante, l.linea.sabores) && (
                    <p className="text-[13px] text-tinta-3">{detalleLinea(l.variante, l.linea.sabores)}</p>
                  )}
                  <p className="precio text-[13px] text-tinta-3">{cop(l.precio)} c/u</p>
                </div>
                <button
                  type="button"
                  aria-label={`Quitar ${l.producto.nombre}`}
                  onClick={() => quitar(l.linea.clave)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-tinta-3 hover:bg-crema-2 hover:text-peligro"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {l.problema && (
                <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-peligro">
                  <TriangleAlert size={14} /> {l.problema}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <Cantidad
                  valor={l.linea.cantidad}
                  min={Math.max(1, l.producto.cantidad_minima)}
                  onChange={(n) => cambiar(l.linea.clave, n)}
                  etiqueta={`Cantidad de ${l.producto.nombre}`}
                />
                <span className="precio text-lg font-bold text-primario">{cop(l.subtotal)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl bg-papel p-5 ring-1 ring-linea/70">
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold">Subtotal</span>
          <span className="precio text-2xl font-bold text-primario">{cop(subtotal)}</span>
        </div>
        <p className="mt-1 text-sm text-tinta-3">El domicilio, si aplica, se calcula en el siguiente paso.</p>
        {conProblema && (
          <p className="mt-3 rounded-xl bg-rosa/50 px-3 py-2 text-sm font-medium text-peligro">
            Quita o ajusta los productos marcados para continuar.
          </p>
        )}
        <a
          href={conProblema ? undefined : enlace('/pedido')}
          aria-disabled={conProblema}
          className={`mt-4 flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold ${
            conProblema ? 'pointer-events-none bg-crema-2 text-tinta-3' : 'bg-primario text-en-primario hover:brightness-110'
          }`}
        >
          Continuar con mis datos <ArrowRight size={18} />
        </a>
        <a href={enlace('/catalogo')} className="mt-3 flex items-center justify-center gap-1.5 py-2 font-semibold text-primario">
          <ArrowLeft size={16} /> Seguir comprando
        </a>
      </div>
    </div>
  );
}
