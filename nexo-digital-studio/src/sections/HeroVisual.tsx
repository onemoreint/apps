import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import { useEffect } from "react";
import { Sparkles, ShoppingBag, Star, Bot, TrendingUp, Plus } from "lucide-react";
import { useFancyPointer } from "../hooks/useMediaQuery";

/** Capa con desplazamiento según el mouse (profundidad). */
function useLayer(mx: MotionValue<number>, my: MotionValue<number>, depth: number) {
  const x = useSpring(useTransform(mx, [-1, 1], [-depth, depth]), { stiffness: 70, damping: 18 });
  const y = useSpring(useTransform(my, [-1, 1], [-depth, depth]), { stiffness: 70, damping: 18 });
  return { x, y };
}

function Laptop() {
  return (
    <div className="relative">
      <div className="rounded-t-[14px] border border-white/15 bg-[#0b0d18] p-[7px] shadow-[0_40px_80px_-30px_rgba(120,87,255,0.6)]">
        <div className="overflow-hidden rounded-[8px] bg-[#0f1222]">
          {/* Barra del navegador */}
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" /><span className="h-2 w-2 rounded-full bg-[#febc2e]" /><span className="h-2 w-2 rounded-full bg-[#28c840]" />
            <span className="ml-3 h-3.5 flex-1 rounded-full bg-white/[0.05] px-2 text-[7px] leading-[14px] text-mist-700">tunegocio.com</span>
          </div>
          {/* Página web dentro del laptop */}
          <div className="relative h-[190px] overflow-hidden p-4 sm:h-[220px]">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet/40 blur-3xl" />
            <div className="absolute bottom-0 left-10 h-24 w-32 rounded-full bg-electric/25 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <span className="h-2.5 w-12 rounded bg-white/80" />
              <div className="flex gap-2">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-7 rounded bg-white/25" />)}</div>
            </div>
            <div className="relative mt-6 space-y-2">
              <span className="block h-4 w-[70%] rounded bg-gradient-to-r from-white to-violet-300" />
              <span className="block h-4 w-[52%] rounded bg-gradient-to-r from-violet-300 to-electric" />
              <span className="mt-3 block h-1.5 w-[62%] rounded bg-white/20" />
              <span className="block h-1.5 w-[48%] rounded bg-white/20" />
            </div>
            <div className="relative mt-4 flex gap-2">
              <span className="h-5 w-20 rounded-full bg-gradient-to-r from-violet to-electric" />
              <span className="h-5 w-16 rounded-full border border-white/20" />
            </div>
            <div className="relative mt-5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-md border border-white/[0.07] bg-white/[0.03] p-2">
                  <span className="block h-6 rounded bg-gradient-to-br from-violet/40 to-electric/30" />
                  <span className="mt-1.5 block h-1 w-3/4 rounded bg-white/25" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-3 w-[112%] -translate-x-[5.4%] rounded-b-[14px] bg-gradient-to-b from-[#2a2e45] to-[#14172a] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]" />
    </div>
  );
}

function Phone() {
  const items = [
    { e: "🍔", n: "Clásica", p: "$22.000" },
    { e: "🍕", n: "Margarita", p: "$26.000" },
    { e: "🥤", n: "Malteada", p: "$13.000" },
  ];
  return (
    <div className="w-[132px] rounded-[26px] border border-white/20 bg-[#0b0d18] p-[5px] shadow-[0_30px_60px_-20px_rgba(40,197,255,0.55)] sm:w-[150px]">
      <div className="relative overflow-hidden rounded-[21px] bg-[#101326] px-2.5 pb-3 pt-5">
        <span className="absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-black" />
        <p className="text-[8px] font-bold uppercase tracking-widest text-electric-300">Menú digital</p>
        <div className="mt-1.5 flex gap-1">
          {["Todo", "Burgers", "Bebidas"].map((c, i) => (
            <span key={c} className={`rounded-full px-1.5 py-0.5 text-[6.5px] font-bold ${i === 0 ? "bg-electric text-ink" : "bg-white/10 text-white/70"}`}>{c}</span>
          ))}
        </div>
        <div className="mt-2 space-y-1.5">
          {items.map((it) => (
            <div key={it.n} className="flex items-center gap-1.5 rounded-lg bg-white/[0.05] p-1.5">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-violet/50 to-electric/40 text-[11px]">{it.e}</span>
              <span className="flex-1">
                <span className="block text-[7.5px] font-bold text-white">{it.n}</span>
                <span className="block text-[6.5px] text-mist">{it.p}</span>
              </span>
              <span className="grid h-4 w-4 place-items-center rounded-full bg-violet text-white"><Plus className="h-2.5 w-2.5" /></span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-[#25D366] px-2 py-1.5 text-[7px] font-bold text-[#04210f]">
          <span>Pedir por WhatsApp</span><span>3</span>
        </div>
      </div>
    </div>
  );
}

function AIPanel() {
  return (
    <div className="glass-strong w-[168px] rounded-2xl p-3 shadow-[0_24px_60px_-20px_rgba(120,87,255,0.7)] sm:w-[220px]">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet to-electric"><Bot className="h-4 w-4" /></span>
        <div className="leading-tight">
          <p className="text-[11px] font-bold">NEXO AI</p>
          <p className="flex items-center gap-1 text-[9px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> en línea</p>
        </div>
      </div>
      <div className="mt-2.5 space-y-1.5 text-[9.5px] leading-snug">
        <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-violet/80 px-2.5 py-1.5">Quiero vender más por internet</p>
        <p className="w-fit max-w-[92%] rounded-xl rounded-bl-sm bg-white/[0.07] px-2.5 py-1.5 text-white/90">Te recomiendo un catálogo con pedidos por WhatsApp ✨</p>
        <div className="flex gap-1 px-1 pt-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-electric" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroVisual() {
  const fancy = useFancyPointer();
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  useEffect(() => {
    if (!fancy) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [fancy, mx, my]);

  const back = useLayer(mx, my, 8);
  const mid = useLayer(mx, my, 16);
  const front = useLayer(mx, my, 28);
  const float = (delay: number) => (reduced ? {} : { animate: { y: [0, -10, 0] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay } });

  return (
    <div className="relative mx-auto aspect-[1/1.12] w-full sm:aspect-[1/0.92] max-w-[580px] select-none" aria-hidden="true">
      {/* Iluminación ambiental */}
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(120,87,255,0.45),transparent_62%)] blur-2xl" />
      <div className="absolute bottom-[6%] right-[6%] h-1/2 w-1/2 rounded-full bg-[radial-gradient(circle,rgba(40,197,255,0.35),transparent_65%)] blur-2xl" />

      {/* Conexiones luminosas */}
      <motion.svg style={back} viewBox="0 0 580 530" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="hv-line" x1="0" x2="1">
            <stop offset="0" stopColor="#7857FF" stopOpacity="0.9" />
            <stop offset="1" stopColor="#28C5FF" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {["M120 140 C 220 60, 360 60, 470 130", "M430 300 C 500 360, 480 440, 400 470", "M150 380 C 120 450, 220 500, 300 470", "M300 110 C 300 180, 330 210, 360 240"].map((d, i) => (
          <g key={i}>
            <path d={d} stroke="url(#hv-line)" strokeOpacity=".18" strokeWidth="1.2" fill="none" />
            <path d={d} stroke="url(#hv-line)" strokeWidth="1.6" fill="none" strokeDasharray="6 14" className="animate-dash" style={{ animationDelay: `${i * -1.4}s` }} />
          </g>
        ))}
        {[[120, 140], [470, 130], [400, 470], [150, 380], [300, 110]].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="9" fill="#28C5FF" opacity=".12" />
            <circle cx={cx} cy={cy} r="3" fill={i % 2 ? "#28C5FF" : "#a893ff"} />
          </g>
        ))}
      </motion.svg>

      {/* Laptop */}
      <motion.div style={mid} className="absolute left-[2%] top-[22%] w-[78%] sm:top-[17%]">
        <motion.div {...float(0)}><Laptop /></motion.div>
      </motion.div>

      {/* Smartphone */}
      <motion.div style={front} className="absolute bottom-[2%] right-[2%]">
        <motion.div {...float(1.2)}><Phone /></motion.div>
      </motion.div>

      {/* Panel IA */}
      <motion.div style={front} className="absolute right-0 top-[2%] sm:right-[-2%]">
        <motion.div {...float(0.6)}><AIPanel /></motion.div>
      </motion.div>

      {/* Tarjetas flotantes */}
      <motion.div style={mid} className="absolute bottom-[14%] left-[0%]">
        <motion.div {...float(2)} className="glass flex items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-xl">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#25D366]/20 text-[#4be38a]"><ShoppingBag className="h-4 w-4" /></span>
          <span className="leading-tight">
            <span className="block text-[11px] font-bold">Nuevo pedido</span>
            <span className="block text-[10px] text-mist">vía WhatsApp</span>
          </span>
        </motion.div>
      </motion.div>
      <motion.div style={back} className="absolute left-[8%] top-[4%] hidden sm:block">
        <motion.div {...float(1.6)} className="glass flex items-center gap-2 rounded-xl px-3 py-2 shadow-xl">
          <Sparkles className="h-4 w-4 text-electric" />
          <span className="text-[11px] font-semibold">Diseño a tu medida</span>
        </motion.div>
      </motion.div>
      <motion.div style={front} className="absolute bottom-[38%] right-[30%] hidden sm:block">
        <motion.div {...float(0.9)} className="glass-strong flex items-center gap-2 rounded-xl px-3 py-2 shadow-xl">
          <TrendingUp className="h-4 w-4 text-electric" />
          <span className="text-[11px] font-semibold">Más visibilidad</span>
        </motion.div>
      </motion.div>
      <motion.div style={mid} className="absolute bottom-[30%] left-[30%] hidden sm:block">
        <motion.div {...float(2.4)} className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 shadow-xl">
          <span className="text-sm">🍔</span>
          <span className="text-[10.5px] font-semibold">Clásica</span>
          <Star className="h-3 w-3 fill-electric text-electric" />
        </motion.div>
      </motion.div>
    </div>
  );
}
