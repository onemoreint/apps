import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  fallback: string;
  className?: string;
  width?: number;
  height?: number;
}

/** Imagen con carga diferida y respaldo ilustrado si la foto no está disponible. */
export function SafeImage({ src, alt, fallback, className = "", width = 480, height = 360 }: Props) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(120,87,255,0.35),transparent_60%),radial-gradient(circle_at_80%_90%,rgba(40,197,255,0.25),transparent_55%),#141729] ${className}`}>
      {state !== "ok" && (
        <span aria-hidden className={`absolute inset-0 grid place-items-center text-5xl ${state === "loading" ? "animate-pulse" : ""}`}>
          {fallback}
        </span>
      )}
      {state !== "error" && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className={`h-full w-full object-cover transition-opacity duration-500 ${state === "ok" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
