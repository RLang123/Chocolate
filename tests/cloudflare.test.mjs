import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCloudflareConfig, verifyRemoteDatabase, placeholderId } from '../scripts/cloudflare-config.mjs';
const config = () => JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));

test('로컬 OAuth와 비어 있는 선택적 계정 secret은 설정의 계정을 사용한다', () => {
  assert.equal(validateCloudflareConfig(config(), { CLOUDFLARE_ACCOUNT_ID: ' ' }).accountId, config().account_id);
  assert.doesNotThrow(() => validateCloudflareConfig(config(), { CI: 'false' }));
});
test('GitHub와 Workers Builds의 빈 배포 토큰을 미리 거부한다', () => {
  for (const env of [{ CI: 'true' }, { GITHUB_ACTIONS: 'true', CLOUDFLARE_API_TOKEN: ' ' }, { WORKERS_CI: '1' }]) {
    assert.throws(() => validateCloudflareConfig(config(), env), /토큰/);
  }
  assert.doesNotThrow(() => validateCloudflareConfig(config(), { CI: 'true', CLOUDFLARE_API_TOKEN: 'test-token' }));
  assert.doesNotThrow(() => validateCloudflareConfig(config(), { CI: 'true' }, { checkAuth: false }));
});
test('임시 D1 ID와 누락된 DB 바인딩을 업로드 전에 거부한다', () => {
  for (const id of [placeholderId, '', 'invalid']) {
    const item = config(); item.d1_databases[0].database_id = id;
    assert.throws(() => validateCloudflareConfig(item), /D1/);
  }
  assert.throws(() => validateCloudflareConfig({ ...config(), d1_databases: [] }), /바인딩/);
});
test('Worker와 계정이 연결 프로젝트와 다르면 토큰을 노출하지 않고 거부한다', () => {
  assert.throws(() => validateCloudflareConfig({ ...config(), name: 'hacklingo' }), /Worker/);
  assert.throws(() => validateCloudflareConfig(config(), { WRANGLER_CI_OVERRIDE_NAME: 'other' }), /프로젝트/);
  assert.throws(() => validateCloudflareConfig(config(), { CLOUDFLARE_ACCOUNT_ID: 'f'.repeat(32), CLOUDFLARE_API_TOKEN: 'secret-value' }), error => /계정/.test(error.message) && !error.message.includes('secret-value'));
});
test('기존 DB 이름과 UUID를 함께 검사하며 누락·중복·불일치를 거부한다', () => {
  const db = config().d1_databases[0];
  const match = { name: db.database_name, uuid: db.database_id };
  assert.equal(verifyRemoteDatabase(db, [match]), match);
  for (const rows of [[], [match, match], [{ ...match, uuid: placeholderId }], [{ ...match, name: 'other' }]]) {
    assert.throws(() => verifyRemoteDatabase(db, rows));
  }
});
