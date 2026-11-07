import { Hero } from "../sections/Hero";
import { PasSection } from "../sections/PasSection";
import { ServicesSection } from "../sections/ServicesSection";
import { ShowroomSection } from "../sections/ShowroomSection";
import { NexoAISection } from "../sections/NexoAISection";
import { ProcessSection } from "../sections/ProcessSection";
import { FaqSection } from "../sections/FaqSection";
import { ContactSection } from "../sections/ContactSection";

/** Orden de secciones de la página principal. Añade o reordena aquí. */
export default function HomePage() {
  return (
    <main id="contenido">
      <Hero />
      <PasSection />
      <ServicesSection />
      <ShowroomSection />
      <NexoAISection />
      <ProcessSection />
      <FaqSection />
      <ContactSection />
    </main>
  );
}
