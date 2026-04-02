// ═══════════════════════════════════════════════════════
//   HABITS MODULE - Daily Discipline Tracker
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

export const Habits = {
  init() {
    // Wire global handlers for inline HTML calls
    window.openAddHabit    = () => this.openAddHabitModal();
    window.confirmAddHabit = () => this.confirmAddHabit();
    window.closeModal      = (id) => this.closeModal(id);
    window.go              = (page) => {
      // Delegate to Router via import
      document.dispatchEvent(new CustomEvent('nav:goto', { detail: { page } }));
    };

    // Re-render on every store change
    document.addEventListener('store:changed', () => this.renderAll());

    // Initial render
    this.renderAll();
  },

  // ─────────────────────────────────────────────────────
  //  MASTER RENDER
  // ─────────────────────────────────────────────────────
  renderAll() {
    this.renderHabitList();
    this.renderOverviewHabits();
    this.renderWeekGrid('wk-habits');
    this.renderWeekGrid('wk-ov');
    this.renderHabitStats();
    this.renderOverviewScores();
    this.updateDate();
  },

  // ─────────────────────────────────────────────────────
  //  RENDER TODAY'S HABIT LIST
  // ─────────────────────────────────────────────────────
  renderHabitList() {
    const list = document.getElementById('habit-list');
    const empty = document.getElementById('habit-empty');
    if (!list) return;

    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];

    if (habits.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = habits.map(h => {
      const isDone = done.includes(h.id);
      const gymTag = h.cat === 'gym' ? `<span class="hi-gym">GYM</span>` : '';
      return `
        <div class="hi ${isDone ? 'done' : ''}" data-id="${h.id}" onclick="window.toggleHabit(${h.id})">
          <div class="hi-ck">${isDone ? '✓' : ''}</div>
          <span style="font-size:16px;flex-shrink:0">${h.emoji || '⭐'}</span>
          <div class="hi-nm">${h.name}</div>
          ${gymTag}
          <div class="hi-st">${h.streak || 0}🔥</div>
          <button class="hi-del" onclick="event.stopPropagation();window.deleteHabit(${h.id})" title="Delete habit">✕</button>
        </div>`;
    }).join('');

    // Wire toggle and delete
    window.toggleHabit = (id) => {
      Store.toggleHabit(id);
      AudioEngine.play('toggle');
      this.checkGymUnlock();
    };

    window.deleteHabit = (id) => {
      if (!confirm('Remove this habit?')) return;
      Store.removeHabit(id);
      AudioEngine.play('click');
    };
  },

  // ─────────────────────────────────────────────────────
  //  OVERVIEW PAGE - Mini Habit Cards
  // ─────────────────────────────────────────────────────
  renderOverviewHabits() {
    const el = document.getElementById('ov-habit-list');
    if (!el) return;

    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];

    if (habits.length === 0) {
      el.innerHTML = `<div style="font-size:11px;color:var(--mut);text-align:center;padding:12px">No habits configured</div>`;
      return;
    }

    el.innerHTML = habits.slice(0, 5).map(h => {
      const isDone = done.includes(h.id);
      return `
        <div class="hi ${isDone ? 'done' : ''}" onclick="window.toggleHabit(${h.id})" style="padding:8px 10px">
          <div class="hi-ck" style="width:17px;height:17px;font-size:9px">${isDone ? '✓' : ''}</div>
          <span style="font-size:13px">${h.emoji || '⭐'}</span>
          <div class="hi-nm" style="font-size:11px">${h.name}</div>
        </div>`;
    }).join('');
  },

  // ─────────────────────────────────────────────────────
  //  WEEK GRID (7-day dots)
  // ─────────────────────────────────────────────────────
  renderWeekGrid(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '';

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayData = (Store.data.history || {})[key];
      const isToday = i === 0;

      let cls = 'none';
      if (dayData) {
        const doneCount = (dayData.done || []).length;
        const totalHabits = (Store.data.habits || []).length;
        if (totalHabits > 0) {
          const pct = doneCount / totalHabits;
          if (pct >= 1) cls = 'full';
          else if (pct > 0) cls = 'part';
        }
      }

      html += `
        <div class="wk-day">
          <div class="wk-lb">${dayNames[d.getDay()]}</div>
          <div class="wk-dot ${cls} ${isToday ? 'today' : ''}">${d.getDate()}</div>
        </div>`;
    }
    el.innerHTML = html;
  },

  // ─────────────────────────────────────────────────────
  //  HABIT STATS PANEL
  // ─────────────────────────────────────────────────────
  renderHabitStats() {
    const el = document.getElementById('habit-stats');
    if (!el) return;

    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];
    const total = habits.length;
    const completed = done.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate best streak from history
    let bestStreak = 0, currentStreak = 0;
    const keys = Object.keys(Store.data.history || {}).sort();
    for (const k of keys) {
      const dayDone = (Store.data.history[k].done || []).length;
      const dayTotal = habits.length;
      if (dayTotal > 0 && dayDone === dayTotal) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    el.innerHTML = `
      <div class="srow">
        <div class="srow-lb">Today</div>
        <div class="srow-bar"><div class="srow-fill" style="width:${pct}%;background:var(--red)"></div></div>
        <div class="srow-vl">${pct}%</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
          <div style="font-family:var(--fh);font-size:28px;color:var(--gld)">${currentStreak}</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px">CURRENT STREAK</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
          <div style="font-family:var(--fh);font-size:28px;color:var(--red)">${bestStreak}</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px">BEST STREAK</div>
        </div>
      </div>`;
  },

  // ─────────────────────────────────────────────────────
  //  OVERVIEW SCORE CARDS
  // ─────────────────────────────────────────────────────
  renderOverviewScores() {
    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];
    const foods = Store.data.foods || [];
    const totalCal = foods.reduce((s, f) => s + (f.cal || 0), 0);

    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('ov-score', Store.getScore());
    setEl('ov-habits', `${done.length}/${habits.length}`);
    setEl('ov-cal', totalCal);
    setEl('ov-water', Store.data.waterCount || 0);

    // Overview water big number
    setEl('ov-water-big', Store.data.waterCount || 0);
    setEl('ov-wg', `Goal: ${Store.data.waterGoal || 8}`);

    // Overview water visualization
    const visEl = document.getElementById('ov-water-vis');
    if (visEl) {
      const goal = Store.data.waterGoal || 8;
      const count = Store.data.waterCount || 0;
      let html = '';
      for (let i = 0; i < goal; i++) {
        const filled = i < count;
        html += `<div class="wcup ${filled ? 'filled' : ''}" style="flex:1;min-height:38px;border-radius:5px;background:rgba(255,255,255,.03);border:1px solid var(--br);position:relative;overflow:hidden">
          <div class="wfill" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,176,255,.62),rgba(41,121,255,.22));transition:height .38s ease;height:${filled ? '100' : '0'}%"></div>
        </div>`;
      }
      visEl.innerHTML = html;
    }

    // Overview macros
    const macEl = document.getElementById('ov-macros');
    if (macEl) {
      const totPro = foods.reduce((s, f) => s + (f.pro || 0), 0);
      const totCrb = foods.reduce((s, f) => s + (f.crb || 0), 0);
      const totFat = foods.reduce((s, f) => s + (f.fat || 0), 0);
      macEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--gld)">${totalCal}</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px">KCAL</div>
          </div>
          <div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--red)">${totPro}g</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px">PROTEIN</div>
          </div>
          <div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--bl3)">${totCrb}g</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px">CARBS</div>
          </div>
          <div style="text-align:center;padding:8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--prp)">${totFat}g</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px">FATS</div>
          </div>
        </div>`;
    }

    // AI Feedback
    this.updateAIFeedback();
  },

  // ─────────────────────────────────────────────────────
  //  AI FEEDBACK TAGS
  // ─────────────────────────────────────────────────────
  updateAIFeedback() {
    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];
    const score = Store.getScore();
    const fbTxt = document.getElementById('fb-txt');
    const fbTags = document.getElementById('fb-tags');

    if (fbTxt) {
      if (done.length === 0) {
        fbTxt.textContent = 'Start tracking to receive your performance analysis.';
      } else if (score >= 80) {
        fbTxt.textContent = '🔥 Outstanding performance! You\'re crushing it across all metrics. Keep the momentum going!';
      } else if (score >= 50) {
        fbTxt.textContent = '⚡ Good progress today. Focus on completing remaining habits and hitting your water goal.';
      } else {
        fbTxt.textContent = '🕸️ Time to step it up! Check off more habits and fuel your body properly.';
      }
    }

    if (fbTags) {
      const tags = [];
      const pct = habits.length > 0 ? (done.length / habits.length) * 100 : 0;
      if (pct >= 100) tags.push({ text: 'ALL HABITS ✓', color: 'var(--grn)', bg: 'rgba(0,230,118,.1)' });
      else if (pct > 0) tags.push({ text: `${Math.round(pct)}% HABITS`, color: 'var(--gld)', bg: 'rgba(255,214,0,.1)' });
      
      const wPct = ((Store.data.waterCount || 0) / (Store.data.waterGoal || 8)) * 100;
      if (wPct >= 100) tags.push({ text: 'HYDRATED ✓', color: 'var(--bl3)', bg: 'rgba(0,176,255,.1)' });
      
      if (score >= 80) tags.push({ text: 'HIGH SCORE', color: 'var(--red)', bg: 'rgba(230,51,41,.1)' });

      fbTags.innerHTML = tags.map(t => 
        `<span class="ftag" style="background:${t.bg};color:${t.color};border:1px solid ${t.color}">${t.text}</span>`
      ).join('');
    }
  },

  // ─────────────────────────────────────────────────────
  //  GYM LOCK/UNLOCK
  // ─────────────────────────────────────────────────────
  checkGymUnlock() {
    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];
    const gymHabit = habits.find(h => h.cat === 'gym');
    const gymLock = document.getElementById('gym-lock');
    const gymActive = document.getElementById('gym-active');
    const gymBadge = document.getElementById('gym-badge');

    if (gymHabit && done.includes(gymHabit.id)) {
      if (gymLock) gymLock.style.display = 'none';
      if (gymActive) gymActive.style.display = 'block';
      if (gymBadge) { gymBadge.textContent = 'ACTIVE'; gymBadge.className = 'badge b-act'; }
    } else {
      if (gymLock) gymLock.style.display = 'block';
      if (gymActive) gymActive.style.display = 'none';
      if (gymBadge) { gymBadge.textContent = 'LOCKED'; gymBadge.className = 'badge b-lck'; }
    }
  },

  // ─────────────────────────────────────────────────────
  //  ADD HABIT MODAL
  // ─────────────────────────────────────────────────────
  openAddHabitModal() {
    const modal = document.getElementById('add-habit-modal');
    if (modal) {
      modal.classList.add('open');
      const nameInp = document.getElementById('mh-name');
      if (nameInp) { nameInp.value = ''; nameInp.focus(); }
      document.getElementById('mh-emoji').value = '';
    }
    AudioEngine.play('nav');
  },

  confirmAddHabit() {
    const name = document.getElementById('mh-name')?.value.trim();
    const cat = document.getElementById('mh-cat')?.value || 'other';
    const emoji = document.getElementById('mh-emoji')?.value.trim() || '⭐';

    if (!name) {
      alert('Please enter a habit name!');
      return;
    }

    const newHabit = {
      id: Date.now(),
      name,
      emoji,
      cat,
      streak: 0
    };

    Store.addHabit(newHabit);
    this.closeModal('add-habit-modal');
    AudioEngine.play('success');
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  },

  // ─────────────────────────────────────────────────────
  //  DATE HEADER
  // ─────────────────────────────────────────────────────
  updateDate() {
    const now = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

    const dyEl = document.getElementById('today-dy');
    const dtEl = document.getElementById('today-dt');
    if (dyEl) dyEl.textContent = days[now.getDay()];
    if (dtEl) dtEl.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    // Settings days tracked
    const tracked = Object.keys(Store.data.history || {}).length;
    const el = document.getElementById('settings-habit-count');
    if (el) el.textContent = tracked;
  }
};
