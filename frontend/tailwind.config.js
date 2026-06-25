/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Mode sombre activé par l'attribut data-theme="sombre" (géré dans AuthContext)
  darkMode: ['class', '[data-theme="sombre"]'],
  theme: {
    extend: {
      // ── Design tokens — palette jaune-orange ──
      colors: {
        primaire: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#ea580c',
          700: '#c2410c',
        },
        sombre: {
          fond: '#1c1410',
          surface: '#292017',
          surface2: '#3b2d1d',
          bordure: '#57401f',
        },
        // ── Alias de tokens (shadcn-like) → palette via CSS vars ──
        background: 'rgb(var(--hue-background) / <alpha-value>)',
        foreground: 'rgb(var(--hue-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--hue-primary) / <alpha-value>)',
          foreground: 'rgb(var(--hue-primary-foreground) / <alpha-value>)',
        },
        'muted-foreground': 'rgb(var(--hue-muted-foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--hue-card) / <alpha-value>)',
          foreground: 'rgb(var(--hue-card-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--hue-border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        ambre: '0 4px 20px rgba(249, 115, 22, 0.12)',
        'ambre-lg': '0 8px 32px rgba(249, 115, 22, 0.22)',
      },
      backgroundImage: {
        degrade: 'linear-gradient(135deg, #fbbf24, #f59e0b, #f97316)',
        'degrade-anime': 'linear-gradient(270deg, #fbbf24, #f97316, #ea580c, #f59e0b)',
      },
      keyframes: {
        'degrade-mouvant': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        apparition: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulsation: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
      },
      animation: {
        degrade: 'degrade-mouvant 8s ease infinite',
        apparition: 'apparition 0.45s ease both',
        pulsation: 'pulsation 1s ease',
      },
    },
  },
  plugins: [],
};
