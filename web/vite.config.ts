import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev backend port; override with PI_OUTPOST_PORT when the server runs elsewhere.
const port = process.env.PI_OUTPOST_PORT ?? '3141'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/ws': {
        target: `ws://127.0.0.1:${port}`,
        ws: true,
      },
      '/branding': `http://127.0.0.1:${port}`,
      '/health': `http://127.0.0.1:${port}`,
    },
  },
})
