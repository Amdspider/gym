// ═══════════════════════════════════════════════════════
//   MAIN APP ENTRY - SPIDER-OS
// ═══════════════════════════════════════════════════════
import { Store } from './js/state/store.js';
import { Router } from './js/ui/router.js';
import { Animations } from './js/ui/animations.js';
import { AudioEngine } from './js/ui/audio.js';
import { AI } from './js/ai/gemini.js';
import { login, register, loginWithGoogle, logOut, pullStateFromCloud } from './js/state/firebase.js';
import { Nutrition } from './js/pages/nutrition.js';
import { Habits } from './js/pages/habits.js';
import { Water } from './js/pages/water.js';
import { Gym } from './js/pages/gym.js';
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
  Nutrition.init();
  Habits.init();
  Water.init();
  Gym.init();
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
  setupSettingsUI();
  updateConnectivityIndicator();

  // Listen for nav:goto from habits module
  document.addEventListener('nav:goto', (e) => {
    Router.goTo(e.detail.page);
  });

  // Monitor connectivity
  window.addEventListener('online', updateConnectivityIndicator);
  window.addEventListener('offline', updateConnectivityIndicator);
});

// ─── CONNECTIVITY INDICATOR ───
function updateConnectivityIndicator() {
  const dot = document.getElementById('coach-status-dot');
  const label = document.getElementById('coach-status-label');
  const isOnline = navigator.onLine;
  const hasKey = !!localStorage.getItem('spider_gemini_key');

  if (dot) {
    if (isOnline && hasKey) {
      dot.className = 'status-dot online';
    } else if (isOnline) {
      dot.className = 'status-dot idle';
    } else {
      dot.className = 'status-dot offline';
    }
  }
  if (label) {
    if (isOnline && hasKey) {
      label.textContent = 'ONLINE';
      label.style.color = 'var(--grn)';
    } else if (isOnline) {
      label.textContent = 'NO API KEY';
      label.style.color = 'var(--gld)';
    } else {
      label.textContent = 'OFFLINE';
      label.style.color = 'var(--red)';
    }
  }

  // Update sidebar account dot
  const accDot = document.getElementById('account-status-dot');
  if (accDot) {
    accDot.className = Store.currentUser ? 'sidebar-dot synced' : 'sidebar-dot offline';
  }
}

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
  
  setTimeout(() => {
    addCoachMessage('ai', "Hey! 🕷️ I'm your Gemini AI Coach. Connect your API key in Settings and sign in via the Account tab to sync your data across devices!");
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

  window.quickAsk = (question) => {
    document.getElementById('coach-inp').value = question;
    window.sendMsg();
  };
}

// ─── AUTHENTICATION UI ───
function setupAuthUI() {
  // Listen for global auth state
  document.addEventListener('auth:status', e => {
    const { authorized, email } = e.detail;
    const badge = document.getElementById('sync-badge');
    if (authorized) {
      if(badge) { badge.textContent = "SYNCED"; badge.className = "badge b-act"; }
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('profile-panel').style.display = 'block';
      const userName = email.split('@')[0];
      document.getElementById('user-nm').textContent = userName;
      document.getElementById('user-em').textContent = email;
      document.getElementById('user-av').textContent = userName.charAt(0).toUpperCase();
      document.getElementById('last-sync').textContent = 'Last sync: ' + new Date().toLocaleString();
      AudioEngine.play('success');
      updateConnectivityIndicator();
    } else {
      if(badge) { badge.textContent = "OFFLINE"; badge.className = "badge b-lck"; }
      document.getElementById('profile-panel').style.display = 'none';
      document.getElementById('auth-panel').style.display = 'block';
      updateConnectivityIndicator();
    }
  });

  window.authGoogle = async () => {
    AudioEngine.play('click');
    try {
      await loginWithGoogle();
      showToast('good', '☁️', 'SIGNED IN', 'Cloud sync is now active!');
    } catch(err) {
      if(err.code === 'auth/unauthorized-domain') {
        showToast('warn', '⚠️', 'DOMAIN ERROR', 'Add your domain to Firebase Console → Auth → Authorized Domains');
      } else {
        showToast('warn', '❌', 'LOGIN FAILED', err.message);
      }
    }
  };

  window.authEmail = async () => {
    AudioEngine.play('click');
    const email = document.getElementById('auth-email')?.value.trim();
    const pass = document.getElementById('auth-pass')?.value;
    if (!email || !pass) { showToast('warn', '⚠️', 'MISSING FIELDS', 'Enter email and password'); return; }
    try {
      await login(email, pass);
      showToast('good', '✅', 'LOGGED IN', 'Welcome back! Syncing your data...');
    } catch(err) {
      showToast('warn', '❌', 'LOGIN FAILED', err.message);
    }
  };

  window.authRegister = async () => {
    AudioEngine.play('click');
    const email = document.getElementById('auth-email')?.value.trim();
    const pass = document.getElementById('auth-pass')?.value;
    if (!email || !pass) { showToast('warn', '⚠️', 'MISSING FIELDS', 'Enter email and password'); return; }
    if (pass.length < 6) { showToast('warn', '⚠️', 'WEAK PASSWORD', 'Password must be at least 6 characters'); return; }
    try {
      await register(email, pass);
      showToast('good', '🎉', 'REGISTERED', 'Account created! Your data is now syncing to the cloud.');
    } catch(err) {
      showToast('warn', '❌', 'REGISTRATION FAILED', err.message);
    }
  };

  window.authSignOut = async () => {
    AudioEngine.play('click');
    await logOut();
    showToast('info', '👋', 'SIGNED OUT', 'You are now in offline mode.');
  };

  window.syncCloud = async () => {
    AudioEngine.play('click');
    if (!Store.currentUser) {
      showToast('warn', '⚠️', 'NOT SIGNED IN', 'Sign in first to sync data.');
      return;
    }
    Store.syncToCloud();
    document.getElementById('last-sync').textContent = 'Last sync: ' + new Date().toLocaleString();
    showToast('good', '☁️', 'SYNCED', 'Data pushed to cloud successfully!');
  };

  window.loadCloud = async () => {
    AudioEngine.play('click');
    if (!Store.currentUser) {
      showToast('warn', '⚠️', 'NOT SIGNED IN', 'Sign in first to load data.');
      return;
    }
    try {
      const cloudState = await pullStateFromCloud(Store.currentUser.uid);
      if (cloudState) {
        Store.data = { ...Store.data, ...cloudState };
        Store.saveLocal();
        showToast('good', '⬇️', 'LOADED', 'Cloud data loaded successfully!');
      } else {
        showToast('info', 'ℹ️', 'NO DATA', 'No cloud data found for your account.');
      }
    } catch (err) {
      showToast('warn', '❌', 'LOAD FAILED', err.message);
    }
  };

  window.toggleAutoSync = (checked) => {
    localStorage.setItem('spiderOS_autoSync', checked);
    AudioEngine.play('toggle');
  };

  window.clearAllData = () => {
    if (!confirm('⚠️ Are you sure? This will erase ALL your local data including habits, history, nutrition, and settings.')) return;
    localStorage.removeItem('spiderOS_v4');
    location.reload();
  };
}

// ─── SETTINGS UI ───
function setupSettingsUI() {
  window.updateKeyStatus = () => {
    const inp = document.getElementById('api-key-input');
    const badge = document.getElementById('key-status-badge');
    if (inp && badge) {
      if (inp.value.trim().length > 10) {
        badge.textContent = 'KEY ENTERED';
        badge.style.background = 'rgba(0,230,118,.09)';
        badge.style.color = 'var(--grn)';
        badge.style.borderColor = 'rgba(0,230,118,.22)';
      } else {
        badge.textContent = 'NO KEY';
        badge.style.background = 'rgba(255,255,255,.05)';
        badge.style.color = 'var(--mut)';
        badge.style.borderColor = 'var(--br)';
      }
    }
  };

  window.toggleShowKey = (show) => {
    const inp = document.getElementById('api-key-input');
    if (inp) inp.type = show ? 'text' : 'password';
  };

  // Load existing key status
  const savedKey = localStorage.getItem('spider_gemini_key');
  const badge = document.getElementById('key-status-badge');
  const storedDisplay = document.getElementById('key-stored-display');
  const removeBtn = document.getElementById('remove-key-btn');

  if (savedKey) {
    if (badge) {
      badge.textContent = 'KEY SAVED';
      badge.style.background = 'rgba(0,230,118,.09)';
      badge.style.color = 'var(--grn)';
      badge.style.borderColor = 'rgba(0,230,118,.22)';
    }
    if (storedDisplay) {
      storedDisplay.innerHTML = `<span style="color:var(--grn)">✅ Key saved</span> — <span style="color:var(--mut);font-family:monospace;font-size:11px">${savedKey.substring(0, 8)}${'•'.repeat(20)}</span>`;
    }
    if (removeBtn) removeBtn.style.display = 'block';
  } else {
    if (storedDisplay) {
      storedDisplay.innerHTML = `<span style="color:var(--mut)">No key saved</span>`;
    }
  }

  // Render cloud stats
  const cloudStats = document.getElementById('cloud-stats');
  if (cloudStats) {
    document.addEventListener('store:changed', () => {
      const history = Store.data.history || {};
      const days = Object.keys(history).length;
      const habits = (Store.data.habits || []).length;
      const foods = Object.keys(Store.data.foodDatabase || {}).length;
      cloudStats.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:7px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--bl3)">${days}</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px">DAYS</div>
          </div>
          <div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:7px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--red)">${habits}</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px">HABITS</div>
          </div>
          <div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:7px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--gld)">${foods}</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px">FOODS</div>
          </div>
        </div>`;
    });
  }

  // Render history page
  document.addEventListener('store:changed', () => renderHistory());
  document.addEventListener('nav:changed', (e) => {
    if (e.detail.page === 'history') renderHistory();
  });
}

function renderHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;

  const history = Store.data.history || {};
  const keys = Object.keys(history).sort().reverse();

  if (keys.length === 0) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--mut)">No history yet. Start tracking today!</div>`;
    return;
  }

  el.innerHTML = keys.slice(0, 30).map(key => {
    const day = history[key];
    const date = new Date(key);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const doneCount = (day.done || []).length;
    const total = (Store.data.habits || []).length;

    return `
      <div class="card" style="margin-bottom:8px;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-family:var(--fd);font-size:11px;color:var(--mut);letter-spacing:1px">${dayNames[date.getDay()]} · ${key}</div>
            <div style="font-size:13px;font-weight:700;margin-top:3px">Score: <span style="color:var(--red)">${day.score || 0}</span></div>
          </div>
          <div style="display:flex;gap:12px;font-size:11px">
            <span style="color:var(--red)">${doneCount}/${total} habits</span>
            <span style="color:var(--bl3)">${day.water || 0} 💧</span>
            <span style="color:var(--gld)">${day.calories || 0} kcal</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── TOAST SYSTEM ───
function showToast(type, icon, title, message) {
  const zone = document.getElementById('alert-zone');
  if (!zone) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-ico">${icon}</span>
    <div><div class="toast-t">${title}</div><div class="toast-m">${message}</div></div>`;
  zone.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
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
  showToast('good', '🔑', 'KEY SAVED', 'Gemini key saved securely on this device!');
  updateConnectivityIndicator();
  
  // Update UI
  const badge = document.getElementById('key-status-badge');
  if (badge) {
    badge.textContent = 'KEY SAVED';
    badge.style.background = 'rgba(0,230,118,.09)';
    badge.style.color = 'var(--grn)';
    badge.style.borderColor = 'rgba(0,230,118,.22)';
  }
  const storedDisplay = document.getElementById('key-stored-display');
  if (storedDisplay) {
    storedDisplay.innerHTML = `<span style="color:var(--grn)">✅ Key saved</span> — <span style="color:var(--mut);font-family:monospace;font-size:11px">${inp.substring(0, 8)}${'•'.repeat(20)}</span>`;
  }
  const removeBtn = document.getElementById('remove-key-btn');
  if (removeBtn) removeBtn.style.display = 'block';
};

window.removeApiKey = () => {
  localStorage.removeItem('spider_gemini_key');
  document.getElementById('api-key-input').value = '';
  showToast('info', '🗑️', 'KEY REMOVED', 'Gemini key removed from this device.');
  updateConnectivityIndicator();
  
  const badge = document.getElementById('key-status-badge');
  if (badge) {
    badge.textContent = 'NO KEY';
    badge.style.background = 'rgba(255,255,255,.05)';
    badge.style.color = 'var(--mut)';
    badge.style.borderColor = 'var(--br)';
  }
  const storedDisplay = document.getElementById('key-stored-display');
  if (storedDisplay) storedDisplay.innerHTML = `<span style="color:var(--mut)">No key saved</span>`;
  const removeBtn = document.getElementById('remove-key-btn');
  if (removeBtn) removeBtn.style.display = 'none';
};

window.saveAudioSettings = () => {
  const sfxOn = document.getElementById('audio-toggle').checked;
  const sfxPack = document.getElementById('audio-pack').value;
  AudioEngine.saveSettings(sfxOn, sfxPack, 0.3);
};
