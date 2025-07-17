// Enhanced API URL detection with environment variable support
const getApiUrl = (): string => {
  // Priority 1: Environment variable (set by startup script)
  if (process.env.REACT_APP_API_URL) {
    console.log('🔧 Using REACT_APP_API_URL from environment:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Priority 2: Auto-detect based on current hostname
  const hostname = window.location.hostname;
  const port = process.env.REACT_APP_BACKEND_PORT || '3001';
  
  // If accessing via localhost or 127.0.0.1, use localhost backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = `http://localhost:${port}`;
    console.log('🔧 Using localhost API URL:', url);
    return url;
  }
  
  // If accessing via IP address, use the same IP for backend
  if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    const url = `http://${hostname}:${port}`;
    console.log('🔧 Using IP-based API URL:', url);
    return url;
  }
  
  // Priority 3: Try to get IP from environment
  if (process.env.REACT_APP_HOST_IP) {
    const url = `http://${process.env.REACT_APP_HOST_IP}:${port}`;
    console.log('🔧 Using REACT_APP_HOST_IP for API URL:', url);
    return url;
  }
  
  // Fallback to localhost (development)
  const fallbackUrl = `http://localhost:${port}`;
  console.log('🔧 Using fallback API URL:', fallbackUrl);
  return fallbackUrl;
};

// Enhanced WebSocket URL detection
const getWsUrl = (): string => {
  // Priority 1: Environment variable (set by startup script)
  if (process.env.REACT_APP_WS_URL) {
    console.log('🔧 Using REACT_APP_WS_URL from environment:', process.env.REACT_APP_WS_URL);
    return process.env.REACT_APP_WS_URL;
  }
  
  // Priority 2: Convert HTTP URL to WebSocket URL
  const apiUrl = getApiUrl();
  const wsUrl = apiUrl.replace('http://', 'ws://');
  console.log('🔧 Using WebSocket URL:', wsUrl);
  return wsUrl;
};

export const API_BASE_URL = getApiUrl();
export const WS_BASE_URL = getWsUrl();

// Debug logging
console.log('🌐 API Configuration:');
console.log('   API_BASE_URL:', API_BASE_URL);
console.log('   WS_BASE_URL:', WS_BASE_URL);
console.log('   Current hostname:', window.location.hostname);
console.log('   Environment variables:');
console.log('     REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('     REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
console.log('     REACT_APP_HOST_IP:', process.env.REACT_APP_HOST_IP);
console.log('     REACT_APP_BACKEND_PORT:', process.env.REACT_APP_BACKEND_PORT); 