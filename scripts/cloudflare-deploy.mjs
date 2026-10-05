import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

process.chdir(new URL('..', import.meta.url).pathname);
const cli = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url).pathname;
function wrangler(args, capture = false) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Wrangler ${args[0]} 실패 (${result.status})`);
  return result.stdout;
}
try {
  if (process.env.CI && (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID)) {
    throw new Error('GitHub 저장소의 Actions secrets에 CLOUDFLARE_API_TOKEN과 CLOUDFLARE_ACCOUNT_ID를 등록하세요.');
  }
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
  const db = config.d1_databases.find(item => item.binding === 'DB');
  if (!db) throw new Error('DB 바인딩이 없습니다.');
  if (!db.database_id || db.database_id === '00000000-0000-0000-0000-000000000000') {
    const list = () => JSON.parse(wrangler(['d1', 'list', '--json'], true));
    let databases = list();
    let match = databases.find(item => item.name === db.database_name);
    if (!match) {
      wrangler(['d1', 'create', db.database_name, '--update-config=false']);
      databases = list();
      match = databases.find(item => item.name === db.database_name);
    }
    if (!match?.uuid) throw new Error('D1 데이터베이스 ID를 확인할 수 없습니다.');
    db.database_id = match.uuid;
    writeFileSync('wrangler.jsonc', JSON.stringify(config, null, 2) + '\n');
    console.log(`D1 연결 완료: ${db.database_name}`);
  }
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
  if (build.status !== 0) throw new Error('빌드 실패');
  wrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
  wrangler(['deploy']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
