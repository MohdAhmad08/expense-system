/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: 'var(--bg-color)',
        darkCard: 'var(--card-color)',
        darkBorder: 'var(--border-color)',
        brandAccent: 'var(--brand-color)',
        white: 'var(--text-primary)',
        gray: {
          100: 'var(--text-secondary)',
          300: 'var(--text-tertiary)',
          400: 'var(--text-quaternary)',
          500: '#94A3B8',
        },
        primary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
