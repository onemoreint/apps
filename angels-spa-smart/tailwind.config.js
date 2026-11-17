/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: { DEFAULT: '#E8B4C4', 50: '#FBF0F3', 100: '#F6E1E8', 200: '#EFCAD6' },
        rose: { DEFAULT: '#B76E79', 700: '#9B1B30', 800: '#7A1426' },
        ivory: '#FBF5F6',
        champagne: { DEFAULT: '#D6B98C', 100: '#F3EBDD', 700: '#8A6A3A' },
        berenjena: { DEFAULT: '#2A1520', 600: '#5E4552', 300: '#B9A6AF' },
        cereza: { DEFAULT: '#9B1B30', 800: '#7A1426' },
        ink: { DEFAULT: '#2A1520', 600: '#5E4552', 400: '#8A7480' },
      },
      fontFamily: {
        display: ['"Bodoni Moda"', 'Didot', '"Bodoni 72"', 'Georgia', 'serif'],
        sans: ['Jost', '"Futura PT"', 'Futura', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(41,37,42,0.18)',
        glow: '0 10px 30px -12px rgba(155,27,48,0.45)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { 'fade-up': 'fadeUp .35s ease-out both' },
    },
  },
  plugins: [],
}
