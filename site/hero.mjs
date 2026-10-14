// Two bounded canvas layers and one authored SVG. No images, libraries or network requests.
(()=>{
  const scene=document.getElementById('code-scene');if(!scene)return;
  const atmosphere=scene.querySelector('.code-atmosphere');
  const figure=document.getElementById('code-figure');
  const button=document.getElementById('code-motion-toggle');
  // Share the same live preference object as lesson motion and its cancellation listener.
  const preference=labMotionPreference;
  const characters='01ABCDEF{}[]<>/?:=+_';
  const hoodMask=new Path2D('M200 38C157 40 128 73 108 116L76 210L91 250C45 264 21 309 10 412H390C379 309 355 264 309 250L324 210L292 116C272 73 243 40 200 38Z');
  const faceMask=new Path2D('M200 76C166 86 140 123 124 159L109 214L150 250L200 280L250 250L291 214L276 159C260 123 234 86 200 76Z');
  let particles=[],figureWidth=0,figureTop=0;
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
    figureWidth=figure.getBoundingClientRect().width;
    figureTop=parseFloat(getComputedStyle(figure).top)||0;
    particles=[];
    const maskContext=document.createElement('canvas').getContext('2d');
    if(maskContext)for(let y=42;y<414;y+=12)for(let x=12;x<390;x+=12){
      if(maskContext.isPointInPath(hoodMask,x,y)&&(!maskContext.isPointInPath(faceMask,x,y)||(x>198&&x<222&&y>190&&y<233)))particles.push({x,y,seed:x*7+y,startX:noise(x+y*3)*width,startY:noise(x*3+y)*height});
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
    // Rain gathers into the hood, holds its shape, and disperses. One bounded clock drives both.
    const position=((elapsed/19)+.24)%1;
    const drop=-43+position*(height<300?100:165);
    const phase=(elapsed+4.2)%15;
    const smooth=value=>value*value*(3-2*value);
    const blend=phase<2?0:phase<5?smooth((phase-2)/3):phase<8?1:phase<10?1-smooth((phase-8)/2):0;
    figure.style.transform='translate(-50%,'+drop.toFixed(1)+'px)';
    const edgeFade=Math.min(1,position/.14,(1-position)/.15);
    figure.style.opacity=String(edgeFade*.94*(1-blend*.94));
    const front=layers[1].context;
    if(front&&blend>0){
      const scale=figureWidth/400,left=(width-figureWidth)/2;
      front.font=(height<300?'8':'9')+'px ui-monospace, monospace';
      for(const particle of particles){
        const streamY=(particle.startY+elapsed*(24+noise(particle.seed)*24))%(height+50)-25;
        const x=particle.startX+(left+particle.x*scale-particle.startX)*blend;
        const y=streamY+(figureTop+drop+particle.y*scale-streamY)*blend;
        front.fillStyle='rgba(167,215,130,'+(blend*edgeFade*(.5+noise(particle.seed)*.42)).toFixed(3)+')';
        front.fillText(characters[Math.floor(noise(particle.seed+Math.floor(elapsed))*characters.length)],x,y);
      }
      front.font='11px ui-monospace, monospace';
    }
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
