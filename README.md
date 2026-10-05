# HackLingo · 도토리 보안단

연노랑 다람쥐 테마의 사이버 보안 학습 게임입니다. 단일 파일 프런트엔드, 20개 사건 파일, 실제 참가자 랭킹, 방 코드로 함께 도전하는 친구 방을 제공합니다.

## 실행

Node.js 24 이상에서:

```bash
npm ci
npm run dev
```

`http://localhost:8787`에서 접속합니다. 로컬 서버도 SQLite에 계정·점수·방을 저장합니다. 서로 다른 브라우저에서 접속하면 실제 별도 참가자로 테스트할 수 있습니다. 개발 데이터는 `.local/`에 있으며 배포에 포함하지 않습니다.

`index.html`만 열면 기존처럼 혼자 연습할 수 있습니다. 공유 랭킹과 친구 방은 같은 출처의 서버와 데이터베이스가 필요합니다. 브라우저의 연습용 XP는 공유 랭킹에 가져오지 않습니다.

## 함께 플레이

1. **함께 출동** 탭에서 실명 대신 닉네임으로 참가합니다. 이메일이나 비밀번호를 받지 않습니다.
2. 처음 한 번 표시하는 **복구 코드**를 보호자와 안전하게 보관합니다. 다른 기기에서 이 코드로 같은 계정을 사용할 수 있습니다. 코드를 가진 사람은 계정에 접근할 수 있으므로 친구에게 공유하지 않습니다.
3. 사건을 선택해 방을 만들고 **6자리 방 코드**를 친구에게 공유합니다. 친구는 같은 사이트의 함께 출동 탭에서 코드로 참가합니다.
4. 방장이 출동하면 4초 후 참가자에게 같은 미션이 열립니다. 최대 20명, 방 유효 시간 1시간입니다.
5. 진행과 완료 결과는 3초마다 갱신합니다. 방 순위는 미션 점수, 완료 시간 순입니다. 이것은 각자 같은 미션을 푸는 경쟁 방식이며, 하나의 Snake 보드를 공동 조작하는 게임은 아닙니다.

전체 랭킹은 실제 참가자만 표시하며 최근 7일·전체 기간을 선택할 수 있습니다. 미션 XP와 도토리는 **사용자·미션·UTC 날짜별로 하루 한 번**만 지급됩니다. 같은 날 다시 플레이해도 방 경쟁에 참가할 수 있습니다. 퀘스트 보상도 하루 한 번입니다.

## 20개 사건 파일

기존 12개: 비밀번호 금고, 피싱 메일, SQL Injection·XSS 코드 수리, 대기업 패킷 방어, 허락받은 크롬 기록 조사, QR 사기, 가짜 Wi-Fi, 2단계 인증, 사진 속 개인정보, 랜섬웨어·백업, 앱 권한, AI 목소리 사기.

추가 8개:

- **사이버 Snake**: 방향키/WASD·터치 버튼·스와이프 조작, 일시정지, 도토리 4개 구조, 바이러스·몸 충돌, 반대편으로 연결되는 벽.
- **내 게임을 해킹하자! 규칙 실험실**: 내가 만든 연습용 게임의 점수·방어 규칙을 바꾸고 테스트.
- **EBWH 암호 퍼즐**: 세 칸 글자 암호를 풀고 현대 암호화와 차이 학습.
- **가짜 게임 업데이트**: 마지막 확장자와 공식 다운로드 경로 확인.
- **수상한 앱 탐정**: 가상의 작업 관리자에서 출처와 사용량 조사.
- **HTTPS의 자물쇠**: 연결 보호와 사이트 신뢰 구별.
- **운동장의 USB**: 모르는 기기를 연결하지 않는 습관.
- **보안 로봇 코딩**: 방향 명령을 직접 배열해 바이러스 칸을 피해 서버로 이동.

모든 기록·메일·주소·작업 관리자는 가상입니다. 다른 사람의 브라우저·기기에는 접근하지 않습니다.

## Cloudflare에 올리기

이 프로젝트는 **Cloudflare Workers + D1**용입니다. HTML만 Pages에 올리면 공유 API가 없으므로 친구 방과 실제 랭킹이 동작하지 않습니다. 전체 프로젝트를 배포하세요.

