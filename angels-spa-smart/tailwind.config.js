/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: { DEFAULT: '#E8B4C4', 50: '#FBF0F3', 100: '#F6E1E8', 200: '#EFCAD6' },
        rose: { DEFAULT: '#B76E79', 700: '#9A5563', 800: '#7E4350' },
        ivory: '#FFF9F5',
        champagne: { DEFAULT: '#D6B98C', 100: '#F3EBDD', 700: '#8A6A3A' },
        ink: { DEFAULT: '#29252A', 600: '#5A5259', 400: '#8C838B' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(41,37,42,0.18)',
        glow: '0 10px 40px -10px rgba(183,110,121,0.45)',
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
