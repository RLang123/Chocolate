export const placeholderId = '00000000-0000-0000-0000-000000000000';
const value = input => String(input ?? '').trim();
const enabled = input => ['1', 'true'].includes(value(input).toLowerCase());

// 설정 검사에서는 네트워크를 호출하거나 비밀 값을 출력하지 않습니다.
export function validateCloudflareConfig(config, env = {}, { checkAuth = true } = {}) {
  const name = value(config.name);
  if (name !== 'chocolate') throw new Error('Worker 이름은 chocolate이어야 합니다. wrangler.jsonc의 name과 Cloudflare 연결 프로젝트를 확인하세요.');
  if (value(env.WRANGLER_CI_OVERRIDE_NAME) && value(env.WRANGLER_CI_OVERRIDE_NAME) !== name) {
    throw new Error('Cloudflare 연결 프로젝트와 Worker 이름이 다릅니다. chocolate 프로젝트의 저장소 연결을 확인하세요.');
  }
  const configuredAccount = value(config.account_id);
  const environmentAccount = value(env.CLOUDFLARE_ACCOUNT_ID);
  if (configuredAccount && environmentAccount && configuredAccount !== environmentAccount) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID와 wrangler.jsonc의 계정이 다릅니다. 다른 계정으로 배포하지 않도록 중단했습니다.');
  }
  const accountId = environmentAccount || configuredAccount;
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error('유효한 Cloudflare 계정 ID를 wrangler.jsonc의 account_id에 설정하세요.');
  const bindings = (config.d1_databases || []).filter(item => item.binding === 'DB');
  if (bindings.length !== 1 || !value(bindings[0].database_name)) throw new Error('이름이 지정된 D1 DB 바인딩이 정확히 하나 필요합니다.');
  const db = bindings[0];
  if (!value(db.database_id) || db.database_id === placeholderId) {
    throw new Error('D1 database_id가 임시 값입니다 (10181 원인). npx wrangler d1 list --json으로 기존 hacklingo-db의 UUID를 확인해 wrangler.jsonc에 입력하세요. DB를 새로 만들 필요는 없습니다.');
  }
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(db.database_id)) throw new Error('D1 database_id는 기존 데이터베이스의 UUID여야 합니다.');
  const ci = enabled(env.CI) || enabled(env.GITHUB_ACTIONS) || enabled(env.WORKERS_CI);
  if (checkAuth && ci && !value(env.CLOUDFLARE_API_TOKEN)) {
    const message = enabled(env.WORKERS_CI)
      ? 'Cloudflare Settings → Build의 API token을 확인하세요. Workers Scripts 편집과 D1 편집 권한이 필요합니다.'
      : 'GitHub Settings → Secrets and variables → Actions에 CLOUDFLARE_API_TOKEN을 등록하세요: https://github.com/RLang123/Chocolate/settings/secrets/actions';
    throw new Error('자동 배포 인증 토큰이 없습니다. ' + message + ' Codespaces 로그인은 자동 배포에 전달되지 않습니다.');
  }
  return { name, accountId, db };
}

export function verifyRemoteDatabase(db, databases) {
  if (!Array.isArray(databases)) throw new Error('Cloudflare D1 조회 결과를 읽을 수 없습니다.');
  const matches = databases.filter(item => item.name === db.database_name);
  if (matches.length !== 1) throw new Error(`${db.database_name} 조회 결과 ${matches.length}개. 계정과 D1 조회 권한을 확인하세요. DB를 자동 생성하지 않습니다.`);
  if (matches[0].uuid !== db.database_id) throw new Error('설정의 D1 ID와 기존 데이터베이스 ID가 다릅니다. npx wrangler d1 list --json으로 확인하세요.');
  return matches[0];
}
