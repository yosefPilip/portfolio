import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html'),
        music: resolve(__dirname, 'music.html'),
        workshop: resolve(__dirname, 'workshop.html'),
        'cache-it': resolve(__dirname, 'projects/cache-it.html'),
      },
    },
  },
})
