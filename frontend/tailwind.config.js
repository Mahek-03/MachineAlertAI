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
        industrial: {
          900: '#0b1329',
          800: '#111c38',
          700: '#1e293b',
          600: '#334155',
          500: '#475569',
          400: '#94a3b8',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        risk: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          blue: '#0284c7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
