import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_PORT = 8080

async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) })
    const data = await res.json()
    return data.ip
  } catch {
    console.warn('[vite] Khong lay duoc IP public, fallback ve localhost')
    return 'localhost'
  }
}

export default defineConfig(async ({ command }) => {
  const IS_DEV = command === 'serve'
  const PUBLIC_IP = IS_DEV ? await getPublicIP() : 'localhost'

  if (IS_DEV) {
    console.log(`[vite] Public IP: ${PUBLIC_IP}`)
    console.log(`[vite] API Base URL: http://${PUBLIC_IP}:${BACKEND_PORT}/api`)
  }

  return {
    plugins: [react()],
    base: process.env.VITE_BASE_URL || '/',
    define: {
      __PUBLIC_IP__: JSON.stringify(PUBLIC_IP),
      __BACKEND_PORT__: JSON.stringify(String(BACKEND_PORT)),
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['localhost', '127.0.0.1'],
      proxy: {
        '/api/ai/speaking': {
          target: process.env.AI_SPEAKING_TARGET || 'http://localhost:5181',
          changeOrigin: true,
        },
        '/api': {
          target: process.env.BACKEND_TARGET || `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
        }
      }
    }
  }
})
