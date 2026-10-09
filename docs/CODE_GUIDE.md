# HackLingo 코드 읽기

처음에는 첫 실습 버튼 하나가 동작하는 과정을 따라가면 됩니다. 모든 코드를 한 번에 이해할 필요는 없습니다.

HTML·CSS·JavaScript 문법부터 실제 서버 흐름까지 차근차근 배우려면 [내 사이트로 배우는 웹 개발과 보안](LEARNING_GUIDE.md)을 읽어보세요. 이 문서는 주요 코드의 역할을 빠르게 찾아보는 안내입니다.

## 1. HTML: 화면에 무엇을 놓을지

`index.html`에서 다음 버튼을 찾아보세요.

```html
<button class="btn" data-mission="0">첫 실습 시작하기 →</button>
```

`button`은 누르는 버튼입니다. `class="btn"`은 디자인을 연결하고, `data-mission="0"`은 어떤 실습을 열지 알려줍니다. 0은 첫 번째 비밀번호 실습의 ID입니다. 다른 버튼에도 같은 속성을 붙이면 같은 클릭 처리 코드를 사용할 수 있습니다.

## 2. CSS: 화면을 어떻게 보이게 할지

`index.html`의 `Burgundy / cargo design system` 블록에서 색상을 정합니다.

```css
:root {
  --brand: #7b263f;
  --brand-soft: #f5eaee;
  --cargo: #626b46;
  --ink: #191b19;
}
.logo-mark { background: var(--brand); }
```

`--brand`는 여러 곳에서 재사용할 수 있는 CSS 변수입니다. `var(--brand)`는 그 색을 가져옵니다. `--brand-soft`는 안내 상자와 선택 표시의 연한 배경입니다. 기존 스타일의 일부 색상은 직접 지정되어 있으므로 전체 색상을 바꾸려면 관련 색상도 함께 확인하세요.

`--cargo`는 학습 상태와 보조 패널, `--ink`는 본문·제목에 사용합니다. 겹친 배너·입체 버튼·그림자·모바일 배치의 설명은 [디자인 코드 안내](DESIGN_GUIDE.md)를 참고하세요.

`@media(max-width:480px)` 안의 규칙은 작은 화면에 적용됩니다. 긴 주소가 화면 밖으로 나가지 않게 `.option>span`에 `min-width:0`과 `overflow-wrap:anywhere`를 사용합니다. 앞의 규칙은 글자 영역이 줄어들 수 있게 하고, 뒤의 규칙은 긴 주소도 줄바꿈할 수 있게 합니다.

## 3. JavaScript: 누르면 어떤 일이 일어날지

문서의 공통 클릭 처리기가 눌린 요소에서 `data-mission`을 찾습니다. 아래 코드는 해당 부분을 간단히 옮긴 것입니다.

```js
const button = event.target.closest('[data-mission]');
if (button) openMission(Number(button.dataset.mission));
```

버튼 안의 글이나 아이콘을 눌러도 `closest()`가 해당 버튼을 찾습니다. `dataset.mission`은 HTML의 `data-mission` 값을 읽고, `Number()`는 문자열 `"0"`을 숫자 `0`으로 바꿉니다. 실제 구현은 `+m.dataset.mission`으로 같은 변환을 합니다.

`openMission(0)`은 실습 데이터를 찾아 개요 상태로 바꾸고 창을 엽니다. 이어서 `renderLesson()`이 현재 상태에 맞는 HTML을 만듭니다.

```text
첫 실습 버튼
  → openMission(0)
  → renderLesson(): 개요
  → beginChallenge(): 실습 시작
  → renderLesson(): 문제
  → evaluateAnswer(): 답 확인
  → response(): 설명과 다음 버튼
  → completeMission(): 완료와 다음 추천
```

`phase`는 개요(`brief`), 문제(`challenge`), 완료(`result`)를 구별합니다. `step`은 현재 문제 단계이며 0부터 시작합니다. 사용자에게는 `step + 1`로 1부터 표시합니다.

## 4. 안내 데이터: 처음 배우는 사람에게 설명하기

`lessonGuides`는 27개 실습의 목표와 단계별 안내를 보관합니다.

```js
{
  goal: '긴 비밀번호와 추가 인증이 계정을 지키는 방법을 알아요.',
  steps: [
    '연습용 비밀번호를 입력하고 다섯 조건이 채워지는지 봐요. …',
    '선택지 하나를 누르고 정답을 확인해요. …'
  ]
}
```

`lessonOrientation()`은 시작 전에 전체 순서를 보여주고, `stepInstructions()`는 현재 단계에서 할 일을 보여줍니다. `beginnerNote()`는 분야별 기본 용어를 설명합니다. 안내를 수정할 때에는 단계 수와 실제 버튼 이름이 맞는지 함께 확인하세요.

`learningGroups`는 기초 15개, 규칙 실험 4개, 응용 원리 8개를 묶습니다. `learningOrder`는 비밀번호 → 피싱 → 게임 규칙을 먼저 권하고 이후 기초부터 이어가게 합니다. 모든 실습은 처음부터 자유롭게 선택할 수 있습니다.

