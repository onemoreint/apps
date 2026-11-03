import { Logo } from "./Navbar";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-ink pb-24 pt-10 md:pb-10">
      <div className="wrap flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-mute">Formación para docentes. Venezuela.</p>
        </div>
        <p className="text-sm leading-relaxed text-mute md:text-right">
          Curso de Inteligencia Artificial Aplicada a la Docencia.
          <br />
          Duración: 4 horas.
        </p>
      </div>
    </footer>
  );
}
