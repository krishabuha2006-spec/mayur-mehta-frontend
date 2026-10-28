import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'https://mayurmaheta.vercel.app',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: {
          '*': '/'
        },
        headers: {
          Host: 'mayurmaheta.vercel.app',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Strip browser conditional headers to prevent backend 304 Not Modified
            proxyReq.removeHeader('if-none-match');
            proxyReq.removeHeader('if-modified-since');
          });
        }
      }
    }
  }
});
