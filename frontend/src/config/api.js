// API Configuration
// Dùng window.location.hostname để tự động match với host hiện tại
// → truy cập qua localhost thì gọi localhost:8080, qua IP public thì gọi IP:8080
const backendPort = typeof __BACKEND_PORT__ !== 'undefined' ? __BACKEND_PORT__ : '8080'

export const API_CONFIG = {
  BASE_URL: `http://${window.location.hostname}:${backendPort}/api`,
  TIMEOUT: 10000,
};

export default API_CONFIG;
