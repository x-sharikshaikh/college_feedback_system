/**** Tailwind Config ****/
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6D28D9',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95'
        }
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0, 0, 0, 0.1)'
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(1000px 600px at var(--mouse-x,50%) var(--mouse-y,50%), rgba(99,102,241,0.15), transparent 60%)',
        'gradient-hero': 'linear-gradient(120deg, rgba(99,102,241,0.25), rgba(236,72,153,0.25))'
      }
    },
  },
  plugins: [],
}
