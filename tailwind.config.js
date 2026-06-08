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
        // Deep corporate dark palette and smooth light palette
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 15px rgba(14, 165, 233, 0.15)',
        'glow-green': '0 0 15px rgba(34, 197, 94, 0.15)',
      }
    },
  },
  plugins: [],
}
