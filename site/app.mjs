// Additional chapters and views share the existing account and lesson lifecycle.
for(const chapter of ADVANCED_CHAPTERS){
  missions.push({id:chapter.id,cat:chapter.category,icon:'⌘',title:chapter.title,desc:chapter.goal,tag:'전문 웹 보안',time:8,xp:60,challenge:3,brief:chapter.goal,learn:chapter.defense,hint:chapter.steps[0]});
  lessonGuides[chapter.id]={goal:chapter.goal,steps:chapter.steps};shortTitles[chapter.id]=chapter.title;briefOneLine[chapter.id]=chapter.goal;
  caseGuides[chapter.id]=[chapter.cause,chapter.steps[0],'이 실습의 가상 서비스와 자료만 점검합니다.',chapter.defense];
}
learningGroups.push({id:'professional',label:'전문 챕터',description:'HTTP·SQL·권한·로그를 직접 분석합니다.',missions:ADVANCED_CHAPTERS.map(chapter=>chapter.id)});
learningOrder.push(...ADVANCED_CHAPTERS.map(chapter=>chapter.id));
$('#learning-level').append(new Option('전문 챕터','professional'));
celebrate=function(){};
let advancedEvidence=null,advancedSequence=0,activeRank=null,rankLessonId=null,rankViewSequence=0;

