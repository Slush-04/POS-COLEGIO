import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Centralización de la URL del Backend (API)
// Para cambiar el servidor de la API, solo edita esta variable:
const API_BASE_URL = "http://localhost:8000/api";

const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === "string") {
    // Reemplaza las direcciones antiguas hardcodeadas por la URL centralizada
    input = input.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000\/api/, API_BASE_URL);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
