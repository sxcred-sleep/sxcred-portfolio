import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const resolve = name => path.join(root, name);
const common = { configFile: false, resolve: { alias: { '@': root } } };

await build({
  ...common,
  root: resolve('cloudflare'),
  publicDir: resolve('public'),
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: resolve('dist/client'), emptyOutDir: true },
});
await build({
  ...common,
  root,
  publicDir: false,
  build: {
    ssr: resolve('cloudflare/worker.ts'),
    outDir: resolve('dist/server'),
    emptyOutDir: true,
    rolldownOptions: { external: ['cloudflare:workers'], output: { entryFileNames: 'index.js' } },
  },
});
const config = JSON.parse(await readFile(resolve('wrangler.cloudflare.json'), 'utf8'));
config.main = './index.js';
config.assets = { directory: '../client', binding: 'ASSETS', not_found_handling: 'single-page-application', run_worker_first: ['/api/*'] };
for (const database of config.d1_databases ?? []) database.migrations_dir = '../../drizzle';
await writeFile(resolve('dist/server/wrangler.json'), JSON.stringify(config, null, 2) + '\n');
