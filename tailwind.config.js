/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        ok: 'var(--ok)',
        warning: 'var(--warning)',
        critical: 'var(--critical)'
      }
    }
  },
  plugins: []
}

