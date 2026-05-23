import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

if (BACKEND_URL) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    let url = typeof input === 'string' ? input : input.url;
    if (typeof url === 'string' && url.startsWith('/api')) {
      url = `${BACKEND_URL}${url}`;
    }
    if (typeof input === 'string') {
      return originalFetch(url, init);
    }
    const request = new Request(url, input);
    return originalFetch(request, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
