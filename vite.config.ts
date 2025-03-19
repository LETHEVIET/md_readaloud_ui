import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    eslint({
      fix: true,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/hf-cdn': {
        target: 'https://cdn-lfs-us-1.hf.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hf-cdn/, ''),
      },
    },
  },
});
