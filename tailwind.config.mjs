/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brutalist beige and brown palette
        beige: {
          50: '#FAF8F3',
          100: '#F5F1E8',
          200: '#EBE2D1',
          300: '#E0D2B8',
          400: '#D6C29F',
          500: '#CCB286',
          600: '#B8966B',
          700: '#A47A52',
          800: '#8B623A',
          900: '#6D4B2A'
        },
        brown: {
          50: '#F5F3F2',
          100: '#E6DDD9',
          200: '#CFC0B8',
          300: '#B5A097',
          400: '#9B8076',
          500: '#756055',
          600: '#5A4A42',
          700: '#463A34',
          800: '#342B27',
          900: '#241E1C'
        }
      },
      fontFamily: {
        'tangut': ['"Noto Serif Tangut"', 'serif'],
        'brutalist': ['"Noto Sans Mono"', 'monospace'],
        'sans-reading': ['"Noto Sans"', 'sans-serif']
      }
    },
  },
  plugins: [],
}