import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_BACKEND_URL || 'https://mayurmaheta.vercel.app';
  const backendHost = backendTarget.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: false,
      hmr: {
        clientPort: 5173
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: 'localhost',
          cookiePathRewrite: {
            '*': '/'
          },
          headers: {
            Host: backendHost,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Strip browser conditional headers to prevent backend 304 Not Modified
              proxyReq.removeHeader('if-none-match');
              proxyReq.removeHeader('if-modified-since');
            });
            proxy.on('proxyRes', (proxyRes) => {
              // Remove 'Secure' on localhost HTTP so browser accepts httpOnly 'rt' / 'art' refresh cookies
              const setCookie = proxyRes.headers['set-cookie'];
              if (setCookie) {
                const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
                proxyRes.headers['set-cookie'] = cookies.map((c) =>
                  c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
                );
              }
            });
          }
        }
      }
    }
  };
});