`renderMissions()`는 검색어·분야·학습 단계에 맞는 실습만 남기고 순서대로 카드로 만듭니다. `nextLessonMarkup()`는 완료하지 않은 첫 실습을 추천합니다. 이 과정은 기존 `state.completed`를 읽으며 새로운 점수를 만들지 않습니다.

## 5. 서버: 공유 기록을 누가 확인할지

내 브라우저의 화면과 변수는 내가 바꿀 수 있습니다. 따라서 공유 랭킹에 올릴 정답과 점수는 서버가 검사합니다.

- `beginChallenge()`는 로그인 상태에서 `/api/attempts/start`에 새 실습을 요청합니다.
- `evaluateAnswer()`와 `submitAnswer()`는 현재 단계의 답을 `/api/attempts/:id/answer`로 보냅니다.
- `server/worker.mjs`는 로그인 세션, 실습 소유자, 단계, 정답과 보상 조건을 확인합니다.
- `server/rules.mjs`는 정답과 게임 기록 검증 규칙을 담습니다.
- 검증 후 돌아온 사용자 기록을 `applyPlayer()`가 화면에 반영합니다.

혼자 연습할 때에는 같은 공유 규칙을 브라우저에서 사용하고 기록을 `localStorage`에 보관합니다. 그 연습 점수를 공유 랭킹에 가져오지는 않습니다.

`migrations/0001_multiplayer.sql`은 계정·실습·친구 방 등을 저장할 표와 인덱스를 정의합니다. 화면 설명을 고치는 이번 작업에는 데이터베이스 구조 변경이 필요하지 않습니다.

## 6. 확인하고 배포하기

```bash
npm test
npm run build
npm run dev
```

테스트는 서버의 계정 분리·권한·정답·중복 보상·게임 기록 등을 확인합니다. 빌드는 `server/rules.mjs`의 공통 규칙을 HTML에 반영하고 배포할 Worker를 만듭니다. 공통 정답 규칙을 수정하려면 생성된 HTML의 규칙 복사본 대신 `server/rules.mjs`를 수정하고 빌드하세요.

화면은 브라우저에서 별도로 확인해야 합니다. 이번 작업에서는 1440·768·390·320px 화면의 27개 실습 개요와 첫 단계, 첫 세 실습 완료·오답 재시도·힌트·다음 추천, 계정 복구와 두 사용자 친구 방을 확인했습니다.

Cloudflare 본인 인증이 끝난 뒤 `npm run cloudflare:check`로 연결을 확인하고 `npm run deploy`를 실행하면 기존 D1 연결 확인, 빌드, 마이그레이션 확인 및 적용, Worker 배포가 진행됩니다. 임시 D1 ID·다른 계정·다른 Worker 이름은 업로드 전에 거부합니다. [Cloudflare 배포 안내](CLOUDFLARE_GUIDE.md)에서 주요 검사 코드와 오류 해결 순서를 배울 수 있습니다.

## 직접 해볼 작은 수정

먼저 첫 버튼의 글을 바꾸고 화면을 새로고침해보세요. 다음으로 `lessonGuides[0]`의 목표 문장을 바꿔 카드와 개요에서 어떻게 보이는지 확인하세요. 마지막으로 `stepInstructions()`의 안내 상자 간격을 바꿔 PC·모바일에서 비교해보세요. 정답이나 점수 규칙을 수정하기 전에는 서버 검증 흐름까지 읽어보는 것이 좋습니다.

## 힌트·비교·이어하기 코드 찾기

- `guidedHints` → `currentHints()` → `renderHint()`: 단계별 힌트 배열에서 현재 설명을 고르고 더 구체적인 힌트를 표시합니다.
- `updateCoach()`: 현재 단계와 입력 상태를 읽어 조작할 요소에 `coach-target` 클래스를 붙입니다. QR·사진·권한·SQL 코드 선택·로봇·암호·역분석·응용 시나리오에도 안내를 연결했습니다. 입력이 바뀌거나 비동기 실험이 끝나면 다시 계산합니다. 실제 정답 검사는 별도의 공유 규칙과 서버가 합니다.
- `comparisonMarkup()` → `stepComparison()`: 처음 상태·관찰한 결과·차이가 생긴 이유를 화면에 표시합니다.
- `saveStudyCheckpoint(nextStep)`: 다음에 풀어야 할 단계와 실습 ID·시드를 기억합니다. 혼자 연습일 때만 브라우저 저장소에 보관하며 입력값은 보관하지 않습니다.
- `refreshStudyProgress()` → `resumeStudy()`: 로그인한 계정의 최신 실습을 서버에 다시 확인하고 실제 저장된 단계부터 엽니다.
- `renderStudyDashboard()`: 이어갈 실습과 완료한 실습의 원리, 다음 목표를 메인 화면에 모읍니다.

자세한 설명은 [학습서의 실습 안내와 이어하기 장](LEARNING_GUIDE.md#13-실습-안내와-이어하기-코드를-읽기)에 있습니다.
