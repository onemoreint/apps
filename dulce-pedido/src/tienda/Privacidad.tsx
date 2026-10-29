import type { Catalogo } from '@/core/tipos';
import { enlaceWhatsApp } from '@/core/whatsapp';

export function Privacidad({ catalogo }: { catalogo: Catalogo }) {
  const t = catalogo.tienda;
  const texto =
    t.contenido?.privacidad?.trim() ||
    'Usamos tus datos únicamente para gestionar y entregar tu pedido, conforme a la Ley 1581 de 2012.';
  return (
    <article className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="text-3xl font-semibold text-primario">Política de privacidad</h1>
      <p className="mt-1 text-sm text-tinta-3">Tratamiento de datos personales — {t.nombre}</p>
      <div className="mt-6 space-y-4 rounded-2xl bg-papel p-6 text-[15px] leading-relaxed text-tinta-2 ring-1 ring-linea/70">
        {texto.split(/\n{2,}/).map((parrafo, i) => (
          <p key={i} className="whitespace-pre-line">
            {parrafo}
          </p>
        ))}
        <p>
          <strong className="text-tinta">Responsable del tratamiento:</strong> {t.nombre}
          {t.contenido?.ciudad ? `, ${t.contenido.ciudad}` : ''}.
        </p>
        <p>
          <strong className="text-tinta">Datos que pedimos:</strong> nombre, número de contacto y, si eliges domicilio, dirección y
          barrio. No pedimos datos de pago en esta página.
        </p>
        <p>
          <strong className="text-tinta">Tus derechos:</strong> puedes conocer, actualizar, rectificar o pedir la eliminación de tus
          datos, y revocar la autorización
          {t.whatsapp ? (
            <>
              {' '}
              escribiéndonos por{' '}
              <a href={enlaceWhatsApp(t.whatsapp)} target="_blank" rel="noopener noreferrer" className="font-semibold text-acento underline">
                WhatsApp
              </a>
            </>
          ) : null}
          {t.contenido?.correo ? ` o al correo ${t.contenido.correo}` : ''}.
        </p>
      </div>
    </article>
  );
}
