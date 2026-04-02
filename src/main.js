// ═══════════════════════════════════════════════════════
//   MAIN APP ENTRY - SPIDER-OS
// ═══════════════════════════════════════════════════════
import { Store } from './js/state/store.js';
import { Router } from './js/ui/router.js';
import { Animations } from './js/ui/animations.js';
import { AudioEngine } from './js/ui/audio.js';
import { AI } from './js/ai/gemini.js';
import { loginWithGoogle, login, register, logOut } from './js/state/firebase.js';
import { Habits } from './js/pages/habits.js';
import { Gym } from './js/pages/gym.js';
import { Nutrition } from './js/pages/nutrition.js';
import { Water } from './js/pages/water.js';
import { Calendar } from './js/pages/calendar.js';

// Initialization sequence
document.addEventListener('DOMContentLoaded', () => {
  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  }

  AudioEngine.init();
  Store.init();
  Router.init();
  Habits.init();
  Gym.init();
  Nutrition.init();
  Water.init();
  Calendar.init();
  
  // Set toggle state
  const skipToggle = document.getElementById('skip-intro-toggle');
  if(skipToggle) skipToggle.checked = localStorage.getItem('spiderOS_skipIntro') === 'true';

  Animations.initIntro(document.getElementById('intro-canvas'));
  Animations.drawWebBg('web-canvas');
  Animations.initParticles('pts');

  runIntroSequence();
  setupCoachUI();
  setupAuthUI();
});

// Intro Animation orchestration
function runIntroSequence() {
  const intro = document.getElementById('intro');
  const skip = localStorage.getItem('spiderOS_skipIntro') === 'true';
  
  if(skip || !intro || intro.style.display === 'none') {
    if(intro) intro.style.display = 'none';
    launchApp();
    return;
  }
  
  const bar = document.getElementById('load-bar');
  const txt = document.getElementById('load-txt');
  const steps = ['INITIALIZING...','LOADING SPIDER SENSE...','CALIBRATING MULTIVERSE...','SYNCING PERFORMANCE DATA...','READY'];
  let pct = 0, si = 0, iRAF;

  const iloop = () => {Animations.drawIntro(); iRAF = requestAnimationFrame(iloop);};
  iloop();

  const lint = setInterval(() => {
    pct += Math.random()*2.8 + .8;
    if(pct > 100) pct = 100;
    if(bar) bar.style.width = pct + '%';
    const ni = Math.min(Math.floor(pct/20), steps.length-1);
    if(ni !== si && txt){ si = ni; txt.textContent = steps[si]; }
    
    if(pct >= 100){
      clearInterval(lint);
      setTimeout(() => {
        cancelAnimationFrame(iRAF);
        const fl = document.getElementById('flash');
        if(fl) {
          fl.style.opacity = '.35';
          fl.style.transition = 'opacity .08s';
          setTimeout(() => {
            fl.style.opacity = '0';
            fl.style.transition = 'opacity .4s';
            intro.style.transition = 'opacity .65s ease, transform .65s ease';
            intro.style.opacity = '0';
            intro.style.transform = 'scale(1.06) translateZ(0)';
            setTimeout(() => {
              intro.style.display = 'none';
              launchApp();
            }, 650);
          }, 100);
        } else {
           intro.style.display = 'none'; launchApp();
        }
      }, 520);
    }
  }, 75);

  setTimeout(() => document.getElementById('intro-logo')?.classList.add('show'), 700);
  setTimeout(() => Animations.swingSpider(), 400);
  
  const skipBtn = document.getElementById('intro-skip');
  if(skipBtn) skipBtn.onclick = () => {
    clearInterval(lint); cancelAnimationFrame(iRAF);
    intro.style.display = 'none'; launchApp();
  };
}

function launchApp() {
  document.getElementById('app').style.display = 'block';
  document.getElementById('coach-fab').classList.add('vis');
  
  // Example dummy auto prompt
  setTimeout(() => {
    addCoachMessage('ai', "Hey! 🕷️ I'm your Gemini AI Coach. Connect your API key in Settings and sign in with Google in the Account tab to sync your multiversal data!");
  }, 2000);
}

// ─── COACH UI ───
let coachOpen = false;
window.toggleCoach = () => {
  coachOpen = !coachOpen;
  const p = document.getElementById('coach-panel');
  p.style.display = coachOpen ? 'flex' : 'none';
  p.classList.toggle('open', coachOpen);
  if(coachOpen) document.getElementById('fab-badge').classList.remove('show');
  AudioEngine.play('click');
};

function addCoachMessage(role, text) {
  const msgs = document.getElementById('coach-msgs');
  const tyInd = document.getElementById('typing-ind');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const fmt = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  div.innerHTML = `<div class="msg-bub">${fmt}</div><div class="msg-time">${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>`;
  msgs.insertBefore(div, tyInd);
  msgs.scrollTop = msgs.scrollHeight;
  if(role === 'user') AudioEngine.play('click');
  else AudioEngine.play('success');
}

function setupCoachUI() {
  window.sendMsg = async () => {
    const inp = document.getElementById('coach-inp');
    const msg = inp.value.trim();
    if(!msg) return;
    inp.value = '';
    addCoachMessage('user', msg);
    
    document.getElementById('typing-ind').style.display = 'flex';
    document.getElementById('coach-msgs').scrollTop = 99999;

    const response = await AI.askCoach(msg, Store.data);
    
    document.getElementById('typing-ind').style.display = 'none';
    addCoachMessage('ai', response);
  };
}

