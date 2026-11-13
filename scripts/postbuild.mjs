/**
 * Шаги после `vite build`:
 * 1. Только для GitHub Pages: 404.html = index.html — так открываются прямые ссылки (/profile, /expense/…).
 *    Cloudflare Pages без 404.html сам отдаёт index.html на любой путь (режим SPA).
 * 2. Тестовая сборка (VITE_APP_ENV=staging): иконки из public-staging/ (янтарные, с лентой TEST)
 *    и название «RS Test» на главном экране — чтобы не путать с основной версией.
 * 3. В service worker вписывается полный список файлов сборки и уникальная версия кеша,
 *    чтобы после первого открытия всё приложение работало без интернета.
 */
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';

const githubPages = Boolean(process.env.GITHUB_ACTIONS);
if (githubPages) copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));

const staging = process.env.VITE_APP_ENV === 'staging';
if (staging && existsSync('public-staging')) {
  for (const name of readdirSync('public-staging')) copyFileSync(join('public-staging', name), join(dist, name));
  const manifestPath = join(dist, 'manifest.webmanifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  writeFileSync(
    manifestPath,
    JSON.stringify({ ...manifest, name: 'RelocateSpend TEST', short_name: 'RS Test', theme_color: '#8A5A12' }, null, 2),
  );
  const indexPath = join(dist, 'index.html');
  writeFileSync(
    indexPath,
    readFileSync(indexPath, 'utf8')
      .replace('name="apple-mobile-web-app-title" content="RelocateSpend"', 'name="apple-mobile-web-app-title" content="RS Test"')
      .replace(/<title>[^<]*<\/title>/, '<title>RS Test — тестовая версия</title>'),
  );
}

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (!/^(sw\.js|404\.html|version\.json|og-image\.jpg|_headers|_redirects)$/.test(name) && !name.endsWith('.map')) files.push(`./${relative(dist, path).replace(/\\/g, '/')}`);
  }
};
walk(dist);

const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
const swPath = join(dist, 'sw.js');
const sw = readFileSync(swPath, 'utf8')
  .replace('__BUILD__', version)
  .replace("['./', './index.html' /* __PRECACHE__ */]", JSON.stringify(['./', ...files]));
writeFileSync(swPath, sw);

console.log(`postbuild: ${staging ? 'staging icons, ' : ''}${githubPages ? '404.html, ' : ''}sw.js (${files.length} files, cache ${version})`);
