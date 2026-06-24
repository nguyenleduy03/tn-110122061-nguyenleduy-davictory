import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_PORT = 8080

// Tự động lấy IP public của máy hiện tại qua api.ipify.org
// Nếu không có mạng hoặc lỗi thì fallback về localhost
async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) })
    const data = await res.json()
    return data.ip
  } catch {
    console.warn('[vite] ⚠️  Không lấy được IP public, fallback về localhost')
    return 'localhost'
  }
}

// https://vite.dev/config/
export default defineConfig(async () => {
  const PUBLIC_IP = await getPublicIP()

  console.log(`[vite] 🌐 Public IP: ${PUBLIC_IP}`)
  console.log(`[vite] 🔗 API Base URL: http://${PUBLIC_IP}:${BACKEND_PORT}/api`)

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
      allowedHosts: ['davictory.io.vn', 'www.davictory.io.vn', 'localhost'],
      hmr: {
        protocol: 'wss',
        host: 'davictory.io.vn',
        clientPort: 443
      },
      proxy: {
        '/api/ai/speaking': {
          target: 'http://localhost:5181',
          changeOrigin: true,
        },
        '/api': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
        }
      }
    }
  }
})
