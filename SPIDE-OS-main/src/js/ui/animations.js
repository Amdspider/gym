// ═══════════════════════════════════════════════════════
//   ANIMATIONS ENGINE - Canvas & Intro Sequence
// ═══════════════════════════════════════════════════════

export const Animations = {
  iRAF: null,
  iParticles: [],
  iWebs: [],
  iFrame: 0,
  IW: 0,
  IH: 0,
  ictx: null,

  initIntro(canvasElement) {
    if(!canvasElement) return;
    this.ictx = canvasElement.getContext('2d', { alpha: false });
    this.IW = canvasElement.width = window.innerWidth;
    this.IH = canvasElement.height = window.innerHeight;
    
    for(let i=0; i<20; i++){
      const a = (i/20)*Math.PI*2;
      this.iWebs.push({
        a, len:0, maxLen:Math.max(this.IW,this.IH)*.85,
        spd:Math.random()*10+7, alpha:Math.random()*.28+.06,
        col:Math.random()<.7?'230,51,41':'41,121,255'
      });
    }
    
    for(let i=0; i<80; i++){
      this.iParticles.push({
        x:this.IW/2, y:this.IH/2, vx:(Math.random()-.5)*7, vy:(Math.random()-.5)*7,
        life:0, maxL:Math.random()*70+40, sz:Math.random()*2.5+.8,
        col:Math.random()<.65?'230,51,41':Math.random()<.5?'0,176,255':'255,214,0'
      });
    }

    // Bind resize
    window.addEventListener('resize', () => {
      if(document.getElementById('intro').style.display !== 'none') {
        this.IW = canvasElement.width = window.innerWidth;
        this.IH = canvasElement.height = window.innerHeight;
      }
    });
  },

  drawIntro() {
    this.ictx.fillStyle = `rgba(0,0,0,${this.iFrame<30?.25:.05})`;
    this.ictx.fillRect(0,0,this.IW,this.IH);
    const cx = this.IW/2, cy = this.IH/2;

    this.iWebs.forEach(w => {
      if (w.len < w.maxLen) w.len += w.spd * (1 + this.iFrame*.008);
      this.ictx.beginPath(); this.ictx.moveTo(cx,cy);
      this.ictx.lineTo(cx + Math.cos(w.a)*w.len, cy + Math.sin(w.a)*w.len);
      this.ictx.strokeStyle = `rgba(${w.col},${w.alpha})`;
      this.ictx.lineWidth = .9; this.ictx.stroke();
    });

    const rings = Math.min(Math.floor((this.iFrame-10)/12), 10);
    for(let r=1; r<=rings; r++){
      const rad = r*55;
      this.ictx.beginPath(); this.ictx.arc(cx,cy,rad,0,Math.PI*2);
      this.ictx.strokeStyle = `rgba(230,51,41,${.18/r})`; this.ictx.lineWidth=.9; this.ictx.stroke();
      
      for(let i=0; i<20; i++){
        const a1=(i/20)*Math.PI*2, a2=((i+1)/20)*Math.PI*2;
        const r1=(r-1)*55, r2=r*55;
        if(r1===0) continue;
        this.ictx.beginPath();
        this.ictx.moveTo(cx+Math.cos(a1)*r1, cy+Math.sin(a1)*r1);
        this.ictx.lineTo(cx+Math.cos(a1)*r2, cy+Math.sin(a1)*r2);
        this.ictx.strokeStyle = `rgba(230,51,41,.07)`;
        this.ictx.lineWidth = .5; this.ictx.stroke();
      }
    }

    this.iParticles.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.life++; p.vx*=.979; p.vy*=.979;
      const al = Math.max(0, 1 - p.life/p.maxL)*.65;
      this.ictx.beginPath(); this.ictx.arc(p.x, p.y, p.sz, 0, Math.PI*2);
      this.ictx.fillStyle = `rgba(${p.col},${al})`; this.ictx.fill();
      if(p.life > p.maxL){
        p.x=cx; p.y=cy; p.vx=(Math.random()-.5)*7; p.vy=(Math.random()-.5)*7; p.life=0;
      }
    });

    const pr = 65 + Math.sin(this.iFrame*.045)*22;
    const gr = this.ictx.createRadialGradient(cx,cy,0,cx,cy,pr);
    gr.addColorStop(0,'rgba(230,51,41,.28)'); gr.addColorStop(.55,'rgba(230,51,41,.07)'); gr.addColorStop(1,'transparent');
    this.ictx.beginPath(); this.ictx.arc(cx,cy,pr,0,Math.PI*2); this.ictx.fillStyle=gr; this.ictx.fill();
    this.iFrame++;
  },

  swingSpider() {
    const sp = document.getElementById('swing');
    if(!sp) return;
    sp.style.display = 'block';
    let t = 0;
    const startX = this.IW + 60, endX = -60;
    
    const step = () => {
      t += .018;
      const progress = t/4;
      const x = startX + (endX-startX)*progress;
      const y = this.IH*.28 + Math.sin(t*2.5)*120;
      sp.style.left = x+'px'; sp.style.top = y+'px';
      sp.style.opacity = Math.min(1, t*3);
      sp.style.transform = `translate(-50%,-50%) rotate(${Math.sin(t*2.5)*18}deg) scale(${1+Math.sin(t*5)*.06}) translateZ(0)`;
      if (progress < 1) requestAnimationFrame(step);
      else sp.style.opacity = '0';
    };
    sp.style.position = 'absolute';
    step();
  },

  drawWebBg(canvasId) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const ctx = cv.getContext('2d', { alpha: true });
    
    const draw = () => {
      cv.width = window.innerWidth; cv.height = window.innerHeight;
      const W = cv.width, H = cv.height;
      ctx.clearRect(0,0,W,H);
      
      const corner = (ox,oy,sz,q) => {
        const sx = q.includes('r')?-1:1, sy = q.includes('b')?-1:1;
        ctx.strokeStyle = 'rgba(230,51,41,.1)'; ctx.lineWidth = .75;
        for(let i=0; i<=8; i++){
          const a = (i/8)*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(ox,oy);
          ctx.lineTo(ox+sx*Math.cos(a)*sz, oy+sy*Math.sin(a)*sz); ctx.stroke();
        }
        for(let r=1; r<=6; r++){
          const rd = (r/6)*sz;
          ctx.beginPath();
          if(q==='tl') ctx.arc(ox,oy,rd,0,Math.PI/2);
          else if(q==='tr') ctx.arc(ox,oy,rd,Math.PI/2,Math.PI);
          else if(q==='br') ctx.arc(ox,oy,rd,Math.PI,Math.PI*1.5);
          else ctx.arc(ox,oy,rd,Math.PI*1.5,Math.PI*2);
          ctx.stroke();
        }
      };
      corner(0,0,270,'tl'); corner(W,0,210,'tr'); corner(0,H,180,'bl'); corner(W,H,155,'br');
      
      ctx.strokeStyle = 'rgba(230,51,41,.022)'; ctx.lineWidth = 1;
      for(let r=100; r<Math.max(W,H)*.7; r+=100) { ctx.beginPath(); ctx.arc(W/2,H/2,r,0,Math.PI*2); ctx.stroke(); }
      for(let a=0; a<Math.PI*2; a+=Math.PI/8) { ctx.beginPath(); ctx.moveTo(W/2,H/2); ctx.lineTo(W/2+Math.cos(a)*W, H/2+Math.sin(a)*H); ctx.stroke(); }
    };
    draw();
    window.addEventListener('resize', draw);
  },

  initParticles(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    const cols = ['rgba(230,51,41,','rgba(41,121,255,','rgba(0,176,255,','rgba(255,214,0,'];
    for(let i=0; i<18; i++){
      const p = document.createElement('div');
      const s = Math.random()*2.8+.8;
      const col = cols[~~(Math.random()*cols.length)];
      p.className = 'pt';
      p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;background:${col}${Math.random()*.5+.28});animation-duration:${Math.random()*14+9}s;animation-delay:${Math.random()*10}s;box-shadow:0 0 ${s*3}px ${col}.8)`;
      c.appendChild(p);
    }
  }
};