### Git push로 자동 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 테스트, 기존 D1 확인/연결, 마이그레이션, Worker 배포를 순서대로 실행합니다. 데이터베이스 이름이 같으면 기존 DB를 재사용합니다. 동시에 여러 배포가 데이터베이스를 변경하지 않도록 작업을 직렬 실행합니다.

최초 한 번 [GitHub Actions secrets 설정](https://github.com/RLang123/Chocolate/settings/secrets/actions)에 다음 두 항목을 등록하세요.

- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 계정 ID.
- `CLOUDFLARE_API_TOKEN`: 해당 계정의 Workers Scripts 편집, D1 편집, Account Settings 읽기 권한을 가진 API 토큰. workers.dev 주소 등록에도 Account Settings 권한이 필요합니다.

토큰은 코드나 채팅에 넣지 않습니다. 등록 후 `git push origin main`을 실행하거나 [Actions](https://github.com/RLang123/Chocolate/actions)의 **Deploy HackLingo to Cloudflare → Run workflow**로 재실행하세요. 성공한 작업 로그의 `*.workers.dev`가 공유 주소입니다. Git push만으로 Cloudflare 인증이 생기지는 않으며 위 secrets가 없으면 설명과 함께 작업이 중단됩니다.

### Codespaces에서 직접 배포

```bash
npm ci
npm run cloudflare:login
npm run deploy
```

로그인 명령이 안내하는 주소를 본인 브라우저에서 열고 코드를 입력해 승인합니다. Codespaces에서도 localhost 콜백 없이 로그인할 수 있습니다. `npm run deploy`는 확인된 계정의 기존 D1을 조회하고, ID를 `wrangler.jsonc`에 저장한 뒤 마이그레이션·빌드·배포합니다. 데이터베이스를 자동 생성하지 않습니다. 초기의 `00000000-0000-0000-0000-000000000000`은 로컬 테스트용 값입니다. 실제 DB 조회가 성공해야 교체됩니다. 이 값으로 `npx wrangler deploy`를 직접 실행하면 10181 오류가 납니다.

Codespaces에서 개발하려면 `npm run dev`를 실행하고 **Ports → 8787 → Open in Browser**를 선택합니다. `.devcontainer/devcontainer.json`은 Node 24와 포트 전달을 설정합니다. Codespaces 미리보기 주소는 Codespace가 실행 중일 때 사용하고, 친구와 계속 공유할 주소는 Cloudflare 배포 주소입니다.

Cloudflare의 실제 로컬 런타임에서 실행하려면:

```bash
npm run db:local
npm run dev:cloudflare
```

원격 D1과 로컬 데이터는 별개입니다. 나중에 호스팅을 이동할 때 기존 공유 데이터가 있다면 데이터베이스 내보내기·가져오기도 해야 합니다.

공식 문서: [Workers](https://developers.cloudflare.com/workers/static-assets/), [D1 시작하기](https://developers.cloudflare.com/d1/get-started/).

## 저장과 점수 검증

- D1/SQLite가 계정·답변 단계·XP·보상·방 결과의 기준입니다. 클라이언트의 XP 숫자를 받는 API는 없습니다.
- 세션은 HttpOnly·SameSite 쿠키로 관리하며 HTTPS에서 Secure가 적용됩니다. 서버에는 세션과 복구 코드의 SHA-256 해시만 저장합니다.
- 쓰기 API는 요청 출처·JSON 형식·인증을 확인하고, 가입·방 생성·참가·답변에 요청 제한을 적용합니다.
- 정답은 서버가 검사합니다. 패킷 게임과 Snake는 서버가 준 시드로 플레이 기록을 재실행하고, 달성 조건·순서·최소 소요 시간을 확인합니다.
- 브라우저 자동화를 완전히 막는 시스템은 아닙니다. 유료 대회용 판정 시스템이 아니라 학습용 경쟁과 점수 변조 방지를 위한 검증입니다.
- 닉네임과 캐릭터는 다른 참가자에게 보입니다. 이메일·실명·실제 비밀번호·검색 기록은 수집하지 않습니다. 비밀번호 실습의 문자열은 정답 확인 시 메모리에서만 검사하며 DB에 저장하지 않습니다.
- 기기 권한·실제 검색 기록을 읽거나 임의 코드를 실행하지 않습니다. 게임 규칙 실험실도 사전에 정해진 안전한 규칙을 사용하는 연습입니다.
- 로컬 저장소는 효과음 설정과 **혼자 연습 기록**만 담당합니다.

## 파일

- `index.html`: 모든 HTML·CSS·SVG·게임 JS를 포함한 단일 파일 프런트엔드. Tailwind CDN을 포함하되 사용자 정의 CSS로도 화면이 동작합니다.
- `server/worker.mjs`: 계정, 랭킹, 친구 방, 미션 검증 API.
- `server/rules.mjs`: 서버와 브라우저가 함께 쓰는 게임 규칙과 정답 검증.
- `migrations/0001_multiplayer.sql`: D1 스키마.
- `scripts/build.mjs`: 공유 게임 규칙을 HTML에 반영하고 `dist/server/index.js` Worker를 생성합니다.
- `scripts/dev.mjs`, `scripts/sqlite.mjs`: 지속 저장이 되는 Node 로컬 서버.
- `tests/server.test.mjs`: 사용자 분리·복구·방 권한·공유 랭킹·중복 보상·게임 기록·요청 검증 테스트.

```bash
npm test
npm run build
```

`.openai/hosting.json`은 앞서 만든 기존 Sites의 참조로 남겨두었습니다. Cloudflare 배포는 이 파일을 사용하지 않습니다. 기존 `chatgpt.site` 게시본은 12개 사건 파일 버전입니다. 이번 20개·멀티플레이 버전은 Cloudflare 배포용이며 GitHub Actions 자동 배포 설정을 포함합니다. 원격 배포 여부는 Actions 실행 결과에서 확인하세요.

## chatgpt.site란?

OpenAI Sites가 웹 앱과 게임을 호스팅할 때 사용하는 주소입니다. 직접 서버를 구성하지 않아도 게시하고 공유할 수 있습니다. Cloudflare는 별도의 호스팅 서비스이며, 이 프로젝트의 Worker와 D1을 본인의 계정에서 관리할 수 있습니다.

[OpenAI 공식 Sites 문서](https://learn.chatgpt.com/docs/sites)는 13세 미만을 대상으로 한 서비스가 지원 범위에 들지 않는다고 명시합니다. 이 프로젝트의 초등학생 대상 새 버전을 Sites에 추가 게시하지 않은 이유입니다.

## Cloudflare 대시보드의 chocolate 프로젝트

Worker 이름은 `chocolate`, D1 바인딩은 `DB`입니다. Workers Builds에서 빌드 명령은 `npm run build`, 배포 명령은 `npm run deploy`로 지정하세요. `npx wrangler deploy`만 실행하면 D1 확인과 마이그레이션을 건너뜁니다.

대시보드에서 확인한 배포 계정 ID를 빌드 환경 변수 `CLOUDFLARE_ACCOUNT_ID` 또는 Wrangler의 `account_id`로 지정하세요. Workers Builds의 인증 토큰은 Cloudflare가 관리하며 D1 조회·마이그레이션 권한도 필요합니다.

`npx wrangler d1 list --json`으로 해당 계정의 `hacklingo-db`를 먼저 확인합니다. 없으면 계정이 맞는지 확인한 뒤에만 `npx wrangler d1 create hacklingo-db`로 생성하세요. 실제 ID를 `database_id`에 입력합니다. 설정된 ID가 조회 결과와 다르면 배포는 중단됩니다.

`0001_multiplayer.sql`은 테이블과 인덱스를 생성하며 DROP/DELETE는 없습니다. 배포 스크립트는 원격 마이그레이션 목록을 조회하고 미적용 항목만 적용합니다. 기존 테이블이 있지만 마이그레이션 기록이 없다면 그대로 중단될 수 있으므로, 테이블 삭제 대신 기존 스키마와 이력부터 확인하세요.
