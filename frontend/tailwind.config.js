/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f6f6f6',
        ink: '#111111',
        ok: '#1a7f4b',
        bad: '#b42318',
        warn: '#fff1c9',
      },
      borderRadius: { card: '12px' },
    },
  },
  plugins: [],
}
