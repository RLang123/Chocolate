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
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || config.account_id;
  if (!accountId) throw new Error('배포 계정을 먼저 확인하고 CLOUDFLARE_ACCOUNT_ID 또는 wrangler.jsonc의 account_id를 설정하세요.');
  process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
  console.log(`배포 계정: ${accountId}, Worker: ${config.name}`);
  const db = config.d1_databases.find(item => item.binding === 'DB');
  if (!db) throw new Error('DB 바인딩이 없습니다.');
  const databases = JSON.parse(wrangler(['d1', 'list', '--json'], true));
  const matches = databases.filter(item => item.name === db.database_name);
  if (matches.length !== 1) throw new Error(`${db.database_name} 조회 결과 ${matches.length}개. 계정과 기존 데이터베이스를 확인하세요. 자동 생성하지 않습니다.`);
  const match = matches[0];
  if (!db.database_id || db.database_id === '00000000-0000-0000-0000-000000000000') {
    if (!match?.uuid) throw new Error('D1 데이터베이스 ID를 확인할 수 없습니다.');
    db.database_id = match.uuid;
    writeFileSync('wrangler.jsonc', JSON.stringify(config, null, 2) + '\n');
    console.log(`D1 연결 완료: ${db.database_name}`);
  } else if (db.database_id !== match.uuid) {
    throw new Error('설정의 D1 ID와 배포 계정의 데이터베이스 ID가 다릅니다. 기존 데이터를 확인한 뒤 수정하세요.');
  }
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
  if (build.status !== 0) throw new Error('빌드 실패');
  wrangler(['d1', 'migrations', 'list', 'DB', '--remote']);
  wrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
  wrangler(['deploy']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
