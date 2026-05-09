import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const target = process.env.API_URL || 'http://localhost:3000'
const wsTarget = process.env.WS_URL || 'ws://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '3001'),
    proxy: {
      '/api': target,
      '/ws': {
        target: wsTarget,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})