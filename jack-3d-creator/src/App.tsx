import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowUpRight, MessageCircle, Sparkles, ShieldCheck, Users, Zap } from 'lucide-react';

const phoneNumber = '+573126387467';
const whatsappLink =
  'https://wa.me/573126387467?text=Hola%20Jos%C3%A9%2C%20quiero%20informaci%C3%B3n%20sobre%20One%20More';

function driveThumbnail(id: string) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
}

const products = [
  {
    name: 'Painless Night GLU',
    category: 'Bienestar diario',
    fileId: '1ENAr8_pY11lwhvat8yl1qlaUJD4vgWoA',
    description: 'Producto One More para presentar dentro de una rutina de bienestar y acompañamiento personalizado.',
  },
  {
    name: 'Slim Style',
    category: 'Estilo de vida',
    fileId: '14kWjPafWgUk1o2jB5_6Qb8kYG3tNtdzR',
    description: 'Enfoque visual premium para hábitos saludables, constancia y estilo de vida equilibrado.',
  },
  {
    name: 'Omevia',
    category: 'Bienestar integral',
    fileId: '1cCBy4F8m5QQmGKCH85HPvneqOXTckMXF',
    description: 'Presentación limpia para conversar sobre bienestar diario y uso responsable de la línea.',
  },
  {
    name: 'B12 Plus',
    category: 'Rutina activa',
    fileId: '1yn6PK7gF-sO4ECYECHVWZ1yvGpX_k9Pp',
    description: 'Producto pensado para una comunicación simple, moderna y orientada a rutinas activas.',
  },
  {
    name: 'Dekamin',
    category: 'Bienestar moderno',
    fileId: '19aME9WBv4W2NYv8Yqca2-Mxs5Q2Qw8Wb',
    description: 'Imagen ideal para educar sin exageraciones y llevar al prospecto a una conversación por WhatsApp.',
  },
  {
    name: 'Melatonin Plus',
    category: 'Rutina nocturna',
    fileId: '1oA7t66vAuV6PKKEImEnq7zprVW1sNPzj',
    description: 'Comunicación enfocada en hábitos, descanso responsable y acompañamiento informativo.',
  },
  {
    name: 'Gentleman Night',
    category: 'Cuidado personal',
    fileId: '1RH_zqH24UlM3etN0lO_oDSDtBN11o2gi',
    description: 'Producto de cuidado personal presentado con tono elegante, sobrio y profesional.',
  },
  {
    name: 'Ladies Night',
    category: 'Cuidado personal',
    fileId: '1JMYn98LdeY4FS2PvxHmWWANnLefHNRqV',
    description: 'Línea de cuidado personal con estética premium y mensaje responsable.',
  },
  {
    name: 'GlutaNAD+',
    category: 'Innovación One More',
    fileId: '1a55uAUZJ7DJmFSeqSrOjEhYzcSwttr4G',
    description: 'Producto destacado para reforzar el concepto de innovación, tecnología y bienestar.',
  },
  {
    name: 'Sornie Collagen',
    category: 'Cuidado premium',
    fileId: '11b5HB9QeBQueX6NLgU0Yn5_6MrIGgLNf',
    description: 'Producto visual de cuidado premium para integrar a una experiencia elegante de marca.',
  },
].map((product) => ({ ...product, image: driveThumbnail(product.fileId) }));

const marqueeItems = products.map((product) => product.name);

const services = [
  {
    number: '01',
    title: 'Bienestar transdérmico',
    description:
      'Presentación clara de productos One More orientados al bienestar diario, con lenguaje responsable y sin promesas médicas.',
  },
  {
    number: '02',
    title: 'Orientación por WhatsApp',
    description:
      'La landing lleva al visitante a una conversación directa con José Lugo para recibir información y acompañamiento personalizado.',
  },
  {
    number: '03',
    title: 'Oportunidad de negocio',
    description:
      'Mensaje simple para personas que quieren conocer cómo iniciar, vender, crear comunidad y avanzar con un sistema duplicable.',
  },
  {
    number: '04',
    title: 'Sistema con IA',
    description:
      'Uso de mensajes, guiones, seguimiento y contenido digital para organizar la prospección de forma más profesional.',
  },
  {
    number: '05',
    title: 'Marca y liderazgo',
    description:
      'Posicionamiento premium para presentar One More con confianza, claridad y una estética moderna enfocada en conversión.',
  },
];

