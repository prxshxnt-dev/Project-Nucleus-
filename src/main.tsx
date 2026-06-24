import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Dynamic API Adapter for iOS & Android apps
const REMOTE_SERVER_URL = "https://ais-pre-t42htfomsqlgzyjqz64km6-772939806015.asia-southeast1.run.app";

try {
  const originalFetch = window.fetch;
  if (originalFetch) {
    const customFetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const isMobileNative = 
        window.location.protocol === 'capacitor:' || 
        window.location.hostname === 'localhost' ||
        (window as any).Capacitor;

      if (isMobileNative) {
        if (typeof input === 'string' && input.startsWith('/api/')) {
          return originalFetch(REMOTE_SERVER_URL + input, init);
        } else if (input instanceof Request) {
          const urlPath = input.url;
          // If the URL is relative or is local asset fetch for /api/, intercept it
          if (urlPath.startsWith('/api/')) {
            const newReq = new Request(REMOTE_SERVER_URL + urlPath, input);
            return originalFetch(newReq, init);
          } else if (urlPath.includes('/api/')) {
            // Handle fully qualified local URLs like http://localhost/api/...
            try {
              const parsed = new URL(urlPath);
              if (parsed.pathname.startsWith('/api/')) {
                const newReq = new Request(REMOTE_SERVER_URL + parsed.pathname + parsed.search, input);
                return originalFetch(newReq, init);
              }
            } catch {
              // Fallback to original
            }
          }
        }
      }
      return originalFetch(input, init);
    };

    // Safely assign fetch to window, falling back to defineProperty if default write fails
    try {
      (window as any).fetch = customFetch;
    } catch {
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          configurable: true,
          writable: true
        });
      } catch (defineErr) {
        console.warn("Could not redefine window.fetch via Object.defineProperty:", defineErr);
      }
    }
  }
} catch (err) {
  console.warn("Failed to set up native fetch redirect adapter:", err);
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);


