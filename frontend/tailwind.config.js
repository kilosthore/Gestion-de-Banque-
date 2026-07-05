/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Mode sombre activé par l'attribut data-theme="sombre" (géré dans AuthContext)
  darkMode: ['class', '[data-theme="sombre"]'],
  theme: {
    extend: {
      // ── Design tokens — thème "Marine & Cuivre" (TorcolBank) ──
      // Les NOMS des tokens sont conservés (primaire, sombre, degrade, ambre…)
      // pour que tous les composants existants héritent du thème sans modification.
      colors: {
        primaire: {
          50: '#F7F8FB',   // brume ivoire (fond clair)
          100: '#EAEEF5',  // bleu brume
          200: '#D5DDEA',  // bleu sable (bordures claires)
          300: '#A9BAD4',  // marine pâle (texte secondaire sombre)
          400: '#5D7BAB',  // marine clair
          500: '#2C4A7C',  // marine médian
          600: '#1E3055',  // marine Torcol (contraste AA sur clair)
          700: '#14213C',  // marine profond
        },
        cuivre: {
          100: '#F7E8D8',  // cuivre nacré
          200: '#EBC9A4',  // cuivre pâle
          300: '#DFA76B',  // cuivre clair
          400: '#C77B3D',  // cuivre vif (accent sombre)
          500: '#C2762E',  // cuivre signature
          600: '#A65F1E',  // cuivre profond
          700: '#7C4614',  // bronze sombre
        },
        sombre: {
          fond: '#0A1122',                      // encre marine
          surface: '#101A30',                   // marine nuit
          surface2: '#18233D',                  // marine nuit relevé
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
        sans: ['Poppins', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Noms conservés — valeurs "verre" : halo cuivre discret + profondeur marine
        ambre: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.12)',
        'ambre-lg':
          '0 24px 48px -12px rgba(0,0,0,0.55), 0 0 40px rgba(199,123,61,0.12), inset 0 1px 1px rgba(255,255,255,0.18)',
        verre: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 16px 40px -12px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        degrade: 'linear-gradient(135deg, #DFA76B, #C2762E, #A65F1E)',
        'degrade-anime': 'linear-gradient(270deg, #DFA76B, #C2762E, #A65F1E, #C77B3D)',
        // Fond aurore : encre marine traversée d'un halo cuivre très discret
        'aurore-obsidienne':
          'radial-gradient(1200px 600px at 70% -10%, rgba(199,123,61,0.14), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(93,123,171,0.10), transparent 60%), linear-gradient(160deg, #0A1122, #101A30)',
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
