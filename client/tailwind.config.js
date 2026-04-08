export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EDFAF4',
          100: '#C6EFE2',
          200: '#8ED8BE',
          500: '#1D9E75',
          600: '#0E7A5A',
          700: '#0A5C44',
        },
        warm: {
          50:  '#FAFAF9',
          100: '#F5F2ED',
          200: '#E8E4DC',
          300: '#D4CFC6',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#3D3935',
          900: '#1C1917',
        }
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      }
    }
  },
  plugins: []
}
