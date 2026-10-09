import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateCloudflareConfig, verifyRemoteDatabase } from './cloudflare-config.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
try {
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
  const { name, accountId, db } = validateCloudflareConfig(config, process.env);
  console.log(`설정 정상: Worker ${name} / D1 ${db.database_name}`);
  if (!process.argv.includes('--config-only')) {
    const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
    const result = spawnSync(process.execPath, [cli, 'd1', 'list', '--json', '--config', 'wrangler.jsonc'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId, WRANGLER_SEND_METRICS: 'false' }
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('D1 연결 검사 실패. Codespaces에서는 npm run cloudflare:login, 자동 배포에서는 토큰의 D1 권한을 확인하세요.');
    verifyRemoteDatabase(db, JSON.parse(result.stdout));
    console.log('기존 D1 연결 정상. 데이터를 변경하지 않았습니다.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
