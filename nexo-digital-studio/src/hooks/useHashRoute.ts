import { useEffect, useState } from "react";

/**
 * Enrutador mínimo por hash, compatible con GitHub Pages sin configuración extra.
 *  · "#/demo/menu", "#/privacidad" → rutas
 *  · "#servicios" (sin barra) → anclas dentro de la página de inicio
 */
export type Route =
  | { name: "home" }
  | { name: "demo"; id: string }
  | { name: "privacy" };

function parse(hash: string): Route {
  if (!hash.startsWith("#/")) return { name: "home" };
  const parts = hash.slice(2).split(/[/?]/).filter(Boolean);
  if (parts[0] === "demo" && parts[1]) return { name: "demo", id: parts[1] };
  if (parts[0] === "privacidad") return { name: "privacy" };
  return { name: "home" };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      const next = parse(window.location.hash);
      setRoute((prev) => {
        const changedPage = prev.name !== next.name || (prev.name === "demo" && next.name === "demo" && prev.id !== next.id);
        if (changedPage && next.name !== "home") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        return changedPage ? next : prev;
      });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const routeHref = {
  home: (anchor = "") => (anchor ? `#${anchor}` : "#"),
  demo: (id: string) => `#/demo/${id}`,
  privacy: () => "#/privacidad",
};
