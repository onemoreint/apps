import React from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import App from "./App";
import { initTracking } from "./lib/tracking";
import "./index.css";

initTracking();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </LazyMotion>
  </React.StrictMode>
);
