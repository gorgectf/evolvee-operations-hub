import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      // In local development, any request starting /api is forwarded to the
      // backend so the frontend never needs to know the backend URL.
      proxy: { '/api': 'http://localhost:4000' },
    },
});
