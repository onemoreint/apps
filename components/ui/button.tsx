import type { ButtonHTMLAttributes } from "react";

type Variant = "primario" | "secundario" | "peligro" | "texto";

const styles: Record<Variant, string> = {
  primario:
    "bg-turquesa text-white hover:bg-turquesa-oscuro disabled:bg-turquesa/50",
  secundario:
    "bg-white text-tinta border border-linea hover:border-tinta-suave disabled:text-texto-suave",
  peligro:
    "bg-white text-error border border-error/40 hover:bg-error-fondo disabled:opacity-60",
  texto: "text-turquesa underline-offset-4 hover:underline px-0",
};

export function Button({
  variant = "primario",
  pending = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
