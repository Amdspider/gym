// ═══════════════════════════════════════════════════════
//   CALENDAR MODULE - Monthly View with Day Details
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

export const Calendar = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDay: null,

  init() {
    window.calPrevMonth = () => this.navigateMonth(-1);
    window.calNextMonth = () => this.navigateMonth(1);
    window.calSelectDay = (key) => this.selectDay(key);
    window.calCloseDetail = () => this.closeDetail();

    document.addEventListener('store:changed', () => this.render());
    document.addEventListener('nav:changed', (e) => {
      if (e.detail.page === 'calendar') this.render();
    });

    this.render();
  },

  // ─────────────────────────────────────────────────────
  //  NAVIGATE MONTHS
  // ─────────────────────────────────────────────────────
  navigateMonth(delta) {
    this.currentMonth += delta;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.selectedDay = null;
    this.render();
    AudioEngine.play('nav');
  },

  // ─────────────────────────────────────────────────────
  //  SELECT A DAY
  // ─────────────────────────────────────────────────────
  selectDay(key) {
    this.selectedDay = key;
    this.render();
    AudioEngine.play('click');
  },

  closeDetail() {
    this.selectedDay = null;
    this.render();
    AudioEngine.play('click');
  },

  // ─────────────────────────────────────────────────────
  //  MASTER RENDER
  // ─────────────────────────────────────────────────────
  render() {
    const container = document.getElementById('calendar-content');
    if (!container) return;

    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const history = Store.data.history || {};
    const habits = Store.data.habits || [];

    // ── Summary Stats for This Month ──
    const monthKeys = Object.keys(history).filter(k => {
      const d = new Date(k);
      return d.getMonth() === this.currentMonth && d.getFullYear() === this.currentYear;
    });

    let perfectDays = 0, totalScore = 0, totalWater = 0, totalCal = 0;
    monthKeys.forEach(k => {
      const day = history[k];
      const doneCount = (day.done || []).length;
      const waterGoalMet = (day.water || 0) >= (Store.data.waterGoal || 8);
      if (habits.length > 0 && doneCount >= habits.length && waterGoalMet) perfectDays++;
      totalScore += day.score || 0;
      totalWater += day.water || 0;
      totalCal += day.calories || 0;
    });

    const avgScore = monthKeys.length > 0 ? Math.round(totalScore / monthKeys.length) : 0;
    const avgWater = monthKeys.length > 0 ? (totalWater / monthKeys.length).toFixed(1) : 0;
    const avgCal = monthKeys.length > 0 ? Math.round(totalCal / monthKeys.length) : 0;

    // ── Build Calendar Grid ──
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    // getDay(): 0=Sun...6=Sat → adjust to Mon=0
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const todayKey = Store.todayKey();
    const today = new Date();

    let gridHtml = '';
    // Empty leading cells
    for (let i = 0; i < startDow; i++) {
      gridHtml += `<div class="cal-cell cal-empty"></div>`;
    }

    for (let d = 1; d <= totalDays; d++) {
      const key = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = history[key];
      const isToday = key === todayKey;
      const isSelected = key === this.selectedDay;
      const isFuture = new Date(key) > today;

      let cls = 'cal-none';
      let dotColor = '';
      if (dayData && !isFuture) {
        const doneCount = (dayData.done || []).length;
        const waterGoalMet = (dayData.water || 0) >= (Store.data.waterGoal || 8);
        if (habits.length > 0 && doneCount >= habits.length && waterGoalMet) {
          cls = 'cal-perfect';
          dotColor = 'var(--red)';
        } else if (doneCount > 0 || (dayData.water || 0) > 0 || (dayData.calories || 0) > 0) {
          cls = 'cal-partial';
          dotColor = 'var(--gld)';
        }
      }

      gridHtml += `
        <div class="cal-cell ${cls} ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${isFuture ? 'cal-future' : ''}"
             onclick="${!isFuture ? `window.calSelectDay('${key}')` : ''}">
          <span class="cal-date">${d}</span>
          ${dotColor ? `<span class="cal-dot" style="background:${dotColor}"></span>` : ''}
        </div>`;
    }

    // ── Day Detail Panel ──
    let detailHtml = '';
    if (this.selectedDay) {
      detailHtml = this.renderDayDetail(this.selectedDay);
    }

    container.innerHTML = `
      <!-- MONTH SUMMARY STATS -->
      <div class="cal-stats">
        <div class="cal-stat">
          <div class="cal-stat-lb">AVG SCORE</div>
          <div class="cal-stat-vl" style="color:var(--red)">${avgScore || '--'}</div>
          <div class="cal-stat-sub">this month</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-lb">PERFECT DAYS</div>
          <div class="cal-stat-vl" style="color:var(--grn)">${perfectDays}</div>
          <div class="cal-stat-sub">100% habits</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-lb">AVG WATER</div>
          <div class="cal-stat-vl" style="color:var(--bl3)">${avgWater}</div>
          <div class="cal-stat-sub">glasses/day</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-lb">AVG CALORIES</div>
          <div class="cal-stat-vl" style="color:var(--gld)">${avgCal}</div>
          <div class="cal-stat-sub">kcal/day</div>
        </div>
      </div>

      <!-- MONTHLY CALENDAR -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-t" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:7px">
            <span class="ac">📅</span> MONTHLY CALENDAR
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <button class="cal-nav-btn" onclick="window.calPrevMonth()">◀</button>
            <span class="cal-month-label">${monthNames[this.currentMonth]} ${this.currentYear}</span>
            <button class="cal-nav-btn" onclick="window.calNextMonth()">▶</button>
          </div>
        </div>
        <div class="cal-header">
          ${dayNames.map(d => `<div class="cal-hdr-cell">${d}</div>`).join('')}
        </div>
        <div class="cal-grid">
          ${gridHtml}
        </div>
        <div class="cal-legend">
          <span class="cal-legend-item"><span class="cal-legend-dot" style="background:var(--red)"></span> Perfect day</span>
          <span class="cal-legend-item"><span class="cal-legend-dot" style="background:var(--gld)"></span> Partial</span>
          <span class="cal-legend-item"><span class="cal-legend-dot" style="background:rgba(255,255,255,.15)"></span> No data</span>
        </div>
      </div>

      <!-- DAY DETAIL -->
      ${detailHtml}
    `;
  },

  // ─────────────────────────────────────────────────────
  //  DAY DETAIL PANEL
  // ─────────────────────────────────────────────────────
  renderDayDetail(key) {
    const history = Store.data.history || {};
    const dayData = history[key];
    const habits = Store.data.habits || [];
    const date = new Date(key);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const dateStr = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

    if (!dayData) {
      return `
        <div class="card cal-detail-card">
          <div class="card-t" style="justify-content:space-between">
            <span>📋 ${dateStr}</span>
            <button class="cal-close-btn" onclick="window.calCloseDetail()">✕</button>
          </div>
          <div style="text-align:center;padding:30px;color:var(--mut);font-size:13px">No data recorded for this day.</div>
        </div>`;
    }

    const done = dayData.done || [];
    const water = dayData.water || 0;
    const calories = dayData.calories || 0;
    const score = dayData.score || 0;
    const waterGoal = Store.data.waterGoal || 8;
    const waterPct = Math.min(Math.round((water / waterGoal) * 100), 100);

    // Habits completed
    const totalHabits = habits.length;
    const doneCount = done.length;
    const habitPct = totalHabits > 0 ? Math.round((doneCount / totalHabits) * 100) : 0;

    // Performance analysis
    let grade = 'F';
    let gradeColor = 'var(--mut)';
    const overallScore = Math.round((habitPct + waterPct) / 2);
    if (overallScore >= 90) { grade = 'S'; gradeColor = 'var(--gld)'; }
    else if (overallScore >= 75) { grade = 'A'; gradeColor = 'var(--grn)'; }
    else if (overallScore >= 60) { grade = 'B'; gradeColor = 'var(--bl3)'; }
    else if (overallScore >= 40) { grade = 'C'; gradeColor = 'var(--gld)'; }
    else if (overallScore >= 20) { grade = 'D'; gradeColor = 'var(--red2)'; }
    else { grade = 'F'; gradeColor = 'var(--red)'; }

    return `
      <div class="card cal-detail-card" style="animation:fadeUp .3s ease">
        <div class="card-t" style="justify-content:space-between">
          <span>📋 DAY REPORT — ${dateStr.toUpperCase()}</span>
          <button class="cal-close-btn" onclick="window.calCloseDetail()">✕</button>
        </div>

        <!-- Grade -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;padding:14px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:12px">
          <div style="width:60px;height:60px;border-radius:50%;border:3px solid ${gradeColor};display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:32px;color:${gradeColor};box-shadow:0 0 20px ${gradeColor}33;flex-shrink:0">${grade}</div>
          <div>
            <div style="font-family:var(--fd);font-size:11px;letter-spacing:1px;color:var(--mut);margin-bottom:3px">PERFORMANCE GRADE</div>
            <div style="font-size:13px;font-weight:600">${overallScore}% overall completion</div>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px">
          <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
            <div style="font-family:var(--fh);font-size:24px;color:var(--red)">${doneCount}/${totalHabits}</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px;margin-top:2px">HABITS</div>
          </div>
          <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
            <div style="font-family:var(--fh);font-size:24px;color:var(--bl3)">${water}</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px;margin-top:2px">WATER</div>
          </div>
          <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
            <div style="font-family:var(--fh);font-size:24px;color:var(--gld)">${calories}</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px;margin-top:2px">KCAL</div>
          </div>
          <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
            <div style="font-family:var(--fh);font-size:24px;color:${gradeColor}">${overallScore}%</div>
            <div style="font-size:8px;color:var(--mut);letter-spacing:1px;margin-top:2px">SCORE</div>
          </div>
        </div>

        <!-- Habit Checklist -->
        <div style="margin-bottom:14px">
          <div style="font-family:var(--fd);font-size:10px;letter-spacing:1.5px;color:var(--mut);margin-bottom:8px">HABIT CHECKLIST</div>
          ${habits.length > 0 ? habits.map(h => {
            const isDone = done.includes(h.id);
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--br)">
              <span style="font-size:14px">${isDone ? '✅' : '⬜'}</span>
              <span style="font-size:12px;color:${isDone ? 'var(--wht)' : 'var(--mut)'}">${h.emoji || '⭐'} ${h.name}</span>
            </div>`;
          }).join('') : '<div style="font-size:11px;color:var(--mut)">No habits configured</div>'}
        </div>

        <!-- Progress Bars -->
        <div style="display:flex;flex-direction:column;gap:10px">
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;color:var(--red);font-weight:700;letter-spacing:1px">HABITS</span>
              <span style="font-size:10px;color:var(--mut)">${habitPct}%</span>
            </div>
            <div style="height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden">
              <div style="width:${habitPct}%;height:100%;background:var(--red);border-radius:3px;transition:width .6s ease"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;color:var(--bl3);font-weight:700;letter-spacing:1px">HYDRATION</span>
              <span style="font-size:10px;color:var(--mut)">${waterPct}%</span>
            </div>
            <div style="height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden">
              <div style="width:${waterPct}%;height:100%;background:var(--bl3);border-radius:3px;transition:width .6s ease"></div>
            </div>
          </div>
        </div>
      </div>`;
  }
};
