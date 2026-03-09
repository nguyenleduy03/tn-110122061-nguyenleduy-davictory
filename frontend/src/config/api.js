// API Configuration
// __PUBLIC_IP__ và __BACKEND_PORT__ được inject tự động bởi vite.config.js
// bằng cách fetch IP public của máy lúc khởi động (không cần hardcode)
const publicIp = typeof __PUBLIC_IP__ !== 'undefined' ? __PUBLIC_IP__ : 'localhost'
const backendPort = typeof __BACKEND_PORT__ !== 'undefined' ? __BACKEND_PORT__ : '8080'

export const API_CONFIG = {
  BASE_URL: `http://${publicIp}:${backendPort}/api`,
  TIMEOUT: 10000,
};

export default API_CONFIG;
