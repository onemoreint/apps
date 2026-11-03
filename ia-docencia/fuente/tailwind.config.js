/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080B16",
        deep: "#0C1328",
        navy: "#121C3D",
        line: "#26325C",
        electric: "#1769FF",
        neon: "#00C8FF",
        violet: "#8747FF",
        tech: "#F5F7FF",
        mute: "#B3BEDD",
        wa: "#25D366",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
