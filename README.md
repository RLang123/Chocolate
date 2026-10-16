# TraceLab · 웹 보안 실습

처음 배우는 사람을 위한 보안 실습 사이트입니다. 31개 실습, 서버가 채점하는 랭크 도전, 전문 챕터 네 개와 뜻·비유·예시를 담은 용어 60개를 제공합니다. 버건디·카고색·검정·흰색을 사용하고 요청 편집기와 읽기 쉬운 문서에 집중합니다.

공개 주소: https://chocolate.flow-er123.workers.dev/

별도 도메인 연결은 사용하지 않습니다. 사이트 이름은 TraceLab로 적용했으며, 배포용 Worker `chocolate`과 기존 D1 `hacklingo-db`는 기록 호환을 위해 유지합니다.

## 실행

Node.js 24 이상:

```bash
npm ci
npm run dev
```

http://localhost:8787에서 접속합니다. 로컬 SQLite는 `.local/`에 저장하며 운영 D1과 별개입니다. 단일 HTML을 파일로 열면 혼자 연습할 수 있습니다. 계정·랭크·친구 방과 서버 실습은 API와 데이터베이스가 필요합니다.

```bash
npm test
npm run build
```

## 배우는 순서

1. 기초: 비밀번호·피싱·추가 인증·주소 확인·개인정보·백업.
2. 규칙 실험: 브라우저의 값과 동작, Snake·패킷·로봇.
3. 응용 원리: SQL·XSS·IDOR·CSRF·SSRF·경로 조작 등.
4. 전문 챕터: HTTP 요청·문서 권한, 실제 SQL 매개변수, 서버의 신뢰 경계, 로그인 기록과 요청 제한.

모든 실습 대상은 가상 자료입니다. 전문 실습은 로그인 상태에서 서버가 격리된 문서·SQL·로그를 처리하고 실행 증거를 저장합니다. `lab.local`은 실습 표시용 주소이며 외부 서버에 요청을 전송하지 않습니다.

## 랭크와 친구 방

앞말 80개와 뒷말 100개에서 골라 고유한 별명을 만듭니다. 자유 입력은 받지 않으며, 처음 확정한 별명은 레벨이 올라가도 유지합니다. 가입 전에 복구 코드를 보관하고 다른 컴퓨터에서는 그 코드로 같은 계정을 이어갑니다. 이메일·실제 비밀번호를 받지 않습니다. 브라우저의 혼자 연습 XP를 서버 점수로 가져오지 않습니다.

기본 **학습 랭킹**은 별명을 만든 순간 0 XP부터 참가하며 누적 서버 XP와 레벨을 표시합니다. 100 XP마다 레벨이 오릅니다. 상위 100명과 본인의 실제 순위를 표시하고 기존 계정의 학습 기록을 유지합니다. 이전 자유 입력 별명은 한 번만 새 조합으로 확정합니다.

별도 **하루 도전**은 하루 한 번(UTC) 무작위 세 문제, 30분 제한입니다. 완료 시 최대 900점에서 오답당 25점을 차감합니다. 참가자별 최고 완료 점수로 순위를 계산하고 동점이면 소요 시간·완료 시각을 사용합니다. Gold 750점 이상, Silver 450점 이상, 그 아래는 Bronze입니다. 미완료·만료 도전은 이 도전 순위에 포함하지 않습니다. 랭크는 학습용 모드이며 대회 본인 인증 시스템은 아닙니다.

동시에 같은 별명을 고르면 서버의 고유 조건으로 한 명만 확정합니다. 가입·정답 제출 응답이 끊겨도 같은 요청을 재확인하므로 계정·하트 차감·XP·도전 진행을 중복 적용하지 않습니다. 로그인 중에는 복구 코드를 교체할 수 있습니다. 모든 기기에서 로그아웃하고 코드도 잃으면 별명만으로 안전하게 복구할 수 없습니다. 자세한 사용법과 주요 코드는 [별명·계정·학습 랭킹 안내](docs/IDENTITY_GUIDE.md)에 있습니다.

친구 방은 코드로 참가해 같은 미션을 각자 푸는 방식입니다. 최대 20명, 방 유효 시간 1시간입니다. 일반 실습 XP 보상은 사용자·미션·UTC 날짜별 한 번이며 랭크 점수와 별도입니다. 현재 진행은 서버에서 복구할 수 있고 혼자 연습 진행은 브라우저에 저장합니다.

## 검색 노출과 사전

- `/glossary`: 용어 60개와 용어별 링크.
- `/glossary/http`: 로그인·JavaScript 없이 읽는 정의와 예시.
- `/chapters`: 전문 챕터와 챕터별 설명.
- `/sitemap.xml`, `/robots.txt`: 검색 수집 설정.
- `/security`: 사이트 보안 설정과 실습의 범위.

Google Search Console은 현재 workers.dev 주소의 **URL 접두어 속성**으로 등록합니다. 제공받은 HTML 소유권 확인 태그는 홈페이지에 적용했습니다. Google 화면에서 확인을 마친 뒤 사이트맵을 제출합니다. Search Console은 검색 수집·실적 관리 도구이며 노출과 순위를 보장하지 않습니다.

