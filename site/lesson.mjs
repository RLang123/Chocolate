// A quiet, single-task lesson. The existing validators and account lifecycle own all results.
(()=>{
  const modal=$('.modal'),body=$('#lesson-body'),feedback=$('#feedback'),check=$('#check');
  modal.classList.add('lesson-player');
  const dock=document.createElement('div');dock.className='lesson-dock';dock.append(feedback,$('.lesson-footer'));modal.append(dock);
  const keyboard=document.createElement('span');keyboard.className='lesson-keyboard';keyboard.textContent='Enter ↵';check.after(keyboard);
  const progress=$('.modal-progress .bar');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','실습 진행');progress.setAttribute('aria-valuemin','0');
  let observers=[],lastFrame='',syncing=false;
  const buddy=(className='')=>'<svg class="lesson-buddy '+className+'" viewBox="0 0 200 180" aria-hidden="true"><use href="#byte-squirrel"/></svg>';
  const tick='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const titles={
    0:['튼튼한 비밀번호를 만들어 보세요','계정을 한 번 더 지키려면?'],
    1:['보낸 사람의 주소를 확인해 보세요','서두르게 만드는 말을 찾아보세요','링크의 진짜 목적지를 확인해 보세요'],
    2:['위험한 코드와 안전한 수정을 고르세요','글을 안전하게 보여주는 방법은?'],
    3:['빨간 패킷 8개를 막아보세요'],
    4:['수상한 방문 기록을 찾아보세요','비밀번호를 이미 입력했다면?'],
    5:['QR 뒤에 숨은 주소를 확인해 보세요','이 주소가 학교 사이트일까요?'],
    6:['어떤 Wi-Fi에 연결할까요?','안전하게 연결하는 방법은?'],
    7:['인증 번호를 알려줘도 될까요?','두 번째 자물쇠를 골라보세요'],
    8:['사진에서 개인정보를 가려보세요','사진을 올리기 전에 확인할 것은?'],
    9:['파일이 잠겼어요. 먼저 할 일은?','어떤 백업으로 복구할까요?'],
    10:['손전등에 필요 없는 권한을 꺼보세요','앱에 권한을 줄 때는?'],
    11:['아는 사람의 목소리, 믿어도 될까요?','다른 방법으로 확인하려면?'],
    12:['먹이가 생기는 규칙을 바꿔보세요','점수 조작을 막는 방법을 골라보세요','서버는 어떤 기록을 확인해야 할까요?'],
    13:['게임의 점수와 방어를 바꿔보세요','공유 점수는 누가 확인해야 할까요?'],
    14:['숨겨진 문자를 풀어보세요','진짜 비밀을 지키려면?'],
    15:['파일 이름의 끝을 살펴보세요','업데이트는 어디에서 받을까요?'],
    16:['수상한 앱을 찾아보세요','앱을 확인할 때 필요한 단서는?'],
    17:['안전해 보이는 주소, 진짜일까요?','자물쇠가 보장하는 것은?'],
    18:['주인을 모르는 USB를 발견했다면?','안전한 행동을 골라보세요'],
    19:['로봇을 안전하게 목적지로 보내세요'],
    20:['코드의 규칙을 찾아 문을 열어보세요','이 규칙으로 배운 것은?'],
    21:['다른 사람의 문서가 보일까요?','문서의 소유자를 확인해 보세요','안전한 권한 검사는?'],
    22:['낯선 사이트의 요청도 통과할까요?','요청이 온 곳을 확인해 보세요','낯선 요청을 막는 방법은?'],
    23:['서버가 내부 주소도 가져올까요?','허용한 목적지만 연결해 보세요','안전한 주소 검사는?'],
    24:['비밀번호만 알면 들어갈 수 있을까요?','추가 인증을 적용해 보세요','계정을 함께 지키는 방법은?'],
    25:['폴더 밖의 파일도 열릴까요?','파일 경로의 경계를 확인해 보세요','안전한 파일 검사는?'],
    26:['비슷한 이름의 패키지를 믿어도 될까요?','이름과 체크섬을 검증해 보세요','안전한 설치 방법은?'],
    27:['다른 사람의 문서가 보일까요?','서버에서 소유자를 검사해 보세요','문서 권한을 지키는 방법은?'],
    28:['검색어가 SQL 명령이 되면?','검색어를 값으로 분리해 보세요','입력을 안전하게 처리하려면?'],
    29:['역할 헤더를 바꾸면 어떻게 될까요?','역할은 서버에서 확인해 보세요','누가 권한을 결정해야 할까요?'],
    30:['로그인 요청을 반복하면?','반복 요청에 제한을 적용해 보세요','로그인 시도를 보호하려면?']
  };
  const introSteps={0:['연습용 비밀번호 만들기','추가 보호 방법 고르기'],1:['발신 주소 조사하기','재촉하는 말 찾기','실제 링크 확인하기'],2:['SQL 검색 코드 고치기','게시글 표시 코드 고치기'],3:['빨간 공격 패킷 막기'],4:['수상한 기록 찾기','계정 보호 방법 고르기'],5:['QR 목적지 확인하기','공식 주소와 비교하기'],6:['Wi-Fi 정보 비교하기','안전한 연결 고르기'],7:['인증 번호 요청 판단하기','추가 인증 방법 고르기'],8:['사진 속 개인정보 가리기','공유 범위 확인하기'],9:['첫 대응 고르기','안전한 백업 찾기'],10:['불필요한 앱 권한 끄기','최소 권한 이해하기'],11:['사칭 메시지 판단하기','다른 연락처로 확인하기'],12:['먹이 함수 바꾸기','서버 검증 적용하기','허용된 실습 범위 확인하기'],13:['점수와 방어 바꾸기','서버 판정 비교하기'],14:['암호문 풀기','안전한 암호화 이해하기'],15:['파일 확장자 확인하기','공식 다운로드 고르기'],16:['수상한 앱 찾기','조사에 필요한 단서 고르기'],17:['사이트 주소 비교하기','HTTPS의 역할 이해하기'],18:['USB를 발견했을 때 판단하기','안전한 행동 고르기'],19:['안전한 이동 명령 만들기'],20:['명령의 규칙 추론하기','검증 방법 확인하기']};
  function disclosure(label,nodes,className=''){
    const details=document.createElement('details');details.className='lesson-details '+className;
    const summary=document.createElement('summary');summary.textContent=label;details.append(summary,...nodes.filter(Boolean));return details;
  }
  function shortSentence(text){return text.match(/^.*?[.!?](?:\s|$)/u)?.[0].trim()||text;}
  function ready(){
    if(phase!=='challenge'||passed||!state.hearts)return true;
    const id=mission.id;
    if(id>=27&&step<2)return !!advancedEvidence;
    if(id>=21&&step<2)return !!scenarioEvidence;
    if(id===0&&step===0)return !!$('#password')?.value.trim();
    if(id===2)return selection!==null&&$('.terminal')?.dataset.line!==undefined;
    if(id===3||id===12&&step===0)return true;
    if(id===12&&step===1)return probeTested;
    if(id===13&&step===0)return builderTested;
    if(id===14&&step===0)return !!$('#cipher-answer')?.value.trim();
    if(id===19)return robotTested;
    if(id===20&&step===0)return reverseTested;
    if(id===8&&step===0)return !!selection?.size;
    if(id===10&&step===0)return !!selection;
    return selection!==null;
  }
  function sync(){
    if(syncing||!mission||!$('#overlay').classList.contains('open'))return;syncing=true;
    try{
      const playing=phase==='challenge'&&(mission.id===3&&game&&!game.ended||mission.id===12&&step===0&&snakeTimer>0&&!snake?.ended);
      const disabled=!!(submitting||playing||!ready());if(check.disabled!==disabled)check.disabled=disabled;
      check.setAttribute('aria-busy',String(submitting));
      const label=submitting?'확인 중…':!state.hearts&&phase==='challenge'?'하트 무료 회복':phase==='brief'?'시작하기':phase==='result'?(rankLessonId?'도전 계속하기':$('.next-lesson [data-mission]')?'다음 실습':'학습으로 돌아가기'):passed?(step+1>=mission.challenge?'실습 마치기':'계속하기'):mission.id===3?'게임 시작':mission.id===12&&step===0&&!snakeLabAnswer?'게임 실행':'확인하기';
      if(check.textContent!==label)check.textContent=label;
      const done=phase==='result'?mission.challenge:phase==='brief'?0:Math.min(mission.challenge,step+(passed?1:0));
      progress.setAttribute('aria-valuemax',String(mission.challenge));progress.setAttribute('aria-valuenow',String(done));progress.setAttribute('aria-valuetext',done+' / '+mission.challenge+'단계 완료');
      $('#lesson-progress').style.width=done/mission.challenge*100+'%';
      $('#step-label').textContent=shortTitles[mission.id]+' · '+(phase==='brief'?'시작 전':phase==='result'?'완료':Math.min(step+1,mission.challenge)+' / '+mission.challenge);
      $('#footer-label').textContent=submitting?'서버에서 확인하고 있어요':phase==='brief'?'한 단계씩 해보면 돼요':phase==='result'?'오늘도 한 걸음 더 배웠어요':passed?'준비되면 계속해요':disabled?'답을 고르거나 직접 해보세요':'선택한 답을 확인해 볼까요?';
      $('#hint').textContent='힌트 보기';
      for(const option of body.querySelectorAll('[data-option]')){
        option.classList.toggle('lesson-selected',option.classList.contains('selected'));
        option.setAttribute('aria-disabled',String(passed));
      }
    }finally{syncing=false;}
  }
  function simplifyOutput(output){
    for(const list of output.querySelectorAll('ol')){
      if(list.closest('details'))continue;
      const heading=list.previousElementSibling;
      if(heading?.matches('h3'))heading.remove();
      const details=disclosure('처리 과정 보기',[],'lesson-trace');list.before(details);details.append(list);
    }
    sync();
  }
  function decorate(){
    for(const observer of observers)observer.disconnect();observers=[];
    dock.removeAttribute('data-feedback');modal.dataset.lessonPhase=phase;
    // Cancel the old console entrance and scan; only the active question moves now.
    for(const animation of labMotionAnimations)if(modal.contains(animation.effect?.target)){animation.cancel();labMotionAnimations.delete(animation);}
    body.querySelectorAll('.investigation-beam').forEach(node=>node.remove());
    if(phase==='brief'){
      const oldTitle=$('#lesson-title');oldTitle?.removeAttribute('id');
      const subtitle=oldTitle?.nextElementSibling?.matches('p')?oldTitle.nextElementSibling:null;
      const original=[...body.children].filter(node=>node!==oldTitle&&node!==subtitle&&!node.matches('.eyebrow,.mission-facts')),intro=document.createElement('section');intro.className='lesson-intro';
      intro.innerHTML=buddy('lesson-buddy-intro')+'<span class="lesson-overline">이번에 배울 것</span><h2 id="lesson-title" tabindex="-1">'+escapeHtml(shortTitles[mission.id])+'</h2><p>'+escapeHtml(lessonGuides[mission.id].goal)+'</p><div class="lesson-intro-facts"><span>'+mission.challenge+'단계</span><span>약 '+mission.time+'분</span><span>+'+mission.xp+' XP</span></div><ol class="lesson-mini-steps">'+lessonGuides[mission.id].steps.map((text,index)=>'<li><b>'+(index+1)+'</b><span>'+escapeHtml(introSteps[mission.id]?.[index]||(index===0?'빈틈을 직접 확인해요':index===1?'방어 방법을 적용해요':'배운 내용을 골라요'))+'</span></li>').join('')+'</ol>';
      const details=disclosure('처음이라면, 배경 설명 읽기',original,'lesson-background');body.replaceChildren(intro,details);
      const note=document.createElement('p');note.className='lesson-save-note';note.textContent=online?'이 계정에 학습 기록을 저장해요':'혼자 연습 · 기록은 이 브라우저에 저장해요';intro.append(note);
    }else if(phase==='challenge'){
      const guide=body.querySelector('.lab-guide'),stage=body.querySelector('.lab-stage');
      if(!stage)return;
      const title=$('#lesson-title'),context=title?.nextElementSibling?.matches('p')?title.nextElementSibling:null;
      const question=document.createElement('header');question.className='lesson-question';
      const text=document.createElement('div');text.className='lesson-question-copy';
      const overline=document.createElement('span');overline.className='lesson-overline';overline.textContent=mission.id>=21?(step===0?'직접 해보기':step===1?'방어하기':'확인 문제'):'직접 해보기';
      if(title){title.textContent=titles[mission.id]?.[step]||(step===2?'가장 안전한 방법을 골라보세요':step===0?'입력을 바꾸고 결과를 확인해 보세요':'같은 요청에 방어를 적용해 보세요');title.tabIndex=-1;}
      question.innerHTML=buddy();text.append(overline,...[title,context].filter(Boolean));question.append(text);stage.prepend(question);
      const explanation=guide?.querySelector('.step-instructions p'),pill=guide?.querySelector('.tech-pill');
      if(explanation||pill){const details=disclosure('문제 설명과 용어 보기',[explanation,pill]);question.after(details);}
      guide?.remove();
      for(const [index,option] of [...stage.querySelectorAll('.option')].entries()){
        const letter=option.querySelector('.letter');if(letter){letter.textContent=String(index+1);letter.setAttribute('aria-hidden','true');}
        const mark=document.createElement('span');mark.className='lesson-choice-mark';mark.innerHTML=tick;mark.setAttribute('aria-hidden','true');option.append(mark);
      }
      for(const panel of stage.querySelectorAll('.patch-comparison'))panel.open=false;
      const code=stage.querySelector('.scenario-code');if(code&&!code.hidden){const details=disclosure('처리 코드 보기',[]);code.before(details);details.append(code);}
      for(const output of stage.querySelectorAll('.request-response,.scenario-result,.sql-output,.reverse-output')){
        simplifyOutput(output);const observer=new MutationObserver(()=>simplifyOutput(output));observer.observe(output,{childList:true,subtree:true});observers.push(observer);
      }
      for(const button of stage.querySelectorAll('#advanced-run,#scenario-run,#builder-run,#robot-run,#sql-unsafe,#sql-safe')){
        const handler=button.onclick;if(!handler)continue;const label=button.textContent;
        button.onclick=async function(event){button.textContent='실행 중…';try{return await handler.call(this,event);}finally{if(button.isConnected)button.textContent=label;sync();}};
      }
      body.scrollTop=0;
    }else if(phase==='result'){
      const result=body.querySelector(':scope>div'),next=body.querySelector('.next-lesson');
      if(result){result.classList.add('lesson-result');result.removeAttribute('style');result.querySelector('h2')?.setAttribute('tabindex','-1');}
      const extras=[...body.children].filter(node=>node!==result&&node!==next);
      if(extras.length)body.append(disclosure('배운 내용 다시 보기',extras,'lesson-background'));
    }
    sync();
    const frame=lessonGeneration+':'+phase+':'+step;
    if(frame!==lastFrame){lastFrame=frame;labAnimate(body.querySelector('.lesson-question,.lesson-intro,.lesson-result'),[{opacity:.4,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220});
      requestAnimationFrame(()=>{if($('#overlay').classList.contains('open'))$('#lesson-title')?.focus({preventScroll:true});});
    }
  }
  const originalRender=renderLesson;renderLesson=function(){originalRender();decorate();};
  const originalCoach=updateCoach;updateCoach=function(){originalCoach();sync();};
  const originalResponse=response;response=function(ok,text){
    const wasPassed=passed;originalResponse(ok,text);if(wasPassed)return;
    const firstText=[...feedback.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').replace(/^(확인 완료|다시 확인)\s*·\s*/u,'');
    const short=shortSentence(firstText),heading=document.createElement('div');heading.className='lesson-feedback-copy';
    heading.innerHTML='<strong>'+(ok?'잘했어요!':'다시 해볼까요?')+'</strong><p>'+escapeHtml(short)+'</p>';
    const icon=document.createElement('span');icon.className='lesson-feedback-icon';icon.innerHTML=ok?tick:'<span aria-hidden="true">↻</span>';
    const rest=document.createElement('div');rest.className='lesson-feedback-extra';
    if(firstText!==short){const paragraph=document.createElement('p');paragraph.textContent=firstText.slice(short.length).trim();rest.append(paragraph);}
    for(const node of [...feedback.children])if(node!==heading&&node!==icon)rest.append(node);
    feedback.replaceChildren(icon,heading);if(rest.childNodes.length)heading.append(disclosure('이유 더 알아보기',[rest]));
    dock.dataset.feedback=ok?'correct':'retry';
    const selected=body.querySelector('.option.selected,.backup-choice.selected');if(selected)selected.classList.add(ok?'lesson-correct':'lesson-retry');
    labAnimate(icon,ok?[{transform:'scale(.6) rotate(-12deg)'},{transform:'scale(1.1) rotate(4deg)',offset:.7},{transform:'scale(1)'}]:[{transform:'translateX(-3px)'},{transform:'translateX(3px)',offset:.5},{transform:'translateX(0)'}],{duration:300});
    if(ok)labAnimate(body.querySelector('.lesson-question .lesson-buddy'),[{transform:'translateY(0) rotate(0)'},{transform:'translateY(-5px) rotate(-4deg)',offset:.5},{transform:'translateY(0) rotate(0)'}],{duration:360});
    selected?.scrollIntoView({block:'nearest',behavior:labMotionPreference.matches?'instant':'smooth'});
    sync();
  };
  const originalCheck=check.onclick;check.onclick=async function(event){
    if(submitting||check.disabled)return;
    if(phase==='result'){const next=body.querySelector('.next-lesson [data-rank-next],.next-lesson [data-mission]');if(next){next.click();return;}}
    try{await originalCheck.call(this,event);}finally{sync();}
  };
  function edited(event){
    if(!modal.contains(event.target)||phase!=='challenge')return;
    if(!passed&&event.target.closest('input,textarea,select,[data-option],.inspect,[data-history],[data-line]')){
      dock.removeAttribute('data-feedback');feedback.className='feedback';body.querySelectorAll('.lesson-retry').forEach(node=>node.classList.remove('lesson-retry'));
    }
    sync();
    const selected=event.target.closest('[data-option]');if(selected&&!passed)labAnimate(selected,[{transform:'translateY(2px)'},{transform:'translateY(0)'}],{duration:150});
  }
  for(const event of ['click','input','change'])modal.addEventListener(event,edited);
  new MutationObserver(sync).observe(check,{attributes:true,attributeFilter:['disabled']});
  const originalClose=closeMission;closeMission=function(){for(const observer of observers)observer.disconnect();observers=[];originalClose();};
  document.addEventListener('keydown',event=>{
    if(!$('#overlay').classList.contains('open')||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(phase==='challenge'&&!passed&&mission.id!==3&&mission.id!==12&&/^[1-9]$/.test(event.key)){
      const options=[...body.querySelectorAll('[data-option]')].filter(node=>node.getClientRects().length);const option=options[Number(event.key)-1];if(option){event.preventDefault();option.click();}
    }else if(event.key==='Enter'&&!event.target.closest('button,a,summary')&&!check.disabled){event.preventDefault();check.click();}
  });
  if($('#overlay').classList.contains('open'))decorate();
})();
