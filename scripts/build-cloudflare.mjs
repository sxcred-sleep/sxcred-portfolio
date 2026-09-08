import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('./cli.js', import.meta.resolve('vinext')));
const result = spawnSync(process.execPath, [cli, 'build'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  stdio: 'inherit',
  env: { ...process.env, SXCRED_DEPLOY_TARGET: 'cloudflare' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
