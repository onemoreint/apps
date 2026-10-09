export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(280px,38%)_1fr]">
      <aside className="flex items-center gap-4 bg-tinta px-6 py-5 text-white md:flex-col md:items-start md:justify-between md:px-10 md:py-12">
        <div>
          <p className="text-lg font-semibold tracking-tight">OptiConsulta</p>
          <p className="hidden max-w-xs text-sm text-white/70 md:block">
            Consultorio, fórmulas, ventas y laboratorio de tu óptica en un solo lugar.
          </p>
        </div>
        <div className="optotipos hidden md:grid" aria-hidden="true">
          <span>E</span>
          <span>F P</span>
          <span>T O Z</span>
          <span>L P E D</span>
          <span>P E C F D</span>
          <span>E D F C Z P</span>
        </div>
        <p className="hidden text-xs text-white/60 md:block">Versión piloto. Solo datos ficticios en la demostración.</p>
      </aside>
      <main className="flex items-start justify-center px-5 py-10 md:items-center md:py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
