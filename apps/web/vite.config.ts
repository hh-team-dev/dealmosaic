import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Canonical URLs, og:url and og:image are absolute and must match the domain the
 * site is actually served from — a mismatch splits ranking signals. Rather than
 * hard-coding a domain we might not own yet, index.html carries %SITE_URL% and
 * this plugin substitutes it at build time.
 */
const SITE = (process.env.SITE_URL ?? 'https://dealmosaic.pages.dev').replace(/\/$/, '');

const siteUrlPlugin = () => ({
  name: 'dealmosaic-site-url',
  transformIndexHtml(html: string) {
    return html.replaceAll('%SITE_URL%', SITE);
  },
});

export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // The preview host is a dynamic *.e2b.app domain, so we cannot hard-code an
    // allowlist. Production builds are served by Cloudflare with a fixed host.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_TARGET ?? 'http://127.0.0.1:8787',
        changeOrigin: false, // keep Host/Origin aligned so the same-origin guard passes
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: true,
  },
});