자세한 절차: [Search Console 안내](docs/SEARCH_CONSOLE.md).

## 보안

세션·복구 코드 해시, HttpOnly·SameSite·HTTPS Secure 쿠키, 출처 검사, 스트리밍 요청 크기 제한, 요청 횟수 제한, SQL 매개변수와 서버 소유권 검사를 사용합니다. 실행 증거는 계정·시도·단계에 묶습니다. 점수·차단 여부를 클라이언트가 주장한 값으로 저장하지 않습니다.

외부 Tailwind 스크립트를 제거했고 실행 스크립트는 CSP의 SHA-256 해시로 허용합니다. 프레임 차단·HSTS·MIME 검사·Permissions Policy를 HTML·API·오류 응답에 적용합니다. 기존 CSS의 인라인 스타일 허용은 남아 있습니다.

## Cloudflare 배포

현재 연결된 Cloudflare Workers Builds가 GitHub main의 새 커밋을 배포합니다. 빌드 명령은 `npm run build`, 배포 명령은 `npm run deploy`를 권장합니다. Wrangler의 사용자 빌드도 Workers Builds 환경에서는 기존 D1 이름·ID 확인과 미적용 마이그레이션 적용을 수행하므로, 기본 `wrangler deploy` 경로에서도 업로드 전에 스키마를 준비합니다. 로컬 빌드·GitHub 검증은 원격 데이터를 바꾸지 않습니다.

GitHub Actions는 테스트·빌드를 항상 실행합니다. 별도의 `CLOUDFLARE_API_TOKEN` secret이 있으면 Actions에서도 배포하고, 없으면 추가 배포 작업을 생략합니다. 실제 Cloudflare 배포 결과는 커밋의 `Workers Builds: chocolate` 검사에서 확인합니다.

Codespaces에서 직접 배포하려면:

```bash
npm run cloudflare:login
npm run cloudflare:check
npm run deploy
```

API 토큰을 코드나 채팅에 넣지 않습니다. `.devcontainer`는 Node와 개발 포트를 설정합니다. 브라우저 미리보기는 Codespace 실행 중에 사용하고 공유 주소는 위 공개 사이트를 사용합니다.

## 주요 파일과 배우는 문서

| 파일 | 역할 |
| --- | --- |
| `index.html` | 기본 화면·CSS·기존 실습 |
| `site/app.mjs` | 전문 챕터·사전 검색·랭크 UI의 원본 |
| `site/identity.mjs`, `site/identity.css` | 별명 선택·복구 코드·다른 기기 동기화·응답 재확인 |
| `site/lesson.mjs`, `site/lesson.css` | 한 문제 중심 전체 화면·큰 답안·짧은 결과·고정 확인 버튼 |
| `site/motion.css`, `site/motion.mjs` | 몰입형 실습 작업대·단계 전환·실행 피드백과 움직임 줄이기 |
| `site/hero.html`, `site/hero.css`, `site/hero.mjs` | 첫 화면 설명·코드 비·해커 실루엣과 재생 제어 |
| `site/experience.mjs`, `site/experience.css` | 요청 이동·단서 스캔·실제 수정 전후 비교·보안 학습 지도 |
| `server/worker.mjs` | 계정·실습·친구 방 API |
| `server/names.mjs`, `server/identity.mjs` | 허용 단어·고유한 영구 별명·가입 재확인·복구 코드 교체 |
| `server/answers.mjs` | 제출 영수증과 중복 채점 방지 |
| `server/rules.mjs`, `server/advanced.mjs` | 공통 규칙과 HTTP 요청 실습 |
| `server/labs.mjs` | 격리된 서버 실습과 실행 증거 |
| `server/rank.mjs` | 누적 XP 학습 랭킹과 하루 도전 완료 순위 |
| `server/content.mjs`, `server/pages.mjs` | 용어 데이터와 검색 가능한 HTML 페이지 |
| `server/security.mjs` | 요청 제한과 보안 응답 정책 |
| `migrations/0002_rank_and_labs.sql` | 기존 기록을 유지하며 랭크·증거 테이블 추가 |
| `migrations/0003_identity_and_receipts.sql` | 기존 계정을 유지하며 별명 고유 조건·가입 및 제출 기록 추가 |
| `scripts/build.mjs` | 공통 모듈을 단일 HTML과 Worker로 묶기 |

[주요 코드 안내](docs/CODE_GUIDE.md) · [처음부터 읽는 학습서](docs/LEARNING_GUIDE.md) · [랭크·전문 챕터·사전·보안 코드](docs/FEATURE_GUIDE.md) · [문제 UI 분석과 주요 코드](docs/LESSON_UI_GUIDE.md) · [실습 화면과 움직임 배우기](docs/MOTION_GUIDE.md) · [첫 화면 그래픽 코드](docs/HERO_GUIDE.md) · [다섯 가지 디자인 효과 배우기](docs/EXPERIENCE_GUIDE.md) · [배포 오류 해결](docs/CLOUDFLARE_GUIDE.md).
