// Visual evidence comes from the existing execution, never a second request or a guessed score.
(()=>{
  let samples=new Map(),sampleGeneration=-1;
  const safe=escapeHtml;
  const outcomeLabels={normal:'정상 처리',exposed:'빈틈 재현',protected:'방어 확인',error:'실행 확인 필요'};
  function session(){if(sampleGeneration!==lessonGeneration){samples=new Map();sampleGeneration=lessonGeneration;}}
  function addNetwork(bench){
    const existing=bench.querySelector('.lab-execution');if(!existing)return;
    existing.className='request-network';existing.removeAttribute('aria-hidden');
    existing.innerHTML='<div class="network-head"><span>요청의 이동</span><small class="network-caption">입력을 바꾼 뒤 실행해 보세요</small></div><div class="network-route"><div class="network-wire"></div><i class="network-packet" aria-hidden="true"></i><ol><li><span class="network-icon">'+iconSvg('lab')+'</span><strong>내 브라우저</strong><small>입력한 요청</small></li><li><span class="network-icon">'+iconSvg('shield')+'</span><strong>실습 서버</strong><small>규칙으로 판단</small></li><li><span class="network-icon">'+iconSvg('guide')+'</span><strong>돌아온 응답</strong><small class="network-status">실행 전</small></li></ol></div>';
    const invalidate=()=>{
      existing.dataset.outcome='idle';existing.querySelector('.network-caption').textContent='입력이 바뀌었습니다. 다시 실행해 보세요';existing.querySelector('.network-status').textContent='실행 전';
      for(const animation of labMotionAnimations)if(animation.effect?.target===existing.querySelector('.network-packet')){animation.cancel();labMotionAnimations.delete(animation);}
    };
    bench.querySelectorAll('input,textarea,select').forEach(control=>control.addEventListener(control.tagName==='SELECT'?'change':'input',invalidate));
    bench.querySelectorAll('#advanced-normal,#advanced-example,#scenario-example,#sql-payload,#reverse-hint').forEach(control=>control.addEventListener('click',invalidate));
    return existing;
  }
  function flight(network,from,to,duration){
    const packet=network?.querySelector('.network-packet');if(!packet)return;
    const distance=network.querySelector('.network-route').clientWidth*2/3;
    labAnimate(packet,[{opacity:1,transform:'translateX('+(distance*from)+'px)'},{opacity:1,offset:.85,transform:'translateX('+(distance*to)+'px)'},{opacity:0,transform:'translateX('+(distance*to)+'px)'}],{duration,easing:'ease-in-out'});
  }
  function snapshot(buttonId){
    if(buttonId==='advanced-run')return {kind:'advanced',input:$('#advanced-request').value,patch:$('#advanced-patch')?.value||'none',sequence:advancedSequence+1};
    if(buttonId==='scenario-run')return {kind:'scenario',input:$('#scenario-input').value,patch:$('#scenario-patch')?.value||'none',sequence:scenarioSequence+1};
    if(buttonId==='sql-unsafe'||buttonId==='sql-safe')return {kind:'sql',input:$('#sql-input').value,patch:buttonId==='sql-safe'?'parameter':'none',sequence:sqlSequence+1};
    return {kind:'other'};
  }
  function begin(buttonId,bench,result){
    if(!bench)return null;
    const network=bench.querySelector('.request-network');if(!network)return null;
    const ticket={...snapshot(buttonId),network,result,generation:lessonGeneration,epoch:labRenderEpoch,step,id:mission.id,started:performance.now(),before:result?.innerHTML};
    network.dataset.outcome='pending';network.querySelector('.network-caption').textContent='요청을 보내고 처리 결과를 기다립니다';network.querySelector('.network-status').textContent='처리 중';
    flight(network,0,.5,330);return ticket;
  }
  function readResult(ticket,result){
    if(ticket.kind==='advanced'){
      const execution=result.traceExecution;
      if(advancedSequence!==ticket.sequence||!execution||execution.request!==ticket.input||execution.patch!==ticket.patch||!advancedEvidence)return null;
      const sql=execution.result.sql;
      return {input:ticket.input,patch:ticket.patch,status:String(execution.result.status),outcome:execution.result.blocked?'protected':execution.result.exposed?'exposed':'normal',data:execution.result.data,code:sql?sql.query+(sql.params?.length?'\n값: '+JSON.stringify(sql.params):''):null,trace:execution.result.trace};
    }
    if(ticket.kind==='scenario'){
      const status=result.querySelector('.scenario-status');
      if(scenarioSequence!==ticket.sequence||!status||scenarioEvidence?.input!==ticket.input||scenarioEvidence?.patch!==ticket.patch)return null;
      return {input:ticket.input,patch:ticket.patch,status:status.querySelector('strong').textContent,outcome:status.classList.contains('protected')?'protected':status.classList.contains('exposed')?'exposed':'normal',data:result.querySelector('p')?.textContent||'',code:$('#scenario-code').textContent};
    }
    if(ticket.kind==='sql'){
      if(sqlSequence!==ticket.sequence||!result.querySelector('.sql-row-results'))return null;
      const summary=result.querySelector('strong').textContent;
      return {input:ticket.input,patch:ticket.patch,status:summary.split(' · ')[0],outcome:ticket.patch==='parameter'?'protected':'normal',data:summary,code:$('#sql-query').textContent};
    }
    if(result.innerHTML===ticket.before)return null;
    return {status:'실행 완료',outcome:'normal',data:result.textContent};
  }
  function finish(ticket,result){
    if(!ticket||!result?.isConnected||ticket.generation!==lessonGeneration||ticket.epoch!==labRenderEpoch)return;
    const sequence=ticket.kind==='advanced'?advancedSequence:ticket.kind==='scenario'?scenarioSequence:ticket.kind==='sql'?sqlSequence:null;
    if(ticket.sequence!==undefined&&ticket.sequence!==sequence)return;
    if(ticket.kind==='sql'&&$('#sql-input').value!==ticket.input)return;
    const data=readResult(ticket,result),network=ticket.network;
    if(!data){network.dataset.outcome='idle';network.querySelector('.network-caption').textContent='입력과 실행 결과를 다시 확인해 주세요';network.querySelector('.network-status').textContent='확인 필요';return;}
    network.dataset.outcome=data.outcome;network.querySelector('.network-caption').textContent=outcomeLabels[data.outcome]+' · 실행 결과가 도착했습니다';network.querySelector('.network-status').textContent=data.status;
    flight(network,performance.now()-ticket.started<240?0:.5,1,performance.now()-ticket.started<240?560:330);
    session();
    if(ticket.kind==='advanced'||ticket.kind==='scenario'||ticket.kind==='sql'){
      const group=samples.get(ticket.id)||{};
      if(ticket.patch==='none')group.before=data;else group.after=data;
      samples.set(ticket.id,group);renderComparison(network.closest('.request-workbench,.scenario-lab,.sql-demo'),ticket.kind);
    }
  }
  const advancedCode={
    27:['document = find(request.id);\nreturn document;','document = find(request.id);\nrequire(document.owner === session.user);\nreturn document;'],
    28:['query = "WHERE name = \'" + input + "\'";\nexecute(query);','query = "WHERE name = ?";\nexecute(query, [input]);'],
    29:['role = request.headers["X-Role"];\nrequire(role === "admin");','role = session.serverRole;\nrequire(role === "admin");'],
    30:['for (request of burst) {\n  checkPassword(request);\n}','for (request of burst) {\n  require(attempts < 3);\n  checkPassword(request);\n}']
  };
  function codeFor(kind){
    if(kind==='scenario'){const spec=scenarioSpec(mission.id,pendingAttempt?.seed||1);return [spec.code,spec.fixed];}
    if(kind==='advanced')return advancedCode[mission.id];
    return ['query = "WHERE name = \'" + input + "\'";','query = "WHERE name = ?";\nexecute(query, [input]);'];
  }
  function codeLines(code,kind,other){const otherLines=String(other).split('\n');return String(code).split('\n').map(line=>{const changed=!otherLines.includes(line);return '<span class="diff-line '+kind+(changed?' is-changed':'')+'"><i aria-hidden="true">'+(changed?(kind==='before'?'−':'+'):' ')+'</i><code>'+safe(line)+'</code></span>';}).join('');}
  function renderComparison(bench,kind,animate=true){
    const panel=bench?.querySelector('.patch-comparison');if(!panel)return;
    const records=samples.get(mission.id)||{},codes=codeFor(kind);
    const selected=kind==='advanced'?$('#advanced-patch')?.value:kind==='scenario'?$('#scenario-patch')?.value:records.after?.patch;
    const correct=kind==='advanced'?advancedSpec(mission.id,pendingAttempt?.seed||1).patch:kind==='scenario'?scenarioSpec(mission.id,pendingAttempt?.seed||1).patch:'parameter';
    const applied=selected===correct;
    const currentInput=kind==='advanced'?$('#advanced-request')?.value:kind==='scenario'?$('#scenario-input')?.value:$('#sql-input')?.value;
    const after=records.after&&records.after.patch===selected&&records.after.input===currentInput?records.after:null;
    const afterCode=applied?codes[1]:selected==='cosmetic'?'hideButton();\n// 서버의 검사는 그대로':codes[0];
    const beforeCode=records.before?.code||codes[0],currentAfterCode=after?.code||afterCode;
    const column=(label,code,data,side,other)=>'<section class="diff-column"><div class="diff-column-head"><span>'+label+'</span><b>'+(!data?'실행 전':safe(data.status))+'</b></div><pre>'+codeLines(code,side,other)+'</pre><div class="diff-evidence" data-outcome="'+(data?.outcome||'idle')+'"><span>'+(!data?'아직 관찰한 결과가 없습니다':outcomeLabels[data.outcome])+'</span><p>'+safe(data?.data||'직접 실행한 응답이 여기에 남습니다.')+'</p>'+(data?.input?'<small class="diff-input">관찰한 입력: '+safe(data.input)+'</small>':'')+'</div></section>';
    const note=after?(records.before&&records.before.input!==after.input?'서로 다른 입력의 결과입니다. 같은 입력으로 실행하면 방어 효과를 더 정확하게 비교할 수 있습니다.':'위 결과는 직접 실행한 요청에서 가져왔습니다.'):applied?'방어 처리를 선택했습니다. 같은 입력으로 실행해 결과를 비교하세요.':'처리 원리를 비교하는 화면입니다. 방어 처리를 선택한 뒤 직접 실행하세요.';
    const next='<div class="diff-columns">'+column('수정 전',beforeCode,records.before,'before',currentAfterCode)+column('수정 후',currentAfterCode,after,'after',beforeCode)+'</div><p class="diff-footnote">'+note+'</p>';
    const content=panel.querySelector('.diff-content');if(content.innerHTML!==next){content.innerHTML=next;if(animate)labEnter(content);}
  }
  function addComparison(bench,kind){
    if(kind!=='sql'&&step!==1)return;
    const panel=document.createElement('details');panel.className='patch-comparison';panel.open=true;
    panel.innerHTML='<summary><span>수정 전 · 후를 나란히 보기</span><small>'+(kind==='scenario'?'검사할 코드':kind==='sql'?'SQL 실행 비교':'처리 원리 요약')+'</small></summary><div class="diff-content"></div>';
    const control=bench.querySelector('#advanced-patch,#scenario-patch,.sql-actions');
    if(control)control.after(panel);else bench.append(panel);
    const old=bench.querySelector('.scenario-code');if(old)old.hidden=true;
    renderComparison(bench,kind);
    if(control?.tagName==='SELECT')control.addEventListener('change',()=>renderComparison(bench,kind));
    bench.querySelector('#advanced-request,#scenario-input,#sql-input')?.addEventListener('input',()=>renderComparison(bench,kind,false));
    bench.querySelectorAll('#advanced-normal,#advanced-example,#scenario-example,#sql-payload').forEach(button=>button.addEventListener('click',()=>renderComparison(bench,kind,false)));
  }
  function scan(surface){
    if(!surface||labMotionPreference.matches)return;
    surface.classList.add('scan-surface');
    const beam=document.createElement('span');beam.className='investigation-beam';beam.setAttribute('aria-hidden','true');surface.append(beam);
    labAnimate(beam,[{opacity:0,transform:'translateY(0)'},{opacity:.8,offset:.2},{opacity:.65,offset:.8},{opacity:0,transform:'translateY('+Math.max(0,surface.clientHeight-3)+'px)'}],{duration:760,delay:80,easing:'ease-in-out'});
  }
  function decorate(){
    if(phase!=='challenge')return;session();
    for(const bench of $('#lesson-body').querySelectorAll('.request-workbench,.scenario-lab,.sql-demo,.reverse-lab')){
      addNetwork(bench);
      if(bench.matches('.request-workbench'))addComparison(bench,'advanced');
      if(bench.matches('.scenario-lab'))addComparison(bench,'scenario');
      if(bench.matches('.sql-demo'))addComparison(bench,'sql');
    }
    const surface=$('#lesson-body').querySelector('.request-workbench,.scenario-lab,.sql-demo,.reverse-lab,.email,.browser-window,.terminal,.poster,.social-post,.permissions,.options')||$('.lab-stage');
    scan(surface);
  }
  window.TraceExperience={begin,finish};
  const original=renderLesson;renderLesson=function(){original();decorate();};
  document.addEventListener('click',event=>{
    const target=event.target.closest('.inspect,[data-line],[data-history],[data-redact]');
    if(target&&$('#overlay').classList.contains('open')&&!passed)labAnimate(target,[{boxShadow:'inset 3px 0 #a4516b',backgroundColor:'#f2dce4'},{boxShadow:'inset 0 0 transparent',backgroundColor:getComputedStyle(target).backgroundColor}],{duration:480});
  });
  if($('#overlay').classList.contains('open'))decorate();

  // Six topics cover every mission once. Lines describe relationships, not prerequisites.
  const topics=[
    {id:'account',label:'인증과 계정',short:'AUTH',ids:[0,6,7,24],text:'비밀번호와 추가 인증으로 계정의 주인을 확인합니다.'},
    {id:'clues',label:'단서와 개인정보',short:'TRACE',ids:[1,4,5,8,9,10,11,15,16,18],text:'주소·메시지·권한·파일을 관찰하며 믿을 수 있는 단서를 찾습니다.'},
    {id:'program',label:'코드와 실행',short:'CODE',ids:[3,12,13,14,19,20],text:'값과 명령을 바꾸고 프로그램의 동작과 검증 과정을 확인합니다.'},
    {id:'input',label:'SQL과 입력',short:'SQL',ids:[2,28],text:'입력을 명령과 구별하고 검색 조건이 바뀌는 이유를 배웁니다.'},
    {id:'request',label:'HTTP와 요청',short:'HTTP',ids:[17,22,23,25,26],text:'주소·출처·경로·외부 입력을 확인하고 요청을 안전하게 처리합니다.'},
    {id:'server',label:'권한과 서버',short:'SERVER',ids:[21,27,29,30],text:'소유자·역할·반복 시도를 검사해 서버가 허용할 일을 결정합니다.'}
  ];
  const map=document.createElement('section');map.className='security-map';map.id='security-map';map.setAttribute('aria-labelledby','security-map-title');
  map.innerHTML='<div class="section-head"><h2 id="security-map-title">보안 학습 지도</h2><span id="security-map-count"></span></div><p class="map-intro">주제를 눌러 실습을 살펴보세요. 원하는 순서로 시작해도 괜찮아요.</p><div class="map-workbench"><div class="map-network"><svg class="map-lines map-lines-desktop" viewBox="0 0 600 240" preserveAspectRatio="none" aria-hidden="true"><path d="M100 60H300H500V180H300H100"/><path class="map-next-line" d="M100 60H300H500V180H300H100" pathLength="100"/></svg><svg class="map-lines map-lines-mobile" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true"><path d="M150 60H450V180H150V300H450"/><path class="map-next-line" d="M150 60H450V180H150V300H450" pathLength="100"/></svg>'+topics.map((topic,index)=>'<button class="map-node" type="button" data-map-topic="'+topic.id+'" aria-pressed="false" aria-controls="map-topic-panel"><span class="map-node-meta"><i aria-hidden="true"></i>'+topic.short+'<b>'+String(index+1).padStart(2,'0')+'</b></span><strong>'+topic.label+'</strong><small class="map-node-progress">0 / '+topic.ids.length+'개 완료</small></button>').join('')+'</div><div class="map-footer"><span><i aria-hidden="true"></i>완료한 실습이 있는 주제</span><p id="map-next-note"></p></div></div><section class="map-topic-panel" id="map-topic-panel" aria-labelledby="map-topic-title"></section>';
  $('.starter-path').after(map);
  map.querySelector('.map-lines-desktop>path').setAttribute('d','M100 60H300H500V120H100V180H300H500');
  map.querySelector('.map-lines-mobile>path').setAttribute('d','M150 60H450V120H150V180H450V240H150V300H450');
  let selected=null,lastSignature='',previousNext=null;
  function renderMap(force=false){
    const completed=new Set(state.completed),next=learningOrder.find(id=>!completed.has(id));
    selected??=topics.find(topic=>topic.ids.includes(next))?.id||topics[0].id;
    const signature=[...completed].sort((a,b)=>a-b).join(',')+'|'+selected;
    if(signature===lastSignature&&!force)return;lastSignature=signature;
    const total=missions.filter(item=>completed.has(item.id)).length;
    $('#security-map-count').textContent=total+' / 31개 완료';
    $('#map-next-note').textContent=next===undefined?'모든 실습을 완료했습니다. 관심 있는 주제를 다시 살펴보세요.':'다음 추천 · '+shortTitles[next];
    const nextTopicIndex=topics.findIndex(topic=>topic.ids.includes(next));
    const desktopSegments=['M100 60h0','M100 60H300','M300 60H500','M500 60V120H100V180','M100 180H300','M300 180H500'];
    const mobileSegments=['M150 60h0','M150 60H450','M450 60V120H150V180','M150 180H450','M450 180V240H150V300','M150 300H450'];
    for(const [selector,segments] of [['.map-lines-desktop',desktopSegments],['.map-lines-mobile',mobileSegments]]){
      const line=map.querySelector(selector+' .map-next-line');line.setAttribute('d',segments[nextTopicIndex]||'M0 0');
      if(previousNext!==next&&total>0)labAnimate(line,[{strokeDashoffset:100},{strokeDashoffset:0}],{duration:650});
    }
    previousNext=next;
    for(const topic of topics){
      const node=map.querySelector('[data-map-topic="'+topic.id+'"]'),count=topic.ids.filter(id=>completed.has(id)).length;
      const changed=node.dataset.count!==String(count);
      node.dataset.count=String(count);node.classList.toggle('has-progress',count>0);node.classList.toggle('is-next',topic.ids.includes(next));node.setAttribute('aria-pressed',String(selected===topic.id));node.setAttribute('aria-label',topic.label+' · '+count+' / '+topic.ids.length+'개 완료');node.querySelector('.map-node-progress').textContent=count+' / '+topic.ids.length+'개 완료';
      if(changed&&count>0)labAnimate(node,[{boxShadow:'0 0 0 5px #91b36c44'},{boxShadow:'0 0 0 0 #91b36c00'}],{duration:650});
    }
    const topic=topics.find(item=>item.id===selected),nextTopic=topic.ids.find(id=>!completed.has(id));
    $('#map-topic-panel').innerHTML='<div class="map-topic-copy"><span>'+topic.short+' / LEARNING PATH</span><h3 id="map-topic-title">'+topic.label+'</h3><p>'+topic.text+'</p><button class="btn" data-mission="'+(nextTopic??topic.ids[0])+'">'+(nextTopic===undefined?'다시 연습하기':'이 주제 시작하기')+' →</button></div><div class="map-topic-missions">'+topic.ids.map(id=>'<button data-mission="'+id+'" class="map-mission"><span aria-hidden="true">'+(completed.has(id)?'✓':'↗')+'</span><strong>'+safe(shortTitles[id])+'</strong><small>'+ (completed.has(id)?'완료':'실습')+'</small></button>').join('')+'</div>';
    map.classList.toggle('has-progress',total>0);
  }
  map.addEventListener('click',event=>{const node=event.target.closest('[data-map-topic]');if(!node)return;selected=node.dataset.mapTopic;renderMap();labEnter($('#map-topic-panel'));});
  const originalDashboard=renderStudyDashboard;renderStudyDashboard=function(){originalDashboard();renderMap();};
  renderMap();
})();
