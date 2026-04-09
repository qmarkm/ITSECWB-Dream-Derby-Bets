import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Dev CSP: unsafe-eval needed for Vite HMR, ws/wss for hot-reload WebSocket.
      // Tighten script-src and remove unsafe-eval in production (handled by Nginx).
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval'",       // Vite HMR requires unsafe-eval in dev
        "style-src 'self' 'unsafe-inline'",       // Tailwind/shadcn injects styles
        "img-src 'self' data: blob: https:",      // avatars, og images, base64 previews
        "connect-src 'self' ws://localhost:8080 ws://[::]:8080 http://127.0.0.1:8000 http://localhost:8000",  // API + HMR WebSocket
        "font-src 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
