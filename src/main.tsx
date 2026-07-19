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
    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && typeof input === 'object' && 'url' in input) {
        url = (input as any).url;
      }

      const method = (init?.method || (input && typeof input === 'object' && 'method' in input ? (input as any).method : undefined) || 'GET').toUpperCase();
      const reqHeaders = init?.headers || (input && typeof input === 'object' && 'headers' in input ? (input as any).headers : undefined) || {};

      const isMobileNative = 
        window.location.protocol === 'capacitor:' || 
        window.location.hostname === 'localhost' ||
        (window as any).Capacitor;

      let finalInput = input;
      if (isMobileNative) {
        if (typeof input === 'string' && input.startsWith('/api/')) {
          finalInput = REMOTE_SERVER_URL + input;
        } else if (input instanceof Request) {
          const urlPath = input.url;
          if (urlPath.startsWith('/api/')) {
            finalInput = new Request(REMOTE_SERVER_URL + urlPath, input);
          } else if (urlPath.includes('/api/')) {
            try {
              const parsed = new URL(urlPath);
              if (parsed.pathname.startsWith('/api/')) {
                finalInput = new Request(REMOTE_SERVER_URL + parsed.pathname + parsed.search, input);
              }
            } catch {
              // Fallback
            }
          }
        }
      }

      // Log detailed Request (Task 18)
      console.log(`[API REQUEST] 🚀 Sending ${method} to ${url}`, {
        url,
        method,
        headers: reqHeaders,
        body: init?.body ? (typeof init.body === 'string' ? init.body : '[Binary/FormData]') : undefined
      });

      let response: Response;
      try {
        response = await originalFetch(finalInput, init);
      } catch (fetchError: any) {
        console.error(`[API FETCH ERROR] Failed to perform fetch for ${method} ${url}:`, fetchError);
        throw fetchError;
      }

      // Safe body-caching to allow multiple reads (or read for validation logging)
      const originalText = response.text.bind(response);
      let cachedText: string | null = null;
      const getBodyText = async () => {
        if (cachedText === null) {
          cachedText = await originalText();
        }
        return cachedText;
      };

      // Override response.json with strict validator and logger (Tasks 16, 17, 18)
      response.json = async function () {
        const bodyText = await getBodyText();
        const statusCode = response.status;
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.toLowerCase().includes('application/json');

        // Detailed Response Log (Task 18)
        console.log(`[API RESPONSE] 📥 Received ${statusCode} from ${method} ${url}`, {
          url,
          method,
          status: statusCode,
          contentType,
          headers: Object.fromEntries(response.headers.entries() as any),
          bodyText: bodyText.substring(0, 1000) + (bodyText.length > 1000 ? '...' : '')
        });

        // Validation Check (Task 16)
        if (!response.ok || !isJson) {
          console.error(`[API AUDIT FAIL] 🛑 Non-JSON or Error response from ${method} ${url}!`, {
            requestedUrl: url,
            method,
            requestHeaders: reqHeaders,
            statusCode,
            contentType,
            responseBody: bodyText
          });

          let errorMessage = `Server returned non-JSON response (${statusCode})`;
          if (!isJson) {
            errorMessage = `Server returned non-JSON response (expected JSON, got: '${contentType || 'unknown'}') at ${method} ${url}. Body: ${bodyText.slice(0, 500)}`;
          } else {
            try {
              const parsedError = JSON.parse(bodyText);
              errorMessage = parsedError.error || parsedError.message || errorMessage;
            } catch {
              errorMessage = `Error (${statusCode}): ${bodyText.slice(0, 500)}`;
            }
          }
          throw new Error(errorMessage);
        }

        // Safe Parsing (Task 17)
        try {
          return JSON.parse(bodyText);
        } catch (jsonErr: any) {
          console.error(`[API JSON PARSE FAIL] 🛑 Failed to parse JSON from ${method} ${url}:`, {
            error: jsonErr.message,
            bodyText
          });
          throw new Error(`Failed to parse JSON response from ${method} ${url}. Error: ${jsonErr.message}. Body: ${bodyText.slice(0, 500)}`);
        }
      };

      // Override response.text to return cached text safely
      response.text = async function () {
        return getBodyText();
      };

      return response;
    };

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


