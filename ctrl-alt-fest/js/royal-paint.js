const NS = 'http://www.w3.org/2000/svg';
const strokePath = 'M18 333 C135 346 198 326 300 337 S470 357 561 340 S729 331 803 340 S922 347 982 328';

export class RoyalPaintEffects {
  constructor(title) {
    this.title = title;
    this.host = title.closest('.royal-hero');
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.pointer = null;
    this.frame = 0;
    this.last = 0;
    this.waveStart = null;
    this.crownState = {x:0,y:0,vx:0,vy:0};
    this.abort = new AbortController();
    this.layer = document.createElement('div');
    this.layer.className = 'rpe-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    this.layer.innerHTML = `<img class="rpe-texture" src="assets/images/royal-paint-overlay.png" alt="" draggable="false"><img class="rpe-crown" src="assets/images/royal-paint-overlay.png" alt="" draggable="false"><svg class="rpe-art" viewBox="0 0 1000 360" preserveAspectRatio="none" fill="currentColor"><g class="rpe-droplets"></g><g class="rpe-brush"><path class="rpe-stroke" d="${strokePath}"/><path class="rpe-stroke rpe-stroke-fine" d="M35 337 Q170 330 291 341 T555 344 T802 342 T959 337"/></g></svg><span class="rpe-card-mark">K<span>&spades;</span><i></i></span><span class="rpe-card-mark rpe-card-mark-end">K<span>&hearts;</span><i></i></span>`;
    this.host.append(this.layer);
    this.crown = this.layer.querySelector('.rpe-crown');
    this.brush = this.layer.querySelector('.rpe-brush');
    const stroke=this.brush.firstElementChild, length=stroke.getTotalLength();
    this.strokePoints=Array.from({length:121},(_,i)=>stroke.getPointAtLength(length*i/120));
    this.droplets = [];
    let seed = 19;
    const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    const clusters = [[35,300,49,39],[535,323,97,23],[962,123,37,83]];
    for (let i=0;i<48;i++) {
      const [cx,cy,sx,sy] = clusters[i%3];
      const x=cx+(rand()-.5)*sx*2, y=cy+(rand()-.5)*sy*2;
      const dot=document.createElementNS(NS,'ellipse');
      dot.setAttribute('cx',x); dot.setAttribute('cy',y);
      dot.setAttribute('rx',.7+rand()*2.2); dot.setAttribute('ry',.8+rand()*2.6);
      this.layer.querySelector('.rpe-droplets').append(dot);
      this.droplets.push({node:dot,ox:x,oy:y,x:0,y:0,vx:0,vy:0});
    }
    this.measure = () => {
      const range=document.createRange(); range.selectNodeContents(title);
      const text=range.getBoundingClientRect(), h=title.getBoundingClientRect(), host=this.host.getBoundingClientRect();
      this.layer.style.cssText=`left:${text.left-host.left}px;top:${h.top-host.top}px;width:${text.width}px;height:${h.height}px`;
      this.width=text.width; this.height=h.height;
    };
    this.resize = new ResizeObserver(this.measure); this.resize.observe(title);
    this.measure();
    const options={signal:this.abort.signal,passive:true};
    this.host.addEventListener('pointermove',event=>{
      if(this.motion.matches || event.pointerType==='touch') return;
      const r=this.layer.getBoundingClientRect();
      this.pointer={x:event.clientX-r.left,y:event.clientY-r.top};
      const nearBrush=this.pointer.y>this.height*.87 && this.pointer.y<this.height*1.04 && this.pointer.x>0 && this.pointer.x<this.width;
      if(nearBrush && !this.brushHovered) this.waveStart=performance.now();
      this.brushHovered=nearBrush; this.wake();
    },options);
    this.host.addEventListener('pointerleave',()=>{this.pointer=null;this.brushHovered=false;this.wake();},options);
    this.motion.addEventListener('change',()=>{this.pointer=null;this.waveStart=null;this.reset();},options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.pointer=null;this.reset();}},options);
  }
  wake() { if(!this.frame && !this.motion.matches) {this.last=performance.now();this.frame=requestAnimationFrame(t=>this.tick(t));} }
  tick(time) {
    this.frame=0;
    const dt=Math.min((time-this.last)/16.667,2); this.last=time;
    let active=false;
    const spring=(s,tx,ty)=>{
      s.vx=(s.vx+(tx-s.x)*.065*dt)*Math.pow(.76,dt);
      s.vy=(s.vy+(ty-s.y)*.065*dt)*Math.pow(.76,dt);
      s.x+=s.vx*dt; s.y+=s.vy*dt;
      if(Math.abs(tx-s.x)+Math.abs(ty-s.y)+Math.abs(s.vx)+Math.abs(s.vy)>.02) active=true;
    };
    for(const p of this.droplets) {
      let tx=0,ty=0;
      if(this.pointer) {
        const dx=p.ox/1000*this.width-this.pointer.x,dy=p.oy/360*this.height-this.pointer.y;
        const distance=Math.hypot(dx,dy);
        if(distance<120) {const force=22*(1-distance/120)**2;tx=(distance?dx/distance:1)*force;ty=(distance?dy/distance:0)*force;}
      }
      spring(p,tx,ty);
      p.node.setAttribute('transform',`translate(${p.x*1000/this.width} ${p.y*360/this.height})`);
    }
    const cx=this.width*.08,cy=this.height*.03;
    const near=this.pointer && Math.hypot(this.pointer.x-cx,this.pointer.y-cy)<220;
    spring(this.crownState,near?Math.max(-6,Math.min(6,(this.pointer.x-cx)/25)):0,near?Math.max(-4,Math.min(4,(this.pointer.y-cy)/35)):0);
    this.crown.style.transform=`translateY(${this.crownState.y}px) rotate(${this.crownState.x}deg)`;
    if(this.waveStart!==null) {
      const progress=(time-this.waveStart)/900;
      if(progress>=1) {this.waveStart=null;this.brush.firstElementChild.setAttribute('d',strokePath);}
      else {
        let path='';
        for(const [i,point] of this.strokePoints.entries()) {
          const {x,y}=point;
          const envelope=Math.exp(-(((x/1000-progress)*9)**2))*Math.sin(Math.PI*progress);
          path+=`${i===0?'M':'L'}${x} ${y+3*Math.sin(x/23-progress*9)*envelope} `;
        }
        this.brush.firstElementChild.setAttribute('d',path); active=true;
      }
    }
    if(active) this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  reset() {
    cancelAnimationFrame(this.frame);this.frame=0;
    for(const p of [...this.droplets,this.crownState]) p.x=p.y=p.vx=p.vy=0;
    this.droplets.forEach(p=>p.node.removeAttribute('transform'));
    this.crown.style.removeProperty('transform');this.brush.firstElementChild.setAttribute('d',strokePath);
  }
  destroy() {this.reset();this.abort.abort();this.resize.disconnect();this.layer.remove();}
}

const title=document.querySelector('.home-page #hero-title');
let effects;
function mount() {if(title && !effects) effects=new RoyalPaintEffects(title);}
if(title) {
  document.fonts.ready.then(()=>{mount();effects?.measure();});
  window.addEventListener('pagehide',()=>{effects?.destroy();effects=null;});
  window.addEventListener('pageshow',mount);
}
