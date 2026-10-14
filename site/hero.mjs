// Two bounded canvas layers and one authored SVG. No images, libraries or network requests.
(()=>{
  const scene=document.getElementById('code-scene');if(!scene)return;
  const atmosphere=scene.querySelector('.code-atmosphere');
  const figure=document.getElementById('code-figure');
  const button=document.getElementById('code-motion-toggle');
  // Share the same live preference object as lesson motion and its cancellation listener.
  const preference=labMotionPreference;
  const characters='01ABCDEF{}[]<>/?:=+_';
  let width=0,height=0,elapsed=0,previousTime=0,frame=0,visible=false,paused=false,reducedMotion=preference.matches;
  const layers=['back','front'].map(name=>{
    const canvas=document.getElementById('code-rain-'+name);
    return {canvas,context:canvas.getContext('2d'),columns:[],front:name==='front'};
  });
  const noise=value=>{const number=Math.sin(value*127.1+311.7)*43758.5453;return number-Math.floor(number);};
  function resize(){
    const bounds=atmosphere.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
    width=bounds.width;height=bounds.height;
    const ratio=Math.min(devicePixelRatio||1,1.5);
    for(const layer of layers){
      if(!layer.context)continue;
      layer.canvas.width=Math.round(width*ratio);layer.canvas.height=Math.round(height*ratio);
      layer.context.setTransform(ratio,0,0,ratio,0,0);
      layer.context.font='11px ui-monospace, monospace';
      layer.columns=Array.from({length:Math.ceil(width/(layer.front?57:18))},(_,index)=>({
        x:index*(layer.front?57:18)+(layer.front?21:8),seed:index+(layer.front?93:1),
        speed:(layer.front?25:33)+noise(index+5)*35,length:8+Math.floor(noise(index+17)*13),offset:noise(index+47)*(height+350)
      }));
    }
    paint();sync();
  }
  function paint(){
    if(!width||!height)return;
    for(const layer of layers){
      const context=layer.context;if(!context)continue;
      context.clearRect(0,0,width,height);
      for(const column of layer.columns){
        const head=(column.offset+elapsed*column.speed)%(height+column.length*17);
        for(let index=0;index<column.length;index++){
          const y=head-index*17;if(y<-17||y>height+17)continue;
          const alpha=(1-index/column.length)*(layer.front ? .52 : .72);
          context.fillStyle=index===0?'rgba(202,237,175,'+alpha+')':'rgba(113,166,88,'+alpha+')';
          const glyph=Math.floor(noise(column.seed*29+index+Math.floor(elapsed*2))*characters.length);
          context.fillText(characters[glyph],column.x,y);
        }
      }
    }
    // Start with a visible figure; descend slowly, fade at the edge, then enter again.
    const position=((elapsed/19)+.24)%1;
    const drop=-43+position*(height<300?100:165);
    figure.style.transform='translate(-50%,'+drop.toFixed(1)+'px)';
    figure.style.opacity=String(Math.min(1,position/.14,(1-position)/.15)*.94);
  }
  function shouldRun(){return visible&&!document.hidden&&!paused&&!reducedMotion&&document.getElementById('missions').classList.contains('active')&&!document.getElementById('overlay').classList.contains('open');}
  function tick(time){
    frame=0;if(!shouldRun()){previousTime=0;return;}
    if(!previousTime)previousTime=time;
    const delta=time-previousTime;
    if(delta>=1000/24){elapsed+=Math.min(delta,120)/1000;previousTime=time;paint();}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    if(shouldRun()){if(!frame){previousTime=0;frame=requestAnimationFrame(tick);}}
    else {if(frame)cancelAnimationFrame(frame);frame=0;previousTime=0;}
    button.disabled=reducedMotion;
    button.setAttribute('aria-pressed',String(paused||reducedMotion));
    button.setAttribute('aria-label',reducedMotion?'움직임 줄이기 설정으로 정지 화면 표시':paused?'첫 화면 그래픽 움직임 재생하기':'첫 화면 그래픽 움직임 멈추기');
    button.querySelector('.code-toggle-label').textContent=reducedMotion?'정지 화면':paused?'재생':'멈춤';
    button.firstElementChild.textContent=paused&&!reducedMotion?'▷':'Ⅱ';
    scene.classList.toggle('code-scene-paused',paused||reducedMotion);
  }
  button.addEventListener('click',()=>{paused=!paused;sync();});
  preference.addEventListener('change',event=>{reducedMotion=event.matches;if(reducedMotion){elapsed=0;paint();}sync();});
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(document.getElementById('missions'),{attributes:true,attributeFilter:['class']});
  new MutationObserver(sync).observe(document.getElementById('overlay'),{attributes:true,attributeFilter:['class']});
  if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.08}).observe(scene);
  else visible=true;
  if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(atmosphere);
  else window.addEventListener('resize',resize);
  resize();
})();