const projects = [
  {
    number: '01',
    name: 'Bienestar diario',
    category: 'Productos',
    icon: <Sparkles className="h-8 w-8" />,
    headline: 'Productos One More para una rutina moderna',
    description:
      'Una sección visual para mostrar Painless Night GLU, Slim Style y Omevia sin listas de precios, sin testimonios y sin promesas exageradas.',
    chips: ['Painless Night GLU', 'Slim Style', 'Omevia'],
    images: [products[0], products[1], products[2]],
  },
  {
    number: '02',
    name: 'Rutina activa',
    category: 'Sistema',
    icon: <Zap className="h-8 w-8" />,
    headline: 'Energía, descanso y hábitos con comunicación responsable',
    description:
      'Bloque pensado para educar y abrir conversación sobre B12 Plus, Dekamin y Melatonin Plus como parte de una experiencia de bienestar.',
    chips: ['B12 Plus', 'Dekamin', 'Melatonin Plus'],
    images: [products[3], products[4], products[5]],
  },
  {
    number: '03',
    name: 'Cuidado personal',
    category: 'Premium',
    icon: <ShieldCheck className="h-8 w-8" />,
    headline: 'Cuidado personal con una imagen elegante y sofisticada',
    description:
      'Presentación sobria para Gentleman Night, Ladies Night y GlutaNAD+, manteniendo un enfoque de marca premium y conversación directa.',
    chips: ['Gentleman Night', 'Ladies Night', 'GlutaNAD+'],
    images: [products[6], products[7], products[8]],
  },
  {
    number: '04',
    name: 'Cuidado premium',
    category: 'Imagen',
    icon: <Users className="h-8 w-8" />,
    headline: 'Una experiencia visual limpia para atraer interesados',
    description:
      'Bloque final con Sornie Collagen y llamada directa a WhatsApp para ampliar información de productos y oportunidad de negocio.',
    chips: ['Sornie Collagen', 'WhatsApp', 'José Lugo'],
    images: [products[9], products[8], products[1]],
  },
];

type FadeInTag = 'div' | 'section' | 'nav' | 'header' | 'article';

type FadeInProps = {
  as?: FadeInTag;
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
};

function FadeIn({
  as = 'div',
  children,
  className,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
}: FadeInProps) {
  const MotionComponent =
    ((motion as unknown as Record<FadeInTag, typeof motion.div>)[as] || motion.div);

  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{ delay, duration, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </MotionComponent>
  );
}

type MagnetProps = {
  children: ReactNode;
  padding?: number;
  strength?: number;
  activeTransition?: string;
  inactiveTransition?: string;
  className?: string;
};

function Magnet({
  children,
  padding = 150,
  strength = 3,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.6s ease-in-out',
  className,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState('translate3d(0, 0, 0)');
  const [transition, setTransition] = useState(inactiveTransition);

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const isInsideMagneticArea =
      event.clientX >= rect.left - padding &&
      event.clientX <= rect.right + padding &&
      event.clientY >= rect.top - padding &&
      event.clientY <= rect.bottom + padding;

    if (!isInsideMagneticArea) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const translateX = (event.clientX - centerX) / strength;
    const translateY = (event.clientY - centerY) / strength;

    setTransition(activeTransition);
    setTransform(`translate3d(${translateX}px, ${translateY}px, 0)`);
  }

  function handleMouseLeave() {
    setTransition(inactiveTransition);
    setTransform('translate3d(0, 0, 0)');
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transition, willChange: 'transform' }}
    >
      {children}
    </div>
  );
}

