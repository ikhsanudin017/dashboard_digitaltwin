import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true
    }
  },
  build: {
    emptyOutDir: true // Bersihkan output directory sebelum build
  },
  optimizeDeps: {
    force: true // Force optimize dependencies saat dev
  },
  clearScreen: false
})

