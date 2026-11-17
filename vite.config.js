import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The Teklozy backend (Next.js) serves /api/auth (Better Auth) and /api/v1 (business API).
// In development both are proxied so the session cookie is first-party to this origin.
// Set the backend's BETTER_AUTH_URL to this origin (http://localhost:5173) when using the dev server.
export default defineConfig(({ mode }) => {
  const config = loadEnv(mode, process.cwd(), 'TEKLOZY_');
  const backend = config.TEKLOZY_BACKEND_URL || 'http://localhost:3000';
  // When the backend cannot be reached, answer with a readable JSON error instead of an empty 500,
  // so the sign-in screen says what is wrong (for example ECONNREFUSED on the backend address).
  const apiProxy = {
    target: backend,
    changeOrigin: false,
    configure(proxy) {
      proxy.on('error', (err, _req, res) => {
        if (!res || res.headersSent || typeof res.writeHead !== 'function') return;
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'BACKEND_UNREACHABLE', message: `The Teklozy backend at ${backend} is not reachable (${err.code || err.message}). Start it with "npm run dev" in the backend folder, or set TEKLOZY_BACKEND_URL in frontend/.env.` } }));
      });
    },
  };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      proxy: { '/api': apiProxy },
    },
    test: {
      environment: 'jsdom',
      include: ['tests/unit/**/*.test.{js,jsx}'],
      setupFiles: ['tests/unit/setup.js'],
    },
    preview: {
      port: 4173,
      proxy: { '/api': apiProxy },
    },
  };
});
