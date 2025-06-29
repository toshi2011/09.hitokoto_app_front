import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(),  tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { host: true },
  // server: { port: 5173 },
  preview: { port: 4173 },
  base: '/09.hitokoto_app_front/',
})
