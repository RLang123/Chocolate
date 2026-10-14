// Identity is a server account. Curated words are its permanent public label.
(()=>{
  const pendingKey='tracelab-registration-pending',answerKey='tracelab-answer-pending';
  const read=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
  const write=(key,value)=>{try{if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}catch{}};
  const pendingRegistration=()=>{const value=read(pendingKey);if(!value)return null;try{composedName(value);if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.registrationId)||!/^HL-[A-F0-9]{24}$/i.test(value.recoveryCode))throw new Error();return value;}catch{write(pendingKey,null);return null;}};
  const recovery=()=> 'HL-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),byte=>byte.toString(16).padStart(2,'0')).join('').toUpperCase();
  let communityVersion=0,accountRefreshing=false,rotationDraft=null;
  api=async function(path,body){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(path,{credentials:'same-origin',signal:controller.signal,headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});
      let data;try{data=await response.json();}catch{throw Object.assign(new Error('서버 응답을 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.'),{status:503});}
      if(!response.ok)throw Object.assign(new Error(data.error||'서버 연결을 다시 확인해 주세요.'),{status:response.status,code:data.code});
      return data;
    }catch(exception){if(exception.name==='AbortError')throw new Error('연결 확인에 시간이 걸립니다. 같은 요청으로 다시 확인해 주세요.');throw exception;}
    finally{clearTimeout(timer);}
  };
  function showRecovery(code){
    const panel=$('#recovery-panel');panel.style.display='block';
    panel.innerHTML='<h3>내 계정을 이어주는 복구 코드</h3><p class="community-note">다른 컴퓨터에서는 이 코드로 같은 별명·레벨·기록을 이어갑니다. 본인만 보관해 주세요.</p><p id="recovery-code" class="identity-secret"></p><div class="identity-actions"><button type="button" class="btn secondary" id="copy-recovery">코드 복사</button><button type="button" class="link" id="hide-recovery">보관했어요, 숨기기</button></div>';
    $('#recovery-code').textContent=code;$('#copy-recovery').onclick=()=>copyText(code);$('#hide-recovery').onclick=()=>{panel.replaceChildren();panel.style.display='none';};
  }
  const oldCommunity=renderCommunity;
  renderCommunity=function(){
    oldCommunity();if(networkStatus!=='ready')return;
    const version=++communityVersion,panel=$('#account-panel'),logout=$('#logout')?.onclick,restore=$('#restore-form')?.onsubmit;
    const pending=pendingRegistration(),locked=online&&sessionPlayer.nameLocked;
    if(locked){
      panel.innerHTML='<div class="identity-heading"><span class="eyebrow">MY LEARNING ID</span><h2>'+escapeHtml(sessionPlayer.nickname)+'</h2><p>레벨 <b>'+sessionPlayer.level+'</b> · '+sessionPlayer.xp+' XP · 계정에 저장된 학습 기록</p></div><p class="community-note">이 별명은 계속 사용합니다. 다른 컴퓨터에서는 새 계정을 만들지 않고 복구 코드로 이어하세요.</p><div class="identity-actions"><button type="button" class="btn secondary" id="open-my-rank">내 랭킹 보기</button><button type="button" class="link" id="logout">로그아웃</button></div><details class="recovery-renew"><summary>복구 코드를 잃었지만 이 계정에 접속 중인가요?</summary><p>새 코드를 보관하면 이전 코드는 더 이상 사용할 수 없습니다. 현재 접속 중인 기기의 로그인은 유지됩니다.</p><button type="button" class="btn secondary" id="prepare-recovery">새 복구 코드 준비</button><div id="renew-controls"></div></details>';
      $('#logout').onclick=logout;$('#open-my-rank').onclick=()=>{selectRankBoard('learning');showView('league');};
      $('#prepare-recovery').onclick=()=>{
        if(rotationDraft?.playerId!==sessionPlayer.id)rotationDraft=null;
        rotationDraft??={code:recovery(),version:sessionPlayer.recoveryVersion,playerId:sessionPlayer.id};
        $('#renew-controls').innerHTML='<p class="identity-secret" id="renew-code"></p><button type="button" class="link" id="copy-renew">새 코드 복사</button><label class="identity-ack"><input type="checkbox" id="renew-saved">새 코드를 보관했습니다. 이전 코드가 바뀌는 것을 이해합니다.</label><button type="button" class="btn" id="commit-renew" disabled>새 복구 코드 적용</button><p class="identity-status" id="renew-status" role="status"></p>';
        $('#renew-code').textContent=rotationDraft.code;$('#copy-renew').onclick=()=>copyText(rotationDraft.code);$('#renew-saved').onchange=()=>{$('#commit-renew').disabled=!$('#renew-saved').checked;};
        $('#commit-renew').onclick=async()=>{const button=$('#commit-renew');button.disabled=true;try{const data=await api('/api/identity/recovery',rotationDraft);applyPlayer(data.player);rotationDraft=null;renderCommunity();showRecovery(data.recoveryCode);toast('새 복구 코드를 적용했습니다.');}catch(exception){if(['RECOVERY_CHANGED','RECOVERY_USED','SESSION_CHANGED'].includes(exception.code)){rotationDraft=null;const me=await api('/api/me');applyPlayer(me.player);renderCommunity();toast(exception.message);return;}$('#renew-status').textContent=exception.message;button.disabled=false;}};
      };
      if(pending&&sessionPlayer.nickname===pending.adjective+' '+pending.noun){api('/api/profile',pending).then(data=>{if(version===communityVersion){showRecovery(data.recoveryCode);write(pendingKey,null);}}).catch(exception=>{if(['SESSION_CHANGED','REGISTRATION_MISMATCH'].includes(exception.code))write(pendingKey,null);toast(exception.message);});}
      return;
    }
    let draft=pending||{adjective:NAME_ADJECTIVES[0],noun:NAME_NOUNS[0],registrationId:crypto.randomUUID(),recoveryCode:recovery(),avatar:0};
    let uncertain=!!pending,available=false,checking=0,timer;
    const options=(words,selected)=>words.map(word=>'<option'+(word===selected?' selected':'')+'>'+escapeHtml(word)+'</option>').join('');
    panel.innerHTML='<div class="identity-heading"><span class="eyebrow">CHOOSE YOUR LEARNING ID</span><h2>'+(online?'기록은 그대로, 새 별명을 골라 주세요':'내 학습 별명 만들기')+'</h2><p>앞말과 뒷말을 골라 나만의 별명을 만듭니다. 처음 정한 별명은 레벨이 올라가도 계속 사용합니다.</p></div><form id="profile-form"><div class="name-picker"><label>앞말<select class="field" id="name-adjective">'+options(NAME_ADJECTIVES,draft.adjective)+'</select></label><span aria-hidden="true">+</span><label>뒷말<select class="field" id="name-noun">'+options(NAME_NOUNS,draft.noun)+'</select></label></div><div class="name-preview"><span>나의 별명</span><strong id="name-preview"></strong><small>'+(online?'현재 레벨과 학습 기록 유지':'레벨 1부터 학습 랭킹에 참가')+'</small></div><div class="name-check-row"><p class="identity-status" id="name-check" role="status"></p><button type="button" class="link" id="suggest-name">다른 조합 추천</button></div>'+(online?'':'<div class="identity-backup"><strong>가입 전에 복구 코드를 보관해 주세요</strong><p>다른 컴퓨터에서 같은 계정을 이어갈 때 사용합니다. 별명만으로는 로그인할 수 없습니다.</p><p class="identity-secret" id="signup-code"></p><button type="button" class="link" id="copy-signup-code">코드 복사</button><label class="identity-ack"><input type="checkbox" id="signup-saved" '+(uncertain?'checked':'')+'>복구 코드를 안전하게 보관했습니다.</label></div>')+'<button class="btn" id="join-account" type="submit" disabled>'+(uncertain?'가입 결과 다시 확인':online?'이 별명으로 확정하기':'이 별명으로 시작하기')+'</button><p class="identity-status" id="identity-error" role="status"></p></form>'+(!online?'<details class="identity-restore"><summary>이미 계정이 있나요? 다른 컴퓨터에서 이어하기</summary><form id="restore-form" class="community-fields"><label>내 복구 코드<input id="restore-code" class="field" type="password" placeholder="HL-로 시작하는 복구 코드" required autocomplete="off"></label><button class="btn secondary">기존 계정으로 접속</button></form><p>기존 별명·레벨·완료 기록을 그대로 불러옵니다.</p></details>':'<div class="identity-actions"><button class="link" id="logout">로그아웃</button></div>');
    const adjective=$('#name-adjective'),noun=$('#name-noun'),submit=$('#join-account'),status=$('#name-check');
    const update=()=>{draft.adjective=adjective.value;draft.noun=noun.value;$('#name-preview').textContent=draft.adjective+' '+draft.noun;submit.disabled=!(uncertain||available&&(online||$('#signup-saved')?.checked));adjective.disabled=noun.disabled=$('#suggest-name').disabled=uncertain;};
    async function check(){const sequence=++checking;status.textContent='사용 가능한 별명인지 확인하고 있습니다';status.dataset.available='checking';available=false;update();try{const data=await api('/api/names/availability?adjective='+encodeURIComponent(adjective.value)+'&noun='+encodeURIComponent(noun.value));if(version!==communityVersion||sequence!==checking)return;available=data.available;status.textContent=available?'사용 가능한 별명입니다':'이미 사용 중입니다. 다른 조합을 골라 주세요.';status.dataset.available=String(available);update();}catch(exception){if(version===communityVersion&&sequence===checking)status.textContent=exception.message;}}
    for(const control of [adjective,noun])control.onchange=()=>{checking++;available=false;status.dataset.available='checking';status.textContent='새 별명을 확인하고 있습니다';draft.registrationId=crypto.randomUUID();update();clearTimeout(timer);timer=setTimeout(check,250);};
    $('#suggest-name').onclick=async()=>{try{const data=await api('/api/names/suggestion');if(version!==communityVersion)return;adjective.value=data.adjective;noun.value=data.noun;draft.registrationId=crypto.randomUUID();await check();}catch(exception){status.textContent=exception.message;}};
    if(!online){$('#signup-code').textContent=draft.recoveryCode;$('#copy-signup-code').onclick=()=>copyText(draft.recoveryCode);$('#signup-saved').onchange=update;$('#restore-form').onsubmit=restore;}
    else $('#logout').onclick=logout;
    $('#profile-form').onsubmit=async event=>{
      event.preventDefault();if(submit.disabled)return;const existing=online;
      const body=existing?{adjective:adjective.value,noun:noun.value}:{...draft};
      if(!existing){write(pendingKey,body);uncertain=true;update();}
      submit.disabled=true;$('#identity-error').textContent='계정을 확인하고 있습니다';
      try{const data=await api('/api/profile',body);write(pendingKey,null);applyPlayer(data.player);await refreshStudyProgress();renderCommunity();if(data.recoveryCode)showRecovery(data.recoveryCode);toast('별명과 학습 랭킹이 연결됐습니다.');await refreshLeaderboard();}
      catch(exception){if(version!==communityVersion)return;if(['NAME_LOCKED','SESSION_CHANGED'].includes(exception.code)){write(pendingKey,null);const me=await api('/api/me');applyPlayer(me.player);renderCommunity();toast(exception.message);return;}$('#identity-error').textContent=exception.message;if(['NAME_TAKEN','NAME_INVALID','RECOVERY_USED'].includes(exception.code)){write(pendingKey,null);uncertain=false;draft.registrationId=crypto.randomUUID();if(exception.code==='RECOVERY_USED'){draft.recoveryCode=recovery();$('#signup-code').textContent=draft.recoveryCode;$('#signup-saved').checked=false;}await check();}else if(!existing){uncertain=true;submit.textContent='같은 가입 요청 다시 확인';}update();}
    };
    update();if(uncertain){available=true;status.textContent='이전에 보낸 가입 요청을 같은 정보로 다시 확인합니다.';update();}else check();
  };
  // Automatic retry uses the identical submission ID. Answers themselves are never stored.
  submitAnswer=async function(answer){
    const generation=lessonGeneration,attemptId=pendingAttempt.id,sentStep=step,identity=sessionPlayer?.id;
    submitting=true;$('#check').disabled=true;
    try{
      const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({step:sentStep,answer})))),byte=>byte.toString(16).padStart(2,'0')).join('');
      const previous=read(answerKey),requestId=previous?.attemptId===attemptId&&previous.step===sentStep&&previous.fingerprint===fingerprint&&/^[a-f0-9-]{36}$/i.test(previous.requestId)?previous.requestId:crypto.randomUUID();
      write(answerKey,{attemptId,step:sentStep,fingerprint,requestId});
      let result;
      try{result=await api('/api/attempts/'+attemptId+'/answer',{step:sentStep,answer,requestId});}
      catch(exception){if(exception.status!==undefined&&exception.status<500)throw exception;result=await api('/api/attempts/'+attemptId+'/answer',{step:sentStep,answer,requestId});}
      if(generation!==lessonGeneration||identity!==sessionPlayer?.id)return null;
      applyPlayer(result.player);if(result.rank)activeRank=result.rank;lastServerResult=result;write(answerKey,null);return result;
    }catch(exception){
      if(generation!==lessonGeneration)return null;
      if(exception.status===409&&['STEP_CHANGED','REQUEST_CHANGED'].includes(exception.code)){
        try{const [current,me]=await Promise.all([api('/api/attempts/'+attemptId),api('/api/me')]);if(generation!==lessonGeneration)return null;applyPlayer(me.player);if(current.rank)activeRank=current.rank;
          if(current.attempt.status==='complete'){lastServerResult={awarded:false};completeMission();}
          else if(current.attempt.step!==sentStep){step=current.attempt.step;pendingAttempt={...pendingAttempt,...current.attempt};renderLesson();}
          toast('다른 기기에서 저장된 현재 진행을 불러왔습니다.');write(answerKey,null);return null;
        }catch{}
      }
      toast(exception.message);if(exception.code==='NAME_REQUIRED'){closeMission();showView('squad');}return null;
    }finally{submitting=false;if(generation===lessonGeneration)$('#check').disabled=false;}
  };
  const oldApply=applyPlayer;
  applyPlayer=function(player){const changed=player&&(sessionPlayer?.id!==player.id||sessionPlayer?.xp!==player.xp||sessionPlayer?.nickname!==player.nickname);oldApply(player);if(changed&&networkStatus==='ready')queueMicrotask(()=>refreshLeaderboard());};
  async function refreshAccount(){if(!online||networkStatus!=='ready'||accountRefreshing||submitting||$('#overlay').classList.contains('open'))return;accountRefreshing=true;try{const data=await api('/api/me');if(data.player){const changed=sessionPlayer?.id!==data.player.id||sessionPlayer?.nickname!==data.player.nickname||sessionPlayer?.xp!==data.player.xp||sessionPlayer?.nameLocked!==data.player.nameLocked||sessionPlayer?.recoveryVersion!==data.player.recoveryVersion;applyPlayer(data.player);if(changed){await refreshStudyProgress();renderCommunity();}}else{online=false;sessionPlayer=null;activeRank=null;state={xp:0,gems:0,hearts:5,streak:0,completed:[],daily:{date:today(),lessons:0,correct:0,xp:0,claims:[]},sound:state.sound,...stored};renderCommunity();renderStats();toast('접속이 끝났습니다. 복구 코드로 기존 계정을 이어하세요.');}}catch{}finally{accountRefreshing=false;}}
  setInterval(()=>{if(!document.hidden)refreshAccount();},20000);window.addEventListener('focus',refreshAccount);
  const oldLesson=renderLesson;
  renderLesson=function(){oldLesson();const label=$('#lab-session-label');if(label)label.textContent='LAB '+String(mission.id+1).padStart(2,'0')+' / '+(rankLessonId?'하루 도전':online?'계정에 학습 기록 저장':'혼자 연습 · 랭킹 저장 안 됨');
    if(phase==='brief'&&!online){const note=document.createElement('aside');note.className='identity-lesson-note';note.innerHTML='<strong>지금은 혼자 연습하고 있습니다</strong><p>별명을 만들면 이 계정으로 완료한 실습의 레벨과 순위가 저장됩니다.</p><button class="btn secondary" type="button" id="lesson-create-account">별명 만들고 기록 남기기</button>';$('#lesson-body .beginner-note')?.before(note);$('#lesson-create-account').onclick=()=>{closeMission();showView('squad');$('#name-adjective')?.focus();};}
  };
  document.querySelectorAll('.nav [data-view="squad"] .nav-label').forEach(label=>label.textContent='계정·친구');
  renderCommunity();if($('#overlay').classList.contains('open'))renderLesson();
})();
