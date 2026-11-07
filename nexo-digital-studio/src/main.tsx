import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Tipografías autoalojadas (sin depender de Google Fonts): Sora para titulares, Manrope para texto.
import "@fontsource-variable/sora";
import "@fontsource-variable/manrope";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
