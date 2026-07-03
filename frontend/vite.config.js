import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000', // redirige les appels API vers le backend
    },
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:5000', // preview local : relaie /api vers le backend Node
      // NB : sur Emergent, l'ingress intercepte /api avant Vite → cette valeur n'y sert pas
    },
  },
});
