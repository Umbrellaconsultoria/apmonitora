import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [basicSsl()],
  server: {
    port: 5173,
    host: true,
    https: true,
    // Proxy para o backend — resolve o problema de mixed content (HTTPS→HTTP)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // Proxy de WebSocket
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