function advancedMarkup(){
  const spec=advancedSpec(mission.id,pendingAttempt?.seed||1);
  if(step===2)return setTitle('관찰한 원인에 맞는 방어 방법','수정 전·후의 결과를 바탕으로 선택합니다.')+choice(['화면의 버튼과 메뉴만 숨깁니다.',spec.defense,'브라우저가 보내는 역할·점수 값을 신뢰합니다.']);
  return setTitle(step===0?'요청을 바꾸고 응답을 관찰합니다.':'같은 요청을 수정한 서버 처리로 검증합니다.',spec.context)+`<section class="request-workbench"><header><span>REQUEST / HTTP 1.1</span><span>${online?'서버 실습':'오프라인 모형'}</span></header><label for="advanced-request">요청 원문</label><textarea id="advanced-request" class="field request-editor" maxlength="1800" spellcheck="false">${escapeHtml(step===0?spec.normal:spec.exploit)}</textarea><div class="request-actions"><button class="btn secondary" id="advanced-normal">정상 요청</button><button class="btn secondary" id="advanced-example">실습 입력</button></div>${step===1?`<label for="advanced-patch">서버 처리</label><select class="field" id="advanced-patch"><option value="none">수정 없음</option><option value="cosmetic">화면만 변경</option><option value="${spec.patch}">${escapeHtml(spec.patchLabel)}</option></select>`:''}<button class="btn" id="advanced-run">요청 실행</button><div class="request-response" id="advanced-result" role="status" aria-live="polite">요청을 실행하면 상태 코드·응답 본문·처리 기록이 표시됩니다.</div><p class="workbench-note">lab.local은 실습 표시용 주소입니다. 요청 원문을 사이트 서버가 제한된 동작으로 처리하며, 외부 주소로 전송하지 않습니다.</p><a href="/glossary/${spec.term}" target="_blank" rel="noopener">관련 용어 읽기</a> · <a href="/chapters/${spec.slug}" target="_blank" rel="noopener">챕터 설명</a></section>`;
}
function wireAdvanced(){
  if(step===2)return;advancedEvidence=null;const generation=lessonGeneration,currentStep=step;
  const invalidate=()=>{advancedSequence++;advancedEvidence=null;$('#advanced-run').disabled=false;$('#advanced-result').textContent='입력이 변경됐습니다. 다시 실행해 주세요.';updateCoach();};
  $('#advanced-request').oninput=invalidate;
  if($('#advanced-patch'))$('#advanced-patch').onchange=invalidate;
  for(const [id,key] of [['advanced-normal','normal'],['advanced-example','exploit']])$('#'+id).onclick=()=>{$('#advanced-request').value=advancedSpec(mission.id,pendingAttempt?.seed||1)[key];invalidate();};
  $('#advanced-run').onclick=async()=>{
    const sequence=++advancedSequence,request=$('#advanced-request').value,patch=$('#advanced-patch')?.value||'none',id=mission.id;
    advancedEvidence=null;$('#advanced-run').disabled=true;
    try{
      const result=online?await api('/api/labs/advanced',{attemptId:pendingAttempt.id,request,patch}):advancedLab(id,pendingAttempt?.seed||1,request,patch);
      if(generation!==lessonGeneration||currentStep!==step||sequence!==advancedSequence)return;
      if(!result)throw new Error('lab.local의 제공된 요청 형식을 확인해 주세요.');
      advancedEvidence={request,patch,...(result.evidenceId?{evidenceId:result.evidenceId}:{})};
      $('#advanced-result').innerHTML=`<div class="http-status"><strong>${result.status}</strong><span>${result.blocked?'수정한 처리가 요청을 제한했습니다.':result.exposed?'실습의 빈틈이 재현됐습니다.':'정상 처리 또는 접근 거부 결과입니다.'}</span></div><h3>응답 본문</h3><pre>${escapeHtml(result.data)}</pre><h3>처리 기록</h3><ol>${result.trace.map(line=>`<li>${escapeHtml(line)}</li>`).join('')}</ol><small>${online?'서버가 실행 증거를 기록했습니다.':'브라우저에서 원리 모형을 실행했습니다. 랭크 점수로 저장하지 않습니다.'}</small>`;
    }catch(error){if(generation===lessonGeneration&&currentStep===step&&sequence===advancedSequence)$('#advanced-result').textContent=error.message;}
    finally{if(generation===lessonGeneration&&currentStep===step&&sequence===advancedSequence&&$('#advanced-run')){$('#advanced-run').disabled=false;updateCoach();}}
  };
}
const traceExtraMarkup=extraChallengeMarkup;extraChallengeMarkup=function(id){return id>=27?advancedMarkup():traceExtraMarkup(id);};
const traceWireExtra=wireExtraChallenge;wireExtraChallenge=function(id){if(id>=27)wireAdvanced();else traceWireExtra(id);};
const traceAnswerReady=answerReady;answerReady=function(){if(mission.id>=27&&step<2){if(!advancedEvidence){toast('요청 실행 결과를 먼저 확인해 주세요.');return false;}return true;}return traceAnswerReady();};
const traceCurrentAnswer=currentAnswer;currentAnswer=function(){return mission.id>=27&&step<2?advancedEvidence:traceCurrentAnswer();};
const traceExtraExplanation=extraExplanation;extraExplanation=function(id){return id>=27?(step===0?'입력과 결과를 확인했습니다. 같은 요청에 방어 처리를 적용해 보세요.':ADVANCED_CHAPTERS.find(chapter=>chapter.id===id).defense):traceExtraExplanation(id);};
const traceUpdateCoach=updateCoach;updateCoach=function(){
  if(phase==='challenge'&&mission.id>=27&&step<2&&!passed&&state.hearts){const modal=$('.modal');modal.querySelectorAll('.coach-target').forEach(el=>el.classList.remove('coach-target'));const selector=advancedEvidence?'#check':step===1&&$('#advanced-patch')?.value!==advancedSpec(mission.id,pendingAttempt?.seed||1).patch?'#advanced-patch':'#advanced-run';$(selector)?.classList.add('coach-target');return;}
  traceUpdateCoach();
};
const traceHints=currentHints;currentHints=function(){return mission.id>=27&&step<2?['정상 요청의 메서드·경로·헤더와 응답을 먼저 읽어 보세요.',step===0?'실습 입력을 넣고 다시 실행해 결과를 비교합니다.':'서버의 방어 처리를 선택하고 같은 요청을 다시 보냅니다.',step===0?'빈틈 재현 결과가 확인되면 실행 증거를 제출하세요.':'차단 또는 안전한 검색 결과를 확인하고 실행 증거를 제출하세요.']:traceHints();};
const traceResponse=response;response=function(ok,text){traceResponse(ok,text);if(ok&&mission.id>=27&&step<2){for(const id of ['advanced-request','advanced-patch','advanced-run','advanced-normal','advanced-example'])if($('#'+id))$('#'+id).disabled=true;}};

