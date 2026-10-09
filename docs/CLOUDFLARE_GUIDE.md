# Cloudflare 연결과 배포를 이해하기

사이트 주소: https://chocolate.flow-er123.workers.dev

## 세 가지 배포 경로

| 경로 | 실행 위치 | 인증 | 결과 확인 |
| --- | --- | --- | --- |
| Codespaces 직접 배포 | 내가 연 터미널 | `npm run cloudflare:login`으로 승인한 로그인 | 터미널의 배포 URL·버전 |
| Cloudflare Workers Builds | Cloudflare의 빌드 서버 | Settings → Build에서 선택한 API token | GitHub 커밋의 `Workers Builds: chocolate` 검사 |
| GitHub Actions | GitHub의 실행 서버 | Repository secret `CLOUDFLARE_API_TOKEN` | Actions의 `deploy` 작업 |

Codespaces에서 승인한 로그인은 다른 서버로 복사되지 않습니다. Workers Builds가 성공해도 GitHub Actions는 별도의 토큰이 없으면 실패할 수 있습니다. 하나의 실패 기록만 보고 공개 사이트까지 고장 났다고 판단하지 말고 어느 경로인지 먼저 확인하세요.

## 10181: 데이터베이스를 찾을 수 없음

이번에 받은 로그에는 이렇게 적혀 있었습니다.

```text
D1 binding 'DB' references database '00000000-0000-0000-0000-000000000000'
```

`DB`는 코드에서 데이터베이스를 부르는 이름입니다. `database_id`는 Cloudflare에 실제로 존재하는 데이터베이스의 고유 번호입니다. 모두 0인 번호는 실제 DB를 가리키지 않는 임시 값이어서 Cloudflare가 연결할 수 없습니다.

이 프로젝트의 확인된 설정:

```json
{
  "name": "chocolate",
  "account_id": "05904b7ed667ebc487afcbec9d715be8",
  "d1_databases": [{
    "binding": "DB",
    "database_name": "hacklingo-db",
    "database_id": "4d83e5fd-edc5-4115-afb8-90a9f3a5b4ab"
  }]
}
```

이 값들은 리소스를 식별하는 번호이며 로그인 비밀이 아닙니다. API 토큰은 여기에 쓰면 안 됩니다.

```bash
npm run cloudflare:check
```

이 명령은 계정에서 기존 DB를 조회하고 이름과 UUID가 모두 같은지 확인합니다. DB를 새로 만들거나 데이터를 바꾸지 않습니다. 다른 계정, 잘못된 UUID, 없는 DB이면 이유를 표시하고 중단합니다.

## 예전 설정으로 계속 실패하는 경우

1. Cloudflare → Workers & Pages → chocolate → Settings → Build를 엽니다.
2. 연결 저장소가 `RLang123/Chocolate`, 생산 브랜치가 `main`, 루트가 저장소 최상위인지 확인합니다.
3. 빌드 명령은 `npm run build`, 배포 명령은 `npm run deploy`로 설정합니다.
4. GitHub main에 최신 커밋이 있는지 확인합니다. Codespaces에만 저장한 파일은 원격 빌드에 전달되지 않습니다.
5. 최신 커밋으로 새 빌드를 실행합니다. 예전 실패 빌드의 재시도는 예전 코드를 다시 실행할 수 있습니다.
6. 새 로그에서 Worker가 `chocolate`, D1이 `hacklingo-db`인지 확인합니다.

`Failed to match Worker name`은 연결한 프로젝트의 이름과 설정의 `name`이 다르다는 경고입니다. 현재 설정은 `chocolate`입니다. 새 검사에서는 다른 이름으로 자동 덮어쓰기 되기 전에 중단합니다.

## GitHub Actions의 토큰 누락

GitHub → Settings → Secrets and variables → Actions → New repository secret에서 이름을 `CLOUDFLARE_API_TOKEN`으로 등록합니다. 값은 해당 Cloudflare 계정으로 범위를 제한한 API 토큰입니다. Workers Scripts 편집, D1 편집, Account Settings 읽기 권한이 필요합니다.

`CLOUDFLARE_ACCOUNT_ID`는 현재 파일에 있으므로 추가 등록이 필수는 아닙니다. 등록한다면 파일과 같은 계정이어야 합니다.

토큰을 코드·문서·채팅에 넣지 마세요. 설정 후 Actions → Deploy HackLingo to Cloudflare → Run workflow를 실행합니다. 테스트 통과와 배포 성공은 별도의 결과입니다.

Cloudflare Workers Builds의 토큰도 D1 조회와 마이그레이션 권한이 있어야 합니다. `10181`과 달리 인증·권한 오류가 나오면 Settings → Build의 API token을 확인합니다.

## 수정한 주요 코드

- `scripts/cloudflare-config.mjs`: Worker·계정·D1 UUID·자동 배포 토큰을 검사하는 순수 함수입니다. 비밀 값을 출력하지 않습니다.
- `scripts/cloudflare-check.mjs`: 설정 검사 뒤 Wrangler로 원격 D1을 조회합니다. `--config-only`는 네트워크 없이 설정만 확인합니다.
- `scripts/cloudflare-deploy.mjs`: 검사 → 기존 DB 확인 → 빌드 → 미적용 마이그레이션 → 업로드 순서입니다.
- `scripts/build.mjs`: 공유 규칙과 HTML을 서버 파일로 묶기 전에 배포 대상 설정을 검사합니다. 토큰 없이도 로컬 빌드를 할 수 있습니다.
- `wrangler.jsonc`의 `build.command`: Wrangler 직접 배포에도 최신 파일을 빌드합니다.
- `.github/workflows/deploy.yml`: 토큰 누락을 초기에 설명한 뒤 테스트와 배포를 실행합니다.
- `tests/cloudflare.test.mjs`: 임시 UUID, 잘못된 계정, Worker 불일치, 빈 토큰, 원격 DB 불일치가 배포 전에 차단되는지 검증합니다.

배울 개념은 **설정 값과 비밀 값의 차이**, **로컬 파일과 GitHub 커밋의 차이**, **빌드와 배포의 차이**, **서버마다 별도로 필요한 인증**, **업로드 전에 오류를 잡는 검증**입니다.

공식 문서: [Workers Builds 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [GitHub Actions 배포](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/), [D1 명령](https://developers.cloudflare.com/d1/wrangler-commands/).
