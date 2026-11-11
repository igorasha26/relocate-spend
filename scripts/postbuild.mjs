/**
 * Шаги после `vite build`:
 * 1. Только для GitHub Pages: 404.html = index.html — так открываются прямые ссылки (/profile, /expense/…).
 *    Cloudflare Pages без 404.html сам отдаёт index.html на любой путь (режим SPA).
 * 2. В service worker вписывается полный список файлов сборки и уникальная версия кеша,
 *    чтобы после первого открытия всё приложение работало без интернета.
 */
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';

const githubPages = Boolean(process.env.GITHUB_ACTIONS);
if (githubPages) copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (!/^(sw\.js|404\.html|version\.json|_headers|_redirects)$/.test(name) && !name.endsWith('.map')) files.push(`./${relative(dist, path).replace(/\\/g, '/')}`);
  }
};
walk(dist);

const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
const swPath = join(dist, 'sw.js');
const sw = readFileSync(swPath, 'utf8')
  .replace('__BUILD__', version)
  .replace("['./', './index.html' /* __PRECACHE__ */]", JSON.stringify(['./', ...files]));
writeFileSync(swPath, sw);

console.log(`postbuild: ${githubPages ? '404.html, ' : ''}sw.js (${files.length} files, cache ${version})`);