// ─── AUTHENTICATION UI ───
function setupAuthUI() {
  const updateDots = (online) => {
    const actDot = document.getElementById('sb-status-dot');
    if (actDot) {
      actDot.style.background = online ? 'var(--grn)' : 'var(--red)';
      actDot.style.boxShadow = online ? '0 0 8px rgba(0,230,118,0.5)' : 'none';
      actDot.title = online ? 'Online - Synced' : 'Offline';
    }
  };

  // Listen for global auth state
  document.addEventListener('auth:status', e => {
    const { authorized, email } = e.detail;
    const badge = document.getElementById('sync-badge');
    if (authorized) {
      if(badge) { badge.textContent = "SYNCED"; badge.className = "badge b-act"; }
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('profile-panel').style.display = 'block';
      document.getElementById('user-nm').textContent = email.split('@')[0];
      document.getElementById('user-em').textContent = email;
      updateDots(true);
      AudioEngine.play('success');
    } else {
      if(badge) { badge.textContent = "OFFLINE"; badge.className = "badge b-lck"; }
      document.getElementById('profile-panel').style.display = 'none';
      document.getElementById('auth-panel').style.display = 'block';
      updateDots(false);
    }
  });

  window.authGoogle = async () => {
    AudioEngine.play('click');
    try {
      await loginWithGoogle();
      alert("Logged in successfully. Cloud sync is active!");
    } catch(err) {
      if(err.code === 'auth/unauthorized-domain') {
        alert("Firebase Domain Error!\n\nTo login, you must go to your Firebase Console -> Authentication -> Settings -> Authorized Domains and add 'amdspider.github.io' to the whitelist.");
      } else {
        alert("Error logging in: " + err.message);
      }
    }
  };

  window.authEmail = async () => {
    AudioEngine.play('click');
    const em = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pass').value;
    if(!em || !pw) return alert("Enter email and password");
    try {
      await login(em, pw);
      alert("Logged in securely!");
    } catch(err) { alert(err.message); }
  };

  window.authRegister = async () => {
    AudioEngine.play('click');
    const em = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pass').value;
    if(!em || !pw) return alert("Enter email and password");
    try {
      await register(em, pw);
      alert("Account created and logged in!");
    } catch(err) { alert(err.message); }
  };

  window.authSignOut = async () => {
    AudioEngine.play('click');
    await logOut();
  };

  window.syncCloud = () => { AudioEngine.play('success'); Store.syncToCloud(); alert("Synced to cloud!"); };
  window.loadCloud = () => { AudioEngine.play('nav'); Store.init(); alert("Loaded from cloud!"); };
  
  window.clearAllData = () => {
    if(confirm("DANGER! This will delete ALL your local data history. Are you absolutely sure?")) {
      localStorage.removeItem('spiderOS_v4');
      location.reload();
    }
  };

  window.quickAsk = (msg) => {
    const inp = document.getElementById('coach-inp');
    if(inp) { inp.value = msg; window.sendMsg(); }
  };

  // Coach Badge dot
  window.updateKeyStatus = () => {
    const dot = document.getElementById('coach-pulse');
    const kbadge = document.getElementById('key-status-badge');
    const key = localStorage.getItem('spider_gemini_key') || '';
    if(key) {
      if(dot) { dot.style.background = 'var(--bl3)'; dot.style.boxShadow = '0 0 10px rgba(0,176,255,0.6)'; }
      if(kbadge) { kbadge.textContent = 'KEY SAVED'; kbadge.className = 'badge b-act'; }
    } else {
      if(dot) { dot.style.background = 'var(--red)'; dot.style.boxShadow = 'none'; }
      if(kbadge) { kbadge.textContent = 'NO KEY'; kbadge.className = 'badge b-lck'; }
    }
  };
  setTimeout(window.updateKeyStatus, 500);
}

// Ensure the cursor follows
const cur=document.getElementById('cur'), ring=document.getElementById('cur-ring');
if(cur && ring) {
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.cssText+=`;left:${mx}px;top:${my}px`});
  (function ar(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(ar)})();
  document.addEventListener('mousedown',()=>{cur.style.transform='translate(-50%,-50%) scale(1.9) translateZ(0)';ring.style.width='22px';ring.style.height='22px'});
  document.addEventListener('mouseup',()=>{cur.style.transform='translate(-50%,-50%) scale(1) translateZ(0)';ring.style.width='34px';ring.style.height='34px'});
}

// Export useful globals for inline HTML backwards compatibility
window.saveAppPrefs = () => {
  const skip = document.getElementById('skip-intro-toggle')?.checked || false;
  localStorage.setItem('spiderOS_skipIntro', skip);
  AudioEngine.play('success');
};

window.saveApiKey = () => {
  const inp = document.getElementById('api-key-input').value;
  localStorage.setItem('spider_gemini_key', inp);
  window.updateKeyStatus();
  alert("Gemini key saved securely!");
};
window.removeApiKey = () => {
  localStorage.removeItem('spider_gemini_key');
  document.getElementById('api-key-input').value = '';
  window.updateKeyStatus();
  alert("Gemini key removed.");
};
window.toggleShowKey = (show) => {
  const inp = document.getElementById('api-key-input');
  if(inp) inp.type = show ? 'text' : 'password';
};
window.saveAudioSettings = () => {
  const sfxOn = document.getElementById('audio-toggle').checked;
  const sfxPack = document.getElementById('audio-pack').value;
  AudioEngine.saveSettings(sfxOn, sfxPack, 0.3);
};
