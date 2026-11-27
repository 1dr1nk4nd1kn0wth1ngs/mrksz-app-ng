import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const UPSTREAM = 'https://mrksz-webapp-appserver-od67o.ondigitalocean.app'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.MRKSZ_UPSTREAM || UPSTREAM
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Same-origin proxy so local development is not subject to the backend's CORS policy.
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          ws: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@microsoft/signalr')) return 'signalr'
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react'
          },
        },
      },
    },
  }
})
