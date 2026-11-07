/** @type {import('tailwindcss').Config} */
// Colores de marca: también definidos en src/config/theme.ts (fuente única para JS).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#080912", 900: "#080912", 800: "#0d0f1c", 700: "#141729", 600: "#1c2036" },
        violet: { DEFAULT: "#7857FF", 300: "#a893ff", 400: "#8f74ff", 500: "#7857FF", 600: "#6141f0" },
        electric: { DEFAULT: "#28C5FF", 300: "#7ddcff", 400: "#4fd0ff", 500: "#28C5FF", 600: "#0ea8e0" },
        mist: { DEFAULT: "#A5A8B8", 300: "#c9cbd6", 500: "#A5A8B8", 700: "#6f7286" },
      },
      fontFamily: {
        display: ["Sora Variable", "Sora", "system-ui", "sans-serif"],
        sans: ["Manrope Variable", "Manrope", "system-ui", "sans-serif"],
      },
      maxWidth: { site: "1240px" },
      keyframes: {
        "gradient-pan": { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        "float-y": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "dash": { to: { strokeDashoffset: "-200" } },
        "pulse-ring": { "0%": { transform: "scale(1)", opacity: ".6" }, "100%": { transform: "scale(1.8)", opacity: "0" } },
      },
      animation: {
        "gradient-pan": "gradient-pan 8s ease-in-out infinite",
        "float-y": "float-y 6s ease-in-out infinite",
        "dash": "dash 6s linear infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(.2,.6,.3,1) infinite",
      },
    },
  },
  plugins: [],
};