function ContactButton({ className = '', label = 'Escríbeme' }: { className?: string; label?: string }) {
  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(123deg,#18011F_7%,#B600A8_37%,#7621B0_72%,#BE4C00_100%)] px-8 py-3 text-xs font-medium uppercase tracking-widest text-white outline outline-2 -outline-offset-[3px] outline-white shadow-[0px_4px_4px_rgba(181,1,167,0.25),4px_4px_12px_#7721B1_inset] transition duration-200 hover:scale-[1.03] sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base ${className}`}
    >
      {label}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}

function LiveProjectButton() {
  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#D7E2EA] px-8 py-3 text-sm font-medium uppercase tracking-widest text-[#D7E2EA] transition duration-200 hover:bg-[#D7E2EA]/10 sm:px-10 sm:py-3.5 sm:text-base"
    >
      WhatsApp
      <MessageCircle className="h-4 w-4" />
    </a>
  );
}

type AnimatedCharacterProps = {
  character: string;
  progress: MotionValue<number>;
  index: number;
  total: number;
};

function AnimatedCharacter({ character, progress, index, total }: AnimatedCharacterProps) {
  const start = index / total;
  const end = Math.min(1, start + 0.08);
  const opacity = useTransform(progress, [start, end], [0.2, 1]);

  return (
    <span className="relative inline-block">
      <span className="opacity-0">{character}</span>
      <motion.span className="absolute inset-0" style={{ opacity }}>
        {character}
      </motion.span>
    </span>
  );
}

function AnimatedText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  });
  const characters = Array.from(text);

  return (
    <p
      ref={ref}
      className="max-w-[760px] text-center text-[clamp(1rem,2vw,1.35rem)] font-medium leading-relaxed text-[#D7E2EA]"
    >
      {characters.map((character, index) => (
        <AnimatedCharacter
          key={`${character}-${index}`}
          character={character === ' ' ? '\u00A0' : character}
          progress={scrollYProgress}
          index={index}
          total={characters.length}
        />
      ))}
    </p>
  );
}

function ProductOrb() {
  return (
    <div className="relative mx-auto aspect-square w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px]">
      <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.65),rgba(182,0,168,0.35)_28%,rgba(118,33,176,0.2)_52%,rgba(12,12,12,0)_72%)] blur-2xl" />
      <div className="absolute inset-[18%] rounded-[34%] border border-white/20 bg-[#D7E2EA]/10 shadow-[0_30px_120px_rgba(182,0,168,0.35)] backdrop-blur-md" />
      <div className="absolute left-[8%] top-[22%] h-[52%] w-[38%] rotate-[-8deg] overflow-hidden rounded-[2rem] border-2 border-white/40 bg-white shadow-2xl">
        <img src={products[0].image} alt="Painless Night GLU One More" className="h-full w-full object-cover" />
      </div>
      <div className="absolute left-[34%] top-[8%] z-10 h-[62%] w-[42%] rotate-[4deg] overflow-hidden rounded-[2rem] border-2 border-white/50 bg-white shadow-2xl">
        <img src={products[8].image} alt="GlutaNAD+ One More" className="h-full w-full object-cover" />
      </div>
      <div className="absolute bottom-[8%] right-[4%] h-[46%] w-[36%] rotate-[10deg] overflow-hidden rounded-[2rem] border-2 border-white/40 bg-white shadow-2xl">
        <img src={products[1].image} alt="Slim Style One More" className="h-full w-full object-cover" />
      </div>
      <div className="absolute bottom-[10%] left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#0C0C0C] px-5 py-2 text-xs font-medium uppercase tracking-widest text-white shadow-xl">
        José Lugo
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative flex h-screen flex-col overflow-x-clip bg-[#0C0C0C]">
      <FadeIn as="nav" delay={0} y={-20} className="relative z-30 flex justify-between px-6 pt-6 text-sm font-medium uppercase tracking-wider text-[#D7E2EA] md:px-10 md:pt-8 md:text-lg lg:text-[1.4rem]">
        {['Inicio', 'Sistema', 'Productos', 'Contacto'].map((link) => (
          <a key={link} href={link === 'Contacto' ? whatsappLink : `#${link.toLowerCase()}`} className="transition duration-200 hover:opacity-70">
            {link}
          </a>
        ))}
      </FadeIn>

      <FadeIn delay={0.15} y={40} className="relative z-20 mt-6 w-full overflow-hidden sm:mt-4 md:-mt-5">
        <h1 className="hero-heading w-full whitespace-nowrap text-[14vw] font-black uppercase leading-none tracking-tight sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw]">
          One More
        </h1>
      </FadeIn>

      <FadeIn delay={0.6} y={30} className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:bottom-0 sm:translate-y-0">
        <Magnet padding={150} strength={3}>
          <ProductOrb />
        </Magnet>
      </FadeIn>

      <div className="relative z-30 mt-auto flex items-end justify-between px-6 pb-7 sm:pb-8 md:px-10 md:pb-10">
        <FadeIn delay={0.35} y={20}>
          <p className="max-w-[185px] text-[clamp(0.75rem,1.4vw,1.5rem)] font-light uppercase leading-snug tracking-wide text-[#D7E2EA] sm:max-w-[250px] md:max-w-[310px]">
            Productos One More, bienestar inteligente y acompañamiento directo con José Lugo
          </p>
        </FadeIn>
        <FadeIn delay={0.5} y={20}>
          <ContactButton label="Contactar" />
        </FadeIn>
      </div>
    </section>
  );
}

function MarqueeSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [offset, setOffset] = useState(0);
  const rowOne = marqueeItems.slice(0, 5);
  const rowTwo = marqueeItems.slice(5);

  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const sectionTop = section.offsetTop;
      setOffset((window.scrollY - sectionTop + window.innerHeight) * 0.3);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const renderRow = (items: string[], direction: 'right' | 'left') => (
    <div
      className="flex gap-3"
      style={{
        transform:
          direction === 'right'
            ? `translateX(${offset - 200}px)`
            : `translateX(${-1 * (offset - 200)}px)`,
        willChange: 'transform',
      }}
    >
      {[...items, ...items, ...items].map((item, index) => {
        const product = products.find((entry) => entry.name === item) || products[0];
        return (
          <div
            key={`${item}-${index}`}
            className="relative h-[270px] w-[420px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111]"
          >
            <img src={product.image} alt={`${product.name} One More`} className="h-full w-full object-cover opacity-80" loading="lazy" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,12,0.08),rgba(12,12,12,0.82))]" />
            <div className="absolute bottom-0 left-0 right-0 p-7">
              <span className="text-xs font-medium uppercase tracking-[0.35em] text-white/60">One More</span>
              <h3 className="mt-3 text-[clamp(1.3rem,2vw,2rem)] font-black uppercase leading-none tracking-tight text-[#D7E2EA]">
                {product.name}
              </h3>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section ref={sectionRef} className="overflow-hidden bg-[#0C0C0C] pb-10 pt-24 sm:pt-32 md:pt-40">
      <div className="flex flex-col gap-3">
        {renderRow(rowOne, 'right')}
        {renderRow(rowTwo, 'left')}
      </div>
    </section>
  );
}

