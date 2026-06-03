import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/ai/speaking': {
        target: 'http://localhost:5181',
        changeOrigin: true,
      },
      '/api/admin/speaking': {
        target: 'http://localhost:5181',
        changeOrigin: true,
      },
      '/api/ai': {
        target: 'http://localhost:5180',
        changeOrigin: true,
      },
      '/api/admin/ai': {
        target: 'http://localhost:5180',
        changeOrigin: true,
      },
    },
  },
});
