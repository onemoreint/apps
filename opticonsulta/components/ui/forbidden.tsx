export function Forbidden({ what }: { what: string }) {
  return (
    <div className="max-w-prose rounded-[var(--radius-panel)] border border-linea bg-white p-6">
      <h1 className="text-xl font-semibold">No tienes acceso a {what}</h1>
      <p className="mt-2 text-texto-suave">
        Tu rol no incluye este permiso. Si lo necesitas para tu trabajo, pídelo al propietario de la óptica.
      </p>
    </div>
  );
}
