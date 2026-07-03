/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Mode sombre activé par l'attribut data-theme="sombre" (géré dans AuthContext)
  darkMode: ['class', '[data-theme="sombre"]'],
  theme: {
    extend: {
      // ── Design tokens — thème "Verre Obsidienne & Or" ──
      // Les NOMS des tokens sont conservés (primaire, sombre, degrade, ambre…)
      // pour que tous les composants existants héritent du thème sans modification.
      colors: {
        primaire: {
          50: '#FBF8EF',   // ivoire chaud (fond clair)
          100: '#F3ECD7',  // champagne pâle
          200: '#E6D9A8',  // sable doré
          300: '#DCC470',  // or clair
          400: '#D4AF37',  // or signature
          500: '#C9A227',  // or profond
          600: '#A9841C',  // or bronze (contraste AA sur clair)
          700: '#7D6114',  // bronze sombre
        },
        sombre: {
          fond: '#050505',                      // obsidienne
          surface: '#0D0B14',                   // minuit cosmos
          surface2: '#16131F',                  // minuit relevé
          bordure: 'rgba(255,255,255,0.10)',    // arête de verre
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
        secondary: 'rgb(var(--hue-border) / <alpha-value>)',
        popover: {
          DEFAULT: 'rgb(var(--hue-card) / <alpha-value>)',
          foreground: 'rgb(var(--hue-card-foreground) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Noms conservés — valeurs "verre" : halo or discret + profondeur obsidienne
        ambre: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.12)',
        'ambre-lg':
          '0 24px 48px -12px rgba(0,0,0,0.55), 0 0 40px rgba(212,175,55,0.10), inset 0 1px 1px rgba(255,255,255,0.18)',
        verre: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 16px 40px -12px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        degrade: 'linear-gradient(135deg, #E6D9A8, #D4AF37, #A9841C)',
        'degrade-anime': 'linear-gradient(270deg, #DCC470, #D4AF37, #A9841C, #C9A227)',
        // Fond aurore : obsidienne traversée d'un halo or très discret
        'aurore-obsidienne':
          'radial-gradient(1200px 600px at 70% -10%, rgba(212,175,55,0.10), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(120,100,255,0.06), transparent 60%), linear-gradient(160deg, #050505, #0D0B14)',
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
        'fade-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'balayage-or': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        degrade: 'degrade-mouvant 8s ease infinite',
        apparition: 'apparition 0.45s ease both',
        pulsation: 'pulsation 1s ease',
        'fade-in': 'fade-in 0.15s ease-out',
        'fade-out': 'fade-out 0.1s ease-in',
        'balayage-or': 'balayage-or 4s linear infinite',
      },
    },
  },
  plugins: [],
};
