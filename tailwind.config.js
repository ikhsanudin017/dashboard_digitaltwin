/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f8ff',
          100: '#d8ebff',
          200: '#b0d5ff',
          300: '#88bfff',
          400: '#5198ff',
          500: '#226fff',
          600: '#1855db',
          700: '#1241a8',
          800: '#0d2d75',
          900: '#071942'
        }
      },
      boxShadow: {
        card: '0 8px 24px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
