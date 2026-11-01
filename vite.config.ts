/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const destino = env.API_PROXY_TARGET || 'http://localhost:8080';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // El backend no envía CORS: en desarrollo el navegador habla con Vite y Vite reenvía /api.
      proxy: { '/api': { target: destino, changeOrigin: true } },
    },
    preview: {
      port: 4173,
      proxy: { '/api': { target: destino, changeOrigin: true } },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      env: { VITE_API_URL: 'http://api.test/api/v1', VITE_MEDIA_URL: 'http://media.test/' },
    },
  };
});
