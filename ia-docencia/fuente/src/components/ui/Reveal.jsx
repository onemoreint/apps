import { m } from "framer-motion";

/* Entrada al hacer scroll. Parte de un estado visible, nunca de opacidad cero. */
export default function Reveal({ children, delay = 0, className = "", as = "div" }) {
  const Tag = m[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0.35, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </Tag>
  );
}
