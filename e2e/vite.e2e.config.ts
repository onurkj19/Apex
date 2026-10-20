import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  base: './',
  plugins: [react()],
  server: { port: 5199, strictPort: true },
  resolve: {
    alias: [
      { find: 'virtual:pwa-register/react', replacement: path.resolve(__dirname, 'pwa-stub.ts') },
      { find: '@/lib/supabase', replacement: path.resolve(__dirname, 'mock-supabase.ts') },
      { find: '@', replacement: path.resolve(__dirname, '../src') },
    ],
  },
});
