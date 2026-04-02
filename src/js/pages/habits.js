// ═══════════════════════════════════════════════════════
//   HABITS MODULE — Render, Add, Toggle, Delete
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

export const Habits = {
  init() {
    // Wire global handlers for inline HTML
    window.openAddHabit = () => this.openModal();
    window.confirmAddHabit = () => this.confirmAdd();
    window.closeModal = (id) => this.closeModal(id);
    window.go = (page) => {
      // Import Router dynamically to avoid circular deps
      import('../ui/router.js').then(m => m.Router.goTo(page));
    };

    // Re-render on data changes
    document.addEventListener('store:changed', () => this.render());
    
    // Initial render
    this.render();
  },

  render() {
    this.renderHabitList();
    this.renderOverviewHabits();
    this.renderWeekGrid('wk-habits');
    this.renderWeekGrid('wk-ov');
    this.renderStats();
    this.updateOverviewScores();
    this.updateDateDisplay();
  },

  // ─── HABIT LIST (Habits Page) ───
  renderHabitList() {
    const container = document.getElementById('habit-list');
    const empty = document.getElementById('habit-empty');
    if (!container) return;

    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];

    if (habits.length === 0) {
      container.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    container.innerHTML = habits.map(h => {
      const isDone = done.includes(h.id);
      const isGym = h.cat === 'gym';
      return `
        <div class="hi ${isDone ? 'done' : ''}" onclick="window.toggleHabit(${h.id})">
          <div class="hi-ck">${isDone ? '✓' : ''}</div>
          <span style="font-size:18px;flex-shrink:0">${h.emoji || '✅'}</span>
          <div class="hi-nm">${h.name}</div>
          ${isGym ? '<span class="hi-gym">GYM</span>' : ''}
          ${h.streak > 0 ? `<span class="hi-st">🔥 ${h.streak}d</span>` : ''}
          <button class="hi-del" onclick="event.stopPropagation(); window.deleteHabit(${h.id})" title="Delete">✕</button>
        </div>`;
    }).join('');
  },

  // ─── OVERVIEW HABITS WIDGET ───
  renderOverviewHabits() {
    const container = document.getElementById('ov-habit-list');
    if (!container) return;

    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];

    if (habits.length === 0) {
      container.innerHTML = '<div style="font-size:11px;color:var(--mut);text-align:center;padding:12px">No habits configured</div>';
      return;
    }

    container.innerHTML = habits.slice(0, 6).map(h => {
      const isDone = done.includes(h.id);
      return `
        <div class="hi ${isDone ? 'done' : ''}" onclick="window.toggleHabit(${h.id})" style="padding:8px 10px">
          <div class="hi-ck" style="width:18px;height:18px">${isDone ? '✓' : ''}</div>
          <span style="font-size:14px">${h.emoji || '✅'}</span>
          <div class="hi-nm" style="font-size:12px">${h.name}</div>
        </div>`;
    }).join('');
  },

  // ─── WEEKLY GRID ───
  renderWeekGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const week = Store.getWeekData();
    
    container.innerHTML = week.map(day => {
      const pct = day.total > 0 ? Math.round((day.done / day.total) * 100) : 0;
      let cls = 'none';
      if (pct >= 100) cls = 'full';
      else if (pct > 0) cls = 'part';
      
      return `
        <div class="wk-day">
          <div class="wk-lb">${day.label}</div>
          <div class="wk-dot ${cls} ${day.isToday ? 'today' : ''}">${pct > 0 ? pct + '%' : '–'}</div>
        </div>`;
    }).join('');
  },

  // ─── STATS ───
  renderStats() {
    const container = document.getElementById('habit-stats');
    if (!container) return;

    const habits = Store.data.habits || [];
    const done = Store.data.todayDone || [];
    const total = habits.length;
    const completed = done.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate streak (consecutive days with all habits done)
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayData = Store.data.history[key];
      if (dayData && (dayData.done || []).length > 0) {
        const dayTotal = dayData.habitCount || total;
        if ((dayData.done || []).length >= dayTotal) streak++;
        else break;
      } else if (i === 0) {
        // Today can be in progress
        continue;
      } else {
        break;
      }
    }

    container.innerHTML = `
      <div class="srow">
        <div class="srow-lb">Completed</div>
        <div class="srow-bar"><div class="srow-fill" style="width:${pct}%;background:var(--red)"></div></div>
        <div class="srow-vl">${completed}/${total}</div>
      </div>
      <div class="srow">
        <div class="srow-lb">Progress</div>
        <div class="srow-bar"><div class="srow-fill" style="width:${pct}%;background:var(--grn)"></div></div>
        <div class="srow-vl">${pct}%</div>
      </div>
      <div style="display:flex;gap:12px;margin-top:12px">
        <div style="text-align:center;flex:1;padding:10px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid var(--br)">
          <div style="font-family:var(--fh);font-size:28px;color:var(--gld)">${streak}</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">STREAK</div>
        </div>
        <div style="text-align:center;flex:1;padding:10px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid var(--br)">
          <div style="font-family:var(--fh);font-size:28px;color:var(--bl3)">${total}</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">TOTAL</div>
        </div>
      </div>`;
  },

  // ─── OVERVIEW SCORE CARDS ───
  updateOverviewScores() {
    const score = Store.getScore();
    const done = (Store.data.todayDone || []).length;
    const total = (Store.data.habits || []).length;
    const cal = (Store.data.foods || []).reduce((s, f) => s + (f.cal || 0), 0);
    const water = Store.data.waterCount || 0;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('ov-score', score);
    set('ov-habits', `${done}/${total}`);
    set('ov-cal', cal);
    set('ov-water', water);
    set('ov-water-big', water);
    set('ov-wg', `Goal: ${Store.data.waterGoal}`);

    // Days tracked count for settings
    const daysTracked = Object.keys(Store.data.history || {}).length;
    set('settings-habit-count', daysTracked);
  },

  // ─── DATE DISPLAY ───
  updateDateDisplay() {
    const now = new Date();
    const dyEl = document.getElementById('today-dy');
    const dtEl = document.getElementById('today-dt');
    if (dyEl) dyEl.textContent = now.toLocaleDateString('en', { weekday: 'long' }).toUpperCase();
    if (dtEl) dtEl.textContent = now.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  },

  // ─── MODAL HANDLERS ───
  openModal() {
    const modal = document.getElementById('add-habit-modal');
    if (modal) modal.classList.add('open');
    AudioEngine.play('nav');
  },

  confirmAdd() {
    const name = document.getElementById('mh-name')?.value.trim();
    const cat = document.getElementById('mh-cat')?.value || 'other';
    const emoji = document.getElementById('mh-emoji')?.value.trim() || '✅';

    if (!name) {
      alert('Please enter a habit name!');
      return;
    }

    Store.addHabit({ name, cat, emoji });
    AudioEngine.play('success');

    // Clear inputs
    const nmEl = document.getElementById('mh-name');
    const emEl = document.getElementById('mh-emoji');
    if (nmEl) nmEl.value = '';
    if (emEl) emEl.value = '';

    this.closeModal('add-habit-modal');
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
    AudioEngine.play('click');
  }
};

// Wire toggle and delete as window globals
window.toggleHabit = (id) => {
  Store.toggleHabit(id);
  AudioEngine.play('toggle');
};

window.deleteHabit = (id) => {
  if (confirm('Remove this habit?')) {
    Store.removeHabit(id);
    AudioEngine.play('click');
  }
};
