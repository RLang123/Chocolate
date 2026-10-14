// Presentation only: lesson state, answers, timings and scores stay in their original lifecycle.
const labMotionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const labMotionAnimations=new Set();
function labAnimate(element,keyframes,options={}){
  if(!element||labMotionPreference.matches||typeof element.animate!=='function')return;
  // A new transition replaces an unfinished one on this element, never accumulates.
  for(const animation of labMotionAnimations)if(animation.effect?.target===element){animation.cancel();labMotionAnimations.delete(animation);}
  const animation=element.animate(keyframes,{duration:260,easing:'cubic-bezier(.22,.8,.28,1)',...options});
  labMotionAnimations.add(animation);
  const forget=()=>labMotionAnimations.delete(animation);
  animation.addEventListener('finish',forget,{once:true});animation.addEventListener('cancel',forget,{once:true});
}
labMotionPreference.addEventListener('change',()=>{if(labMotionPreference.matches){for(const animation of labMotionAnimations)animation.cancel();labMotionAnimations.clear();}});
function labEnter(element,delay=0){labAnimate(element,[{opacity:.25,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{delay});}
const labConsole=$('.modal');
labConsole.classList.add('lab-console');
const labBanner=document.createElement('header');labBanner.className='lab-banner';
labBanner.innerHTML='<div><small id="lab-session-label">TRACELAB / PRACTICE</small><strong id="lab-session-title"></strong></div><span class="lab-state" id="lab-state-label" role="status" aria-live="polite">준비</span>';
const labFlow=document.createElement('ol');labFlow.className='lab-flow';labFlow.setAttribute('aria-label','실습 흐름');
labFlow.innerHTML='<li><b>01</b>브리핑</li><li><b>02</b>직접 실습</li><li><b>03</b>정리</li>';
$('.modal-head').after(labBanner,labFlow);
let labLastGeneration=-1,labPendingOperations=0,labRenderEpoch=0;
function labSetState(value,label){labConsole.dataset.labState=value;$('#lab-state-label').textContent=label;}
function labSyncState(){
  if(labPendingOperations){labSetState('running','처리 중');return;}
  labSetState(passed||phase==='result'?'verified':'ready',phase==='result'?'완료':passed?'확인 완료':phase==='brief'?'준비':'실습 중');
}
function labDecorateLesson(){
  const body=$('#lesson-body');
  $('#lab-session-label').textContent='LAB '+String(mission.id+1).padStart(2,'0')+' / '+(rankLessonId?'랭크 도전':isRoomLesson()?'함께 도전':'혼자 연습');
  $('#lab-session-title').textContent=shortTitles[mission.id];
  const phaseIndex=phase==='brief'?0:phase==='result'?2:1;
  [...labFlow.children].forEach((item,index)=>{item.classList.toggle('is-done',index<phaseIndex);if(index===phaseIndex)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
  body.classList.toggle('lab-workspace',phase==='challenge');
  if(phase==='challenge'){
    const guide=document.createElement('aside');guide.className='lab-guide';guide.setAttribute('aria-label','실습 안내');
    const stage=document.createElement('div');stage.className='lab-stage';
    for(const node of [...body.children]){
      if(node.matches('.eyebrow,.step-instructions,.tech-pill'))guide.append(node);else stage.append(node);
    }
    const steps=document.createElement('ol');steps.className='lab-step-list';steps.setAttribute('aria-label','문제 진행');
    for(let index=0;index<mission.challenge;index++){
      const item=document.createElement('li');
      item.innerHTML='<span>'+String(index+1).padStart(2,'0')+'</span>'+(index<step?'확인한 단서':index===step?'지금 풀 단서':'다음 단서');
      if(index===step)item.setAttribute('aria-current','step');steps.append(item);
    }
    guide.append(steps);body.append(guide,stage);
  }
  if(phase==='result'){
    const mark=document.createElement('div');mark.className='lab-result-mark';mark.setAttribute('aria-hidden','true');mark.textContent='✓';
    $('#lesson-title').before(mark);
    labAnimate(mark,[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(1)'}],{duration:360});
  }
  for(const workbench of body.querySelectorAll('.request-workbench,.scenario-lab,.sql-demo,.reverse-lab')){
    const flow=document.createElement('div');flow.className='lab-execution';flow.setAttribute('aria-hidden','true');
    flow.innerHTML='<span>입력</span><i></i><span>실행</span><i></i><span>응답</span>';
    const heading=workbench.querySelector(':scope>header,:scope>.lab-mini-head');
    if(heading)heading.after(flow);else workbench.prepend(flow);
  }
  labWireExecutions();labSyncState();
  if(labLastGeneration!==lessonGeneration){
    labLastGeneration=lessonGeneration;
    labAnimate(labConsole,[{opacity:.4,transform:'translateY(16px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:320});
  }else{
    for(const element of body.querySelectorAll(':scope>.lab-guide,:scope>.lab-stage'))labEnter(element,element.classList.contains('lab-stage')?40:0);
    if(phase!=='challenge')labEnter(body);
  }
}
function labWireExecutions(){
  const pairs=[['advanced-run','advanced-result'],['scenario-run','scenario-result'],['sql-unsafe','sql-output'],['sql-safe','sql-output'],['reverse-run','reverse-output'],['builder-run','builder-result'],['robot-run','robot-result']];
  for(const [buttonId,resultId] of pairs){
    const button=$('#'+buttonId);if(!button?.onclick)continue;
    const handler=button.onclick,generation=lessonGeneration,epoch=labRenderEpoch;
    button.onclick=async function(event){
      const result=$('#'+resultId),before=result?.innerHTML;
      const bench=button.closest('.request-workbench,.scenario-lab,.sql-demo,.reverse-lab');
      labPendingOperations++;bench?.classList.add('is-running');button.setAttribute('aria-busy','true');labSyncState();
      try{return await handler.call(this,event);}
      finally{
        if(generation===lessonGeneration&&epoch===labRenderEpoch){labPendingOperations=Math.max(0,labPendingOperations-1);labSyncState();}
        bench?.classList.remove('is-running');button.removeAttribute('aria-busy');
        if(result?.isConnected&&generation===lessonGeneration&&epoch===labRenderEpoch&&result.innerHTML!==before){
          labEnter(result);
          [...result.querySelectorAll('li')].slice(0,6).forEach((line,index)=>labEnter(line,30+index*35));
        }
      }
    };
  }
}
const labOriginalRender=renderLesson;
renderLesson=function(){labRenderEpoch++;labPendingOperations=0;labOriginalRender();labDecorateLesson();};
const labOriginalLaunch=launchRankLesson;
launchRankLesson=function(){labOriginalLaunch();if(rankLessonId)$('#lab-session-label').textContent='LAB '+String(mission.id+1).padStart(2,'0')+' / 랭크 도전';};
const labOriginalClose=closeMission;
closeMission=function(){labOriginalClose();labPendingOperations=0;for(const animation of labMotionAnimations)if(labConsole.contains(animation.effect?.target)){animation.cancel();labMotionAnimations.delete(animation);}};
$('#close').onclick=()=>closeMission();
const labOriginalResponse=response;
response=function(ok,text){const alreadyPassed=passed;labOriginalResponse(ok,text);labSyncState();if(!alreadyPassed)labEnter($('#feedback'));};
const labOriginalHint=renderHint;
renderHint=function(){labOriginalHint();if(hintOpen)labEnter($('#hint-text'));};
const labOriginalShowView=showView;
showView=function(id){const changed=appView!==id;labOriginalShowView(id);if(changed)labEnter($('#'+id));};
// Reflect actual network work on the submit button, including rank and account attempts.
new MutationObserver(()=>{
  const button=$('#check');
  button.setAttribute('aria-busy',String(submitting));
}).observe($('#check'),{attributes:true,attributeFilter:['disabled']});
// Retain the final, accurate number; a short tint acknowledges real changes only.
for(const id of ['xp','hearts','streak']){
  const element=$('#'+id);let previous=element.textContent;
  new MutationObserver(()=>{const next=element.textContent;if(next!==previous){previous=next;labAnimate(element,[{color:'#7b263f',transform:'translateY(-2px)'},{color:getComputedStyle(element).color,transform:'translateY(0)'}],{duration:350});}}).observe(element,{childList:true,subtree:true,characterData:true});
}
labEnter($('.editorial-hero'));
// These stable sections enter once. Rebuilt cards and polling rows are excluded.
if(typeof IntersectionObserver==='function'){
  const reveal=new IntersectionObserver(entries=>{
    let order=0;
    for(const entry of entries)if(entry.isIntersecting){reveal.unobserve(entry.target);labEnter(entry.target,Math.min(order++*35,105));}
  },{threshold:.12});
  document.querySelectorAll('.starter-path,.catalog-toolbar,.right>.panel,.guide-grid>.panel').forEach(element=>reveal.observe(element));
}
if($('#overlay').classList.contains('open'))labDecorateLesson();