function AboutSection() {
  const aboutText =
    'Soy José Lugo, distribuidor de One More. Esta landing presenta únicamente productos One More seleccionados desde tu carpeta de Drive, sin listas de precios y sin testimonios. El objetivo es despertar curiosidad, educar con responsabilidad y llevar al interesado a WhatsApp para recibir orientación.';

  return (
    <section id="inicio" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0C0C0C] px-5 py-20 sm:px-8 md:px-10">
      <FadeIn delay={0.1} x={-80} y={0} duration={0.9} className="absolute left-[1%] top-[4%] sm:left-[2%] md:left-[4%]">
        <div className="grid h-[120px] w-[120px] place-items-center rounded-full border border-white/10 bg-white/5 text-[#D7E2EA] sm:h-[160px] sm:w-[160px] md:h-[210px] md:w-[210px]">
          <ShieldCheck className="h-1/3 w-1/3" />
        </div>
      </FadeIn>
      <FadeIn delay={0.15} x={80} y={0} duration={0.9} className="absolute right-[1%] top-[4%] sm:right-[2%] md:right-[4%]">
        <div className="grid h-[120px] w-[120px] place-items-center rounded-[2rem] border border-white/10 bg-white/5 text-[#D7E2EA] sm:h-[160px] sm:w-[160px] md:h-[210px] md:w-[210px]">
          <Sparkles className="h-1/3 w-1/3" />
        </div>
      </FadeIn>
      <FadeIn delay={0.25} x={-80} y={0} duration={0.9} className="absolute bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%]">
        <div className="h-[100px] w-[100px] rounded-[2rem] bg-[linear-gradient(135deg,#D7E2EA,#B600A8,#0C0C0C)] opacity-70 blur-[1px] sm:h-[140px] sm:w-[140px] md:h-[180px] md:w-[180px]" />
      </FadeIn>
      <FadeIn delay={0.3} x={80} y={0} duration={0.9} className="absolute bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%]">
        <div className="h-[130px] w-[130px] rounded-full bg-[radial-gradient(circle,#BE4C00,#7621B0,transparent_68%)] opacity-80 sm:h-[170px] sm:w-[170px] md:h-[220px]" />
      </FadeIn>

      <div className="relative z-10 flex flex-col items-center gap-10 sm:gap-14 md:gap-16">
        <FadeIn delay={0} y={40}>
          <h2 className="hero-heading text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none tracking-tight">
            One More
          </h2>
        </FadeIn>
        <AnimatedText text={aboutText} />
        <div className="flex flex-col items-center gap-4 sm:gap-5">
          <ContactButton label="Hablar con José" />
          <p className="text-center text-sm font-light uppercase tracking-widest text-[#D7E2EA]/70">
            WhatsApp {phoneNumber}
          </p>
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="sistema" className="rounded-t-[40px] bg-white px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32">
      <FadeIn y={40}>
        <h2 className="mb-16 text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none tracking-tight text-[#0C0C0C] sm:mb-20 md:mb-28">
          Sistema
        </h2>
      </FadeIn>
      <div className="mx-auto max-w-5xl">
        {services.map((service, index) => (
          <FadeIn key={service.number} delay={index * 0.1} y={30}>
            <div className="grid gap-6 border-t border-[rgba(12,12,12,0.15)] py-8 last:border-b sm:grid-cols-[0.35fr_0.65fr] sm:gap-10 sm:py-10 md:py-12">
              <span className="text-[clamp(3rem,10vw,140px)] font-black leading-none tracking-tight text-[#0C0C0C]">
                {service.number}
              </span>
              <div className="flex flex-col justify-center gap-4">
                <h3 className="text-[clamp(1rem,2.2vw,2.1rem)] font-medium uppercase text-[#0C0C0C]">
                  {service.title}
                </h3>
                <p className="max-w-2xl text-[clamp(0.85rem,1.6vw,1.25rem)] font-light leading-relaxed text-[#0C0C0C]/60">
                  {service.description}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function ProductImageTile({ product, className = '' }: { product: (typeof products)[number]; className?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-[40px] border border-white/10 bg-white sm:rounded-[50px] md:rounded-[60px] ${className}`}>
      <img
        src={product.image}
        alt={`${product.name} One More`}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,12,0),rgba(12,12,12,0.72))] opacity-80" />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-[#D7E2EA]">
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em] opacity-70">{product.category}</span>
        <h4 className="mt-2 text-lg font-black uppercase leading-none tracking-tight sm:text-xl">{product.name}</h4>
      </div>
    </div>
  );
}

function ProjectCard({ project, index, total }: { project: (typeof projects)[number]; index: number; total: number }) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'start start'],
  });
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(scrollYProgress, [0, 1], [1, targetScale]);

  return (
    <div className="h-[85vh]">
      <motion.article
        ref={cardRef}
        className="sticky top-24 overflow-hidden rounded-[40px] border-2 border-[#D7E2EA] bg-[#0C0C0C] p-4 sm:rounded-[50px] sm:p-6 md:top-32 md:rounded-[60px] md:p-8"
        style={{ top: `calc(6rem + ${index * 28}px)`, scale }}
      >
        <div className="mb-6 grid items-center gap-5 text-[#D7E2EA] md:grid-cols-[0.18fr_0.18fr_1fr_auto] md:gap-6">
          <span className="text-[clamp(3rem,10vw,120px)] font-black leading-none tracking-tight">
            {project.number}
          </span>
          <span className="text-sm font-medium uppercase tracking-widest opacity-70 md:text-base">
            {project.category}
          </span>
          <h3 className="text-[clamp(1.5rem,4vw,4.5rem)] font-black uppercase leading-none tracking-tight">
            {project.name}
          </h3>
          <LiveProjectButton />
        </div>

        <div className="grid gap-4 md:grid-cols-[0.4fr_0.6fr]">
          <div className="flex flex-col gap-4">
            <ProductImageTile product={project.images[0]} className="h-[clamp(130px,16vw,230px)]" />
            <ProductImageTile product={project.images[1]} className="h-[clamp(160px,22vw,340px)]" />
          </div>
          <div className="grid min-h-[360px] gap-4 lg:grid-cols-[0.52fr_0.48fr]">
            <ProductImageTile product={project.images[2]} className="min-h-[320px]" />
            <div className="flex min-h-[320px] flex-col justify-between rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(215,226,234,0.16),rgba(182,0,168,0.16),rgba(12,12,12,1))] p-8 sm:rounded-[50px] md:rounded-[60px] md:p-10">
              <div>
                <p className="text-[clamp(1.1rem,2.3vw,2.2rem)] font-black uppercase leading-none text-[#D7E2EA]">
                  {project.headline}
                </p>
                <p className="mt-6 max-w-xl text-[clamp(0.95rem,1.6vw,1.2rem)] font-light leading-relaxed text-[#D7E2EA]/75">
                  {project.description}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {project.chips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/20 px-4 py-2 text-[0.65rem] font-medium uppercase tracking-widest text-[#D7E2EA]">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

function ProjectsSection() {
  return (
    <section id="productos" className="relative z-10 -mt-10 rounded-t-[40px] bg-[#0C0C0C] px-5 py-20 sm:-mt-12 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:-mt-14 md:rounded-t-[60px] md:px-10 md:py-32">
      <FadeIn y={40}>
        <h2 className="hero-heading mb-16 text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none tracking-tight sm:mb-20 md:mb-28">
          Productos
        </h2>
      </FadeIn>
      <div className="mx-auto max-w-7xl">
        {projects.map((project, index) => (
          <ProjectCard key={project.number} project={project} index={index} total={projects.length} />
        ))}
      </div>
      <div id="contacto" className="mx-auto mt-16 flex max-w-3xl flex-col items-center gap-6 text-center">
        <h3 className="text-[clamp(2rem,6vw,5rem)] font-black uppercase leading-none text-[#D7E2EA]">
          ¿Quieres más información?
        </h3>
        <p className="text-lg font-light leading-relaxed text-[#D7E2EA]/70">
          Escríbeme y te explico productos One More, forma de inicio y acompañamiento por WhatsApp. Sin listas de precios en la landing y sin testimonios.
        </p>
        <ContactButton label="Contactar ahora" />
        <p className="text-xs font-light uppercase tracking-widest text-[#D7E2EA]/50">
          Información de bienestar y negocio. No sustituye asesoría médica profesional. Resultados variables según hábitos, proceso y constancia.
        </p>
      </div>
    </section>
  );
}

function App() {
  return (
    <main className="overflow-x-clip bg-[#0C0C0C]">
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
    </main>
  );
}

export default App;
