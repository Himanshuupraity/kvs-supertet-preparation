/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe6fe', 200: '#bfd3fe', 300: '#93b4fd', 400: '#608bfa',
          500: '#3b63f6', 600: '#2546eb', 700: '#1d35d8', 800: '#1e2eaf', 900: '#1e2b8a', 950: '#171c52',
        },
        accent: { 500: '#0f9d8a', 600: '#0b7f70' },
        surface: { DEFAULT: '#ffffff', muted: '#f5f7fb', border: '#e5e9f2' },
        ink: { DEFAULT: '#0f172a', muted: '#475569', faint: '#94a3b8' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans', 'Noto Sans Devanagari', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)' },
      borderRadius: { xl2: '1.25rem' },
      screens: { xs: '380px' },
    },
  },
  plugins: [],
}