let glossaryQuery='',glossaryCategory='all';
function renderGlossary(){
  const target=$('#glossary-results');if(!target)return;
  const terms=GLOSSARY.filter(term=>(glossaryCategory==='all'||term.category===glossaryCategory)&&[term.term,term.english,term.definition,term.example].join(' ').toLowerCase().includes(glossaryQuery));
  $('#glossary-count').textContent=terms.length+'개 용어';
  target.innerHTML=terms.length?terms.map(term=>`<article class="glossary-entry"><header><h2><a href="/glossary/${term.slug}">${escapeHtml(term.term)}</a></h2><span>${escapeHtml(term.english)}</span></header><p>${escapeHtml(term.definition)}</p><div><strong>쉽게 생각하면</strong><p>${escapeHtml(term.analogy)}</p></div><div class="glossary-example"><strong>예시</strong><p>${escapeHtml(term.example)}</p></div></article>`).join(''):'<p class="catalog-empty">일치하는 용어가 없습니다. 한글 이름이나 영문 이름으로 검색해 보세요.</p>';
}
const dictionary=document.createElement('section');dictionary.className='glossary-browser';dictionary.innerHTML=`<div class="dictionary-toolbar"><label>용어 검색<input id="glossary-search" class="field" type="search" placeholder="예: 세션, 권한, SQL" autocomplete="off"></label><label>분야<select class="field" id="glossary-category"><option value="all">전체 용어</option>${Object.entries(GLOSSARY_CATEGORIES).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><span id="glossary-count" role="status"></span></div><div id="glossary-results"></div>`;
$('#techniques').append(dictionary);$('#glossary-search').oninput=event=>{glossaryQuery=event.target.value.trim().toLowerCase();renderGlossary();};$('#glossary-category').onchange=event=>{glossaryCategory=event.target.value;renderGlossary();};
openTechnique=function(id){closeMission();showView('techniques');glossaryQuery=({reverse:'리버스',tamper:'클라이언트',brute:'무차별',stuffing:'스터핑',supply:'공급망',traversal:'경로'}[id]||id).toLowerCase();$('#glossary-search').value=glossaryQuery;renderGlossary();$('#glossary-search').focus();};

