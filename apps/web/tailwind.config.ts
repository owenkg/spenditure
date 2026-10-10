import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f5f2',
          100: '#d9e8df',
          200: '#b3d1bf',
          300: '#80b398',
          400: '#4d9270',
          500: '#2d6e4e',
          600: '#1A2B22',
          700: '#142218',
          800: '#0D1A13',
          900: '#08100b',
        },
        amber: {
          50: '#fef9ed',
          100: '#fdf0cc',
          200: '#fada8a',
          300: '#f7c348',
          400: '#d4971c',
          500: '#B87212',
          600: '#8f560d',
          700: '#6b3f0a',
          800: '#472a07',
          900: '#241503',
        },
        parchment: {
          50: '#fefcf8',
          100: '#F3EDE1',
          200: '#e8dcc5',
          300: '#d9c9a8',
          400: '#c9b68b',
          500: '#b8a270',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
