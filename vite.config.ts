import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    // Proxy /api requests to the Spring Boot backend.
    // The browser sends requests to localhost:5176/api/v1/...
    // Vite forwards them to localhost:8090/api/v1/...
    // No CORS header needed — browser sees same-origin requests.
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
