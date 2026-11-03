import Background from "./components/effects/Background";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Benefits from "./components/Benefits";
import Curriculum from "./components/Curriculum";
import Tools from "./components/Tools";
import SpecialEducation from "./components/SpecialEducation";
import PracticalWorkshop from "./components/PracticalWorkshop";
import WhatsAppFunnel from "./components/WhatsAppFunnel";
import FAQ from "./components/FAQ";
import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import FloatingWhatsApp from "./components/FloatingWhatsApp";

export default function App() {
  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <Background />
      <Navbar />
      <main id="contenido" className="relative z-10">
        <Hero />
        <Benefits />
        <Curriculum />
        <Tools />
        <SpecialEducation />
        <PracticalWorkshop />
        <WhatsAppFunnel />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
