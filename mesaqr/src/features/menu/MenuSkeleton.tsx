/** Esqueleto con la misma forma del menú: nunca una pantalla en blanco. */
export function MenuSkeleton() {
  const bar = 'animate-pulse rounded-lg bg-shelf';
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Cargando menú">
      <div className="flex items-start justify-between gap-4 px-4 pt-6">
        <div className="flex-1 space-y-2">
          <div className={`${bar} h-8 w-3/4`} />
          <div className={`${bar} h-4 w-1/2`} />
        </div>
        <div className={`${bar} h-12 w-28`} />
      </div>
      <div className="flex gap-2 overflow-hidden px-4 py-5">
        {[96, 128, 112, 88].map((w) => (
          <div key={w} className={`${bar} h-10 shrink-0 rounded-full`} style={{ width: w }} />
        ))}
      </div>
      <div className="divide-y divide-line px-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 py-4">
            <div className="flex-1 space-y-2 py-1">
              <div className={`${bar} h-5 w-2/3`} />
              <div className={`${bar} h-4 w-full`} />
              <div className={`${bar} h-5 w-16`} />
            </div>
            <div className={`${bar} size-28 rounded-2xl`} />
          </div>
        ))}
      </div>
    </div>
  );
}
