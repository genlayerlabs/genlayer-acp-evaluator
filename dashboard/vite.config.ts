import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/evaluations': 'http://localhost:3000',
      '/acp': 'http://localhost:3000',
    },
  },
});
