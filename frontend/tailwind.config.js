/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        wq: {
          bg: '#090D16',
          surface: '#0F1623',
          elevated: '#161F30',
          border: '#1E293B',
          accent: '#3B82F6',
          var: '#F59E0B',
          tail: '#EF4444',
          mitigated: '#10B981',
        },
      },
    },
  },
  plugins: [],
};
