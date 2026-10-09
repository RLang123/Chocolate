import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateCloudflareConfig, verifyRemoteDatabase } from './cloudflare-config.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
function wrangler(args, capture = false) {
  const result = spawnSync(process.execPath, [cli, ...args, '--config', 'wrangler.jsonc'], {
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Wrangler ${args[0]} 실패 (${result.status}). 위 오류를 확인하세요. 인증 문제라면 로컬은 npm run cloudflare:login, 자동 배포는 API 토큰과 D1 편집 권한을 확인하세요.`);
  return result.stdout;
}
try {
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
  const { accountId, name, db } = validateCloudflareConfig(config, process.env);
  process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
  console.log(`배포 계정: ${accountId}, Worker: ${name}`);
  const databases = JSON.parse(wrangler(['d1', 'list', '--json'], true));
  verifyRemoteDatabase(db, databases);
  console.log(`기존 D1 확인 완료: ${db.database_name}`);
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
  if (build.status !== 0) throw new Error('빌드 실패');
  wrangler(['d1', 'migrations', 'list', 'DB', '--remote']);
  wrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
  wrangler(['deploy']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
