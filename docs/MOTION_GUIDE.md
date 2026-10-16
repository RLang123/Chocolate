# 실습 화면과 움직임 배우기

현재 실습 화면은 밝은 전체 화면에 질문 하나와 큰 답안, 하단 확인 버튼을 보여줍니다. 예전의 어두운 프레임과 좌우 안내는 `site/lesson.mjs`와 `site/lesson.css`에서 단순화했습니다. 최신 화면 분석은 [문제 UI 안내](LESSON_UI_GUIDE.md)를 읽어 주세요. 아래의 공통 애니메이션 함수와 실행 상태 연결은 계속 사용합니다.

## 어디를 수정할까?

- [`site/motion.css`](../site/motion.css): 색상, 배치, 마우스 반응, 실행 중 표시.
- [`site/motion.mjs`](../site/motion.mjs): 실습 화면 구성, 단계 전환, 실제 결과가 도착했을 때의 움직임.
- [`scripts/build.mjs`](../scripts/build.mjs): 두 파일을 `index.html`과 배포 파일에 넣습니다. 수정 후 `npm run build`를 실행하세요.

`index.html`의 `TRACE_MOTION`과 `TRACE_APP` 안은 빌드가 생성합니다. 그 안을 직접 수정하면 다음 빌드에서 덮어씁니다.

## 1. CSS transition: 상태 사이를 연결하기

```css
.bar-fill { transition: width 420ms cubic-bezier(.22,.8,.28,1); }
```

진행 막대의 너비가 바뀔 때 420밀리초에 걸쳐 이어집니다. `cubic-bezier`는 빠르게 출발하고 부드럽게 멈추는 속도 곡선입니다. 점수 숫자는 실제 값을 즉시 보여주고 짧은 색상 반응만 줍니다.

## 2. Web Animations API: 한 번의 행동에 반응하기

```js
labAnimate(element, [
  { opacity: .25, transform: 'translateY(9px)' },
  { opacity: 1, transform: 'translateY(0)' }
]);
```

`element`를 약간 아래에서 제자리로 옮깁니다. 단계가 바뀌거나 결과가 도착했을 때 한 번 실행합니다. 반복 조회나 글자 입력마다 화면 전체를 움직이지 않습니다. 애니메이션이 끝나면 일반 스타일로 돌아가므로 내용이 숨겨진 상태로 남지 않습니다.

## 3. 실제 실행 상태와 연결하기

`labWireExecutions()`는 원래 실행 함수를 호출하고 그 Promise를 기다립니다. 실행하는 동안만 `is-running`과 `aria-busy`를 적용하고, 결과가 바뀌었을 때 응답을 짧게 강조합니다. 연출을 위해 응답을 지연하거나 가짜 처리 기록을 만들지 않습니다.

`lessonGeneration`과 `labRenderEpoch`는 늦게 도착한 응답이 다른 문제나 다음 단계의 화면 효과에 영향을 주는 것을 막습니다. 정답 판정과 랭크 점수는 기존 서버 코드가 담당합니다.

## 4. 접근성과 집중

운영체제의 ‘움직임 줄이기’를 감지하는 `prefers-reduced-motion`을 CSS와 JavaScript에서 함께 사용합니다. 설정을 바꾸면 진행 중인 움직임도 취소합니다. 내용·진행 상태·선택 테두리는 그대로 볼 수 있습니다.

먼저 브라우저 개발자 도구에서 CSS의 `padding`, `border`, `grid-template-columns`를 바꿔 보세요. 그 다음 애니메이션의 이동 거리와 시간을 작게 조절하며 읽기 편한지 비교하세요. 긴 설명을 읽는 동안에는 움직임을 멈추는 것이 기준입니다.
