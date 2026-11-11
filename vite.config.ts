import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
// Уникальный номер сборки: по нему открытое приложение узнаёт, что вышла новая версия (см. public/version.json)
const buildId = process.env.BUILD_ID ?? Date.now().toString(36);

/** dist/version.json — открытое приложение сравнивает его со своим номером сборки. */
const versionFile = (): Plugin => ({
  name: 'version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, buildId }) });
  },
});

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages: сайт в подпапке /<репозиторий>/ (VITE_BASE передаёт workflow). Cloudflare Pages: корень '/'
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
