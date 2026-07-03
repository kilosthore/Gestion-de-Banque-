import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
      '/api': 'http://localhost:8001', // preview local : relaie /api vers le backend
    },
  },
});
