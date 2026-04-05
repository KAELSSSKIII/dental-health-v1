/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0a6352',  // deep saturated teal
          light: '#0d8a6e',    // richer hover
          dark: '#051f19',     // near-black teal for sidebar
        },
        bg: '#f5f7f6',         // near-neutral (not mint-tinted)
        surface: '#FFFFFF',
        border: '#c5d4cf',     // stronger, more visible
        text: {
          primary: '#091a16',  // deep near-black
          secondary: '#4e6b63',// richer muted
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '12px',
        lg: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(50,80,75,0.10), 0 4px 12px rgba(0,0,0,0.06)',
        modal: '0 20px 60px rgba(50,80,75,0.18), 0 8px 24px rgba(0,0,0,0.08)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