const rankPanel=document.createElement('section');rankPanel.id='rank-mode';rankPanel.className='rank-mode';$('#league').insertBefore(rankPanel,$('#league .filters'));
function rankRunMarkup(run){
  if(!online)return '<h2>서버가 채점하는 하루 도전</h2><p>닉네임으로 로그인한 뒤 세 문제를 완료하면 랭크 점수가 저장됩니다. 혼자 연습 기록은 랭크에 포함되지 않습니다.</p><button class="btn" id="rank-signin">로그인하고 시작</button>';
  if(!run)return '<h2>오늘의 랭크 도전</h2><p>무작위 세 문제 · 제한 시간 30분 · 최대 900점. 오답마다 25점이 차감됩니다. 속도는 동점일 때만 사용합니다. 하루 한 번(UTC 기준) 기록할 수 있습니다.</p><button class="btn" id="rank-start">랭크 도전 시작</button>';
  if(run.status==='complete')return `<h2>오늘의 도전 완료</h2><div class="rank-score">${run.score}<small> / 900 · ${run.tier}</small></div><p>세 문제 완료 · 오답 ${run.mistakes}회. 순위는 서버에 저장한 완료 기록으로 계산합니다.</p><a href="/chapters">다음 학습 살펴보기</a>`;
  if(run.status==='expired')return '<h2>오늘의 도전 시간이 끝났습니다.</h2><p>완료하지 않은 도전은 순위에 올리지 않습니다. 일반 실습은 계속 연습할 수 있고, 다음 UTC 날짜에 새 랭크 도전이 열립니다.</p>';
  return `<h2>진행 중인 도전 · ${run.position+1} / 3</h2><p>${escapeHtml(missions.find(item=>item.id===run.missionIds[run.position]).title)}</p><p>오답 ${run.mistakes}회 · 종료 ${new Date(run.expiresAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</p><button class="btn" id="rank-continue">현재 문제 이어서 풀기</button>`;
}
async function refreshRankMode(){
  const sequence=++rankViewSequence;
  try{const data=online?await api('/api/rank/current'):null;if(sequence!==rankViewSequence)return;activeRank=data?.run||null;rankPanel.innerHTML=rankRunMarkup(activeRank);wireRankPanel();}catch(error){if(sequence===rankViewSequence)rankPanel.textContent=error.message;}
}
function wireRankPanel(){
  if($('#rank-signin'))$('#rank-signin').onclick=()=>{showView('squad');$('#nickname')?.focus();};
  if($('#rank-start'))$('#rank-start').onclick=async()=>{const button=$('#rank-start');button.disabled=true;try{const data=await api('/api/rank/start',{});activeRank=data.run;await refreshRankMode();launchRankLesson();}catch(error){toast(error.message);if(button.isConnected)button.disabled=false;}};
  if($('#rank-continue'))$('#rank-continue').onclick=launchRankLesson;
}
function launchRankLesson(){if(!activeRank||activeRank.status!=='active')return;traceOpenMission(activeRank.missionIds[activeRank.position]);rankLessonId=activeRank.id;}
const traceOpenMission=openMission;openMission=function(id){rankLessonId=null;traceOpenMission(id);};
const traceCloseMission=closeMission;closeMission=function(){traceCloseMission();rankLessonId=null;};
const traceIsRoom=isRoomLesson;isRoomLesson=function(){return !!rankLessonId||traceIsRoom();};
const traceBeginChallenge=beginChallenge;beginChallenge=async function(){
  if(!rankLessonId)return traceBeginChallenge();
  const generation=lessonGeneration;submitting=true;$('#check').disabled=true;
  try{const data=await api('/api/attempts/start',{missionId:mission.id,rankRunId:rankLessonId});if(generation!==lessonGeneration)return;pendingAttempt=data.attempt;phase='challenge';step=data.attempt.step;renderLesson();}
  catch(error){toast(error.message);}finally{submitting=false;$('#check').disabled=false;}
};
const traceSubmitAnswer=submitAnswer;submitAnswer=async function(answer){const result=await traceSubmitAnswer(answer);if(result?.rank)activeRank=result.rank;return result;};
const traceNextLesson=nextLessonMarkup;nextLessonMarkup=function(){return rankLessonId?`<section class="next-lesson"><strong>${activeRank?.status==='complete'?'세 문제를 모두 완료했습니다.':'다음 랭크 문제로 이동합니다.'}</strong><button class="btn" data-rank-next>${activeRank?.status==='complete'?'랭크 결과 보기':'다음 랭크 문제'}</button></section>`:traceNextLesson();};
document.addEventListener('click',async event=>{if(!event.target.closest('[data-rank-next]'))return;closeMission();showView('league');await refreshRankMode();await refreshLeaderboard();if(activeRank?.status==='active')launchRankLesson();});
const traceRankMarkup=rankMarkup;rankMarkup=function(row,index){return row.score!==undefined?`<div class="rank-row ${row.mine?'mine':''}"><span class="rank-index">${row.rank||index+1}</span><strong>${escapeHtml(row.name)}${row.mine?' · 나':''}</strong><span class="rank-tier">${row.tier}</span><span>${row.score}점</span></div>`:traceRankMarkup(row,index);};
refreshLeaderboard=async function(){if(networkStatus!=='ready')return;try{const data=await api('/api/rank/leaderboard?scope='+boardScope);liveRows=data.rows;$('#board-status').textContent=`${boardScope==='weekly'?'최근 7일':'전체 기간'} · 완료한 참가자 ${data.participants}명 · 서버 기록 기준`;renderStats();}catch(error){$('#board-status').textContent=error.message;}};
const traceShowView=showView;showView=function(id){traceShowView(id);if(id==='league'){refreshRankMode();refreshLeaderboard();}};
const traceApplyPlayer=applyPlayer;applyPlayer=function(player){traceApplyPlayer(player);if(appView==='league')refreshRankMode();};
renderGlossary();renderStats();refreshRankMode();
if(location.pathname==='/rank')showView('league');
if(location.pathname==='/learn'){const id=Number(new URLSearchParams(location.search).get('mission'));if(missions.some(item=>item.id===id))openMission(id);}
