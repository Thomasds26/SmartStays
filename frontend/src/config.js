// frontend/src/config.js

// Vind je IP via terminal: ipconfig getifaddr en0
const YOUR_IP = '192.168.0.152'; // Vervang door jouw IP-adres

// Kies modus: 'local' voor laptop, 'network' voor telefoon
const MODE = 'network'; // Verander naar 'network' voor telefoon

const getApiUrl = () => {
  if (MODE === 'local') {
    return 'http://localhost:3000';
  }
  return `http://${YOUR_IP}:3000`;
};

const API_URL = getApiUrl();

console.log('API_URL:', API_URL); // Debug: check in browser console

export default API_URL;