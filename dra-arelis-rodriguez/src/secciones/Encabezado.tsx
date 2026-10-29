import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ESPECIALIDAD, NOMBRE } from '../contenido';

const MENU = [
  { href: '#inicio', texto: 'Inicio' },
  { href: '#servicios', texto: 'Servicios' },
  { href: '#sobre-mi', texto: 'Sobre mí' },
  { href: '#cita', texto: 'Contacto' },
];

export function Encabezado() {
  const [abierto, setAbierto] = useState(false);
  const [desplazado, setDesplazado] = useState(false);

  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > 12);
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    const alCambiarTamano = () => window.innerWidth >= 768 && setAbierto(false);
    window.addEventListener('keydown', alTeclear);
    window.addEventListener('resize', alCambiarTamano);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      window.removeEventListener('resize', alCambiarTamano);
    };
  }, [abierto]);

  const fondo = desplazado || abierto;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        fondo ? 'border-b border-linea/80 bg-crema/90 shadow-[0_6px_24px_-18px_rgb(38_43_45/0.35)] backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="contenedor flex h-[4.5rem] items-center justify-between gap-6">
        <a href="#inicio" className="group flex flex-col leading-none" onClick={() => setAbierto(false)}>
          <span className="font-serif text-[1.2rem] font-medium tracking-tight text-petroleo-oscuro min-[400px]:text-[1.3rem] lg:text-[1.45rem]">{NOMBRE}</span>
          <span className="mt-1 text-[0.68rem] font-semibold tracking-[0.22em] text-salvia-oscuro uppercase">
            {ESPECIALIDAD}
          </span>
        </a>

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-7">
            {MENU.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="relative py-2 text-[0.95rem] font-medium text-tinta/80 transition hover:text-petroleo-oscuro after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-salvia after:transition-transform after:duration-300 hover:after:scale-x-100"
                >
                  {item.texto}
                </a>
              </li>
            ))}
          </ul>
          <a href="#cita" className="btn-secundario min-h-11 px-5 py-2 text-[0.92rem]">
            Solicitar una cita
          </a>
        </nav>

        <button
          type="button"
          className="-mr-2 grid size-12 place-items-center rounded-full text-petroleo-oscuro transition hover:bg-arena md:hidden"
          aria-expanded={abierto}
          aria-controls="menu-movil"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        </button>
      </div>

      <nav
        id="menu-movil"
        aria-label="Principal (móvil)"
        hidden={!abierto}
        className="border-t border-linea bg-crema md:hidden"
      >
        <ul className="contenedor flex flex-col py-3">
          {MENU.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={() => setAbierto(false)}
                className="block border-b border-linea/70 py-4 font-serif text-[1.35rem] text-petroleo-oscuro"
              >
                {item.texto}
              </a>
            </li>
          ))}
          <li className="pt-5 pb-3">
            <a href="#cita" onClick={() => setAbierto(false)} className="btn-principal w-full">
              Solicitar una cita
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
