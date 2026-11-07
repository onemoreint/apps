import { lazy, Suspense, useEffect } from "react";
import { MotionConfig } from "motion/react";
import { useHashRoute } from "./hooks/useHashRoute";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { FloatingWhatsApp } from "./components/FloatingWhatsApp";
import { ScrollProgress } from "./components/ScrollProgress";
import { CursorGlow } from "./components/CursorGlow";
import HomePage from "./pages/HomePage";

// Las páginas secundarias se cargan bajo demanda para que la portada sea ligera.
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const demos: Record<string, ReturnType<typeof lazy>> = {
  menu: lazy(() => import("./pages/demos/MenuDemo")),
  landing: lazy(() => import("./pages/demos/LandingDemo")),
  corporativa: lazy(() => import("./pages/demos/CorporateDemo")),
};

function Loader() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-electric" />
    </div>
  );
}

export default function App() {
  const route = useHashRoute();

  // Al volver al inicio con un ancla (#showroom), desplazarse a esa sección.
  useEffect(() => {
    if (route.name !== "home") return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [route.name]);

  const Demo = route.name === "demo" ? demos[route.id] : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Saltar al contenido
      </a>
      {route.name === "home" || (route.name === "demo" && !Demo) ? (
        <>
          <ScrollProgress />
          <CursorGlow />
          <Navbar />
          <HomePage />
          <Footer />
          <FloatingWhatsApp />
        </>
      ) : (
        <Suspense fallback={<Loader />}>
          {route.name === "privacy" && <PrivacyPage />}
          {Demo && <Demo />}
          {/* CTA flotante en todas las páginas; el demo de menú usa su propia barra de carrito. */}
          {!(route.name === "demo" && route.id === "menu") && <FloatingWhatsApp />}
        </Suspense>
      )}
    </MotionConfig>
  );
}
