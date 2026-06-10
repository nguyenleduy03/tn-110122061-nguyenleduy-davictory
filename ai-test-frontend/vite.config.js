import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ai-test/',
  server: {
    port: 5174,
    proxy: {
      '/api/ai/writing': {
        target: 'http://localhost:5182',
        changeOrigin: true,
      },
      '/api/ai/speaking': {
        target: 'http://localhost:5183',
        changeOrigin: true,
      },
      '/api/admin/ai': {
        target: 'http://localhost:5182',
        changeOrigin: true,
      },
      '/api/admin/speaking': {
        target: 'http://localhost:5183',
        changeOrigin: true,
      },
      '/api/ai/evaluation': {
        target: 'http://localhost:5182',
        changeOrigin: true,
      },
      '/api/ai/speaking/scoring': {
        target: 'http://localhost:5183',
        changeOrigin: true,
      },
    },
  },
});
