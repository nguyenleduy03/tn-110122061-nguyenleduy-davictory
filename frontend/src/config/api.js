// API Configuration
const backendPort = typeof __BACKEND_PORT__ !== 'undefined' ? __BACKEND_PORT__ : '8080';

// Force localhost for development
const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

export const API_CONFIG = {
  BASE_URL: `http://${hostname}:${backendPort}/api`,
  TIMEOUT: 10000,
};

console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
console.log('window.location.hostname:', window.location.hostname);
console.log('backendPort:', backendPort);

export default API_CONFIG;
