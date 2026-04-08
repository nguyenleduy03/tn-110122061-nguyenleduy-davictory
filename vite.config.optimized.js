import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_PORT = 8080

// ✅ CACHE PUBLIC IP - Không fetch mỗi lần restart
let cachedPublicIP = null

async function getPublicIP() {
  // Nếu đã có cache, dùng luôn
  if (cachedPublicIP) {
    console.log(`[vite] 📦 Dùng cached IP: ${cachedPublicIP}`)
    return cachedPublicIP
  }

  try {
    const res = await fetch('https://api.ipify.org?format=json', { 
      signal: AbortSignal.timeout(2000)  // Giảm từ 4s xuống 2s
    })
    const data = await res.json()
    cachedPublicIP = data.ip
    console.log(`[vite] 🌐 Lấy IP mới: ${cachedPublicIP}`)
    return cachedPublicIP
  } catch (err) {
    console.warn('[vite] ⚠️  Không lấy được IP public, dùng localhost')
    cachedPublicIP = 'localhost'
    return 'localhost'
  }
}

// https://vite.dev/config/
export default defineConfig(async () => {
  const PUBLIC_IP = await getPublicIP()

  console.log(`[vite] 🔗 API Base URL: http://${PUBLIC_IP}:${BACKEND_PORT}/api`)

  return {
    plugins: [react()],
    
    define: {
      __PUBLIC_IP__: JSON.stringify(PUBLIC_IP),
      __BACKEND_PORT__: JSON.stringify(String(BACKEND_PORT)),
    },
    
    // ✅ BUILD OPTIMIZATION
    build: {
      target: 'es2015',
      minify: 'esbuild',
      cssMinify: true,
      
      // ✅ CODE SPLITTING
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          }
        }
      },
      
      // ✅ CHUNK SIZE WARNING
      chunkSizeWarningLimit: 1000,
    },
    
    server: {
      host: '0.0.0.0',
      port: 5173,
      
      // ✅ CORS
      allowedHosts: ['davictory.io.vn', 'localhost'],
      
      // ✅ HMR OPTIMIZATION
      hmr: {
        protocol: 'wss',
        host: 'davictory.io.vn',
        clientPort: 443,
        overlay: true,  // Hiện lỗi trên browser
      },
      
      // ✅ PROXY
      proxy: {
        '/api': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
          secure: false,
          // ✅ Timeout cho proxy
          timeout: 30000,  // 30s
        }
      },
      
      // ✅ WATCH OPTIONS - Giảm CPU usage
      watch: {
        usePolling: false,  // Không dùng polling
        interval: 100,
      },
    },
    
    // ✅ OPTIMIZATION
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        'axios',
        'framer-motion',
        'lucide-react',
      ],
      // ✅ Force pre-bundle
      force: false,
    },
    
    // ✅ ESBUILD OPTIONS
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },
  }
})
