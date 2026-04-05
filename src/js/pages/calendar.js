// ═══════════════════════════════════════════════════════
//   CALENDAR MODULE — Monthly view, day details, analysis
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

export const Calendar = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDay: null,

  init() {
    window.calPrev = () => this.navigate(-1);
    window.calNext = () => this.navigate(1);
    window.calToday = () => { 
      this.currentMonth = new Date().getMonth();
      this.currentYear = new Date().getFullYear();
      this.selectedDay = null;
      this.render();
    };
    window.selectCalDay = (dateKey) => this.selectDay(dateKey);

    document.addEventListener('store:changed', () => this.render());
    document.addEventListener('nav:changed', (e) => {
      if (e.detail.page === 'calendar') this.render();
    });

    this.render();
  },

  navigate(dir) {
    this.currentMonth += dir;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.selectedDay = null;
    this.render();
    AudioEngine.play('nav');
  },

  selectDay(dateKey) {
    this.selectedDay = this.selectedDay === dateKey ? null : dateKey;
    this.render();
    AudioEngine.play('click');
  },

  render() {
    this.renderSummaryStats();
    this.renderCalendarGrid();
    this.renderDayDetail();
  },

  // ─── SUMMARY STATS ROW ───
  renderSummaryStats() {
    const container = document.getElementById('cal-stats');
    if (!container) return;

    const year = this.currentYear;
    const month = this.currentMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let totalScore = 0, scoreDays = 0;
    let perfectDays = 0;
    let totalWater = 0, waterDays = 0;
    let totalCal = 0, calDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const day = Store.data.history[key];
      if (day) {
        const score = day.score || 0;
        if (score > 0) { totalScore += score; scoreDays++; }
        
        const done = (day.done || []).length;
        const total = day.habitCount || Store.data.habits.length;
        const waterOk = (day.water || 0) >= Store.data.waterGoal;
        if (done >= total && total > 0 && waterOk) perfectDays++;

        if (day.water > 0) { totalWater += day.water; waterDays++; }
        if (day.calories > 0) { totalCal += day.calories; calDays++; }
      }
    }

    const avgScore = scoreDays > 0 ? Math.round(totalScore / scoreDays) : 0;
    const avgWater = waterDays > 0 ? (totalWater / waterDays).toFixed(1) : 0;
    const avgCal = calDays > 0 ? Math.round(totalCal / calDays) : 0;

    container.innerHTML = `
      <div class="sc" style="--c:var(--red)">
        <div class="lb">AVG SCORE</div>
        <div class="vl">${avgScore > 0 ? avgScore : '--'}</div>
        <div class="sb">this month</div>
      </div>
      <div class="sc" style="--c:var(--grn)">
        <div class="lb">PERFECT DAYS</div>
        <div class="vl">${perfectDays}</div>
        <div class="sb">100% habits</div>
      </div>
      <div class="sc" style="--c:var(--bl3)">
        <div class="lb">AVG WATER</div>
        <div class="vl">${avgWater}</div>
        <div class="sb">glasses/day</div>
      </div>
      <div class="sc" style="--c:var(--gld)">
        <div class="lb">AVG CALORIES</div>
        <div class="vl">${avgCal || '--'}</div>
        <div class="sb">kcal/day</div>
      </div>`;
  },

  // ─── CALENDAR GRID ───
  renderCalendarGrid() {
    const container = document.getElementById('cal-grid');
    if (!container) return;

    const year = this.currentYear;
    const month = this.currentMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const adjFirst = firstDay === 0 ? 6 : firstDay - 1; // Adjust to Mon=0

    const monthName = new Date(year, month).toLocaleDateString('en', { month: 'long', year: 'numeric' }).toUpperCase();
    const todayKey = Store.todayKey();

    // Header
    const titleEl = document.getElementById('cal-month-title');
    if (titleEl) titleEl.textContent = monthName;

    // Day headers
    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    
    let html = `<div class="cal-header-row">${dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('')}</div>`;
    html += '<div class="cal-days-grid">';

    // Empty cells before first day
    for (let i = 0; i < adjFirst; i++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const day = Store.data.history[key];
      const isToday = key === todayKey;
      const isSelected = key === this.selectedDay;

      let status = 'no-data';
      let dotColor = '';
      if (day) {
        const done = (day.done || []).length;
        const total = day.habitCount || Store.data.habits.length;
        const waterOk = (day.water || 0) >= Store.data.waterGoal;
        
        if (done >= total && total > 0 && waterOk) {
          status = 'perfect';
          dotColor = 'var(--red)';
        } else if (done > 0 || (day.water || 0) > 0 || (day.calories || 0) > 0) {
          status = 'partial';
          dotColor = '#7a1410'; // Dimmer dark red for partial
        }
      }

      // Future dates
      const dateObj = new Date(year, month, d);
      const isFuture = dateObj > new Date() && !isToday;

      html += `
        <div class="cal-cell ${status} ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${isFuture ? 'cal-future' : ''}" 
             onclick="${!isFuture ? `selectCalDay('${key}')` : ''}">
          <span class="cal-date-num">${d}</span>
          ${dotColor ? `<span class="cal-dot" style="background:${dotColor}"></span>` : ''}
        </div>`;
    }

    html += '</div>';

    // Legend
    html += `
      <div class="cal-legend">
        <div class="cal-legend-item"><span class="cal-legend-dot" style="background:var(--red)"></span> Perfect day</div>
        <div class="cal-legend-item"><span class="cal-legend-dot" style="background:#7a1410"></span> Partial</div>
        <div class="cal-legend-item"><span class="cal-legend-dot" style="background:rgba(255,255,255,.15)"></span> No data</div>
      </div>`;

    container.innerHTML = html;
  },

  // ─── DAY DETAIL PANEL ───
  renderDayDetail() {
    const container = document.getElementById('cal-detail');
    if (!container) return;

    if (!this.selectedDay) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const dayData = Store.getDayData(this.selectedDay);
    
    const dateObj = new Date(this.selectedDay + 'T12:00:00');
    const dateStr = dateObj.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    if (!dayData) {
      container.innerHTML = `
        <div class="card" style="margin-top:14px">
          <div class="card-t"><span class="ac">📅</span> ${dateStr}</div>
          <div style="text-align:center;padding:28px;color:var(--mut);font-size:13px">
            No data recorded for this day.
          </div>
        </div>`;
      return;
    }

    const score = dayData.score;
    const habits = Store.data.habits || [];
    const doneIds = dayData.done || [];
    const totalH = dayData.habitCount || habits.length;
    const habitPct = totalH > 0 ? Math.round((doneIds.length / totalH) * 100) : 0;
    const waterPct = Store.data.waterGoal > 0 ? Math.round((dayData.water / Store.data.waterGoal) * 100) : 0;

    // Grade
    let grade = 'F', gradeColor = 'var(--mut)';
    if (score >= 90) { grade = 'A+'; gradeColor = 'var(--grn)'; }
    else if (score >= 80) { grade = 'A'; gradeColor = 'var(--grn)'; }
    else if (score >= 70) { grade = 'B'; gradeColor = 'var(--bl3)'; }
    else if (score >= 50) { grade = 'C'; gradeColor = 'var(--gld)'; }
    else if (score >= 30) { grade = 'D'; gradeColor = 'var(--red2)'; }

    container.innerHTML = `
      <div class="card" style="margin-top:14px;border-color:rgba(230,51,41,.28)">
        <div class="card-t"><span class="ac">📅</span> ${dateStr}</div>
        
        <!-- Score overview -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px">
          <div style="text-align:center;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid var(--br)">
            <div style="font-family:var(--fh);font-size:28px;color:${gradeColor}">${grade}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">GRADE</div>
          </div>
          <div style="text-align:center;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid var(--br)">
            <div style="font-family:var(--fh);font-size:28px;color:var(--red)">${score}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">SCORE</div>
          </div>
          <div style="text-align:center;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid var(--br)">
            <div style="font-family:var(--fh);font-size:28px;color:var(--bl3)">${dayData.water}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">GLASSES</div>
          </div>
          <div style="text-align:center;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid var(--br)">
            <div style="font-family:var(--fh);font-size:28px;color:var(--gld)">${dayData.calories}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">KCAL</div>
          </div>
        </div>

        <!-- Habits section -->
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:10px;color:var(--mut);font-weight:700;letter-spacing:1px">HABITS (${doneIds.length}/${totalH})</span>
            <span style="font-size:10px;color:${habitPct >= 100 ? 'var(--grn)' : 'var(--gld)'};font-weight:700">${habitPct}%</span>
          </div>
          <div style="height:5px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:8px">
            <div style="width:${habitPct}%;height:100%;background:var(--red);border-radius:3px;transition:width .4s"></div>
          </div>
          ${habits.map(h => {
            const wasDone = doneIds.includes(h.id);
            return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px">
              <span style="color:${wasDone ? 'var(--grn)' : 'var(--mut)'}">${wasDone ? '✓' : '✕'}</span>
              <span>${h.emoji || '✅'}</span>
              <span style="color:${wasDone ? 'var(--wht)' : 'var(--mut)'}">${h.name}</span>
            </div>`;
          }).join('')}
        </div>

        <!-- Water section -->
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:10px;color:var(--mut);font-weight:700;letter-spacing:1px">HYDRATION</span>
            <span style="font-size:10px;color:${waterPct >= 100 ? 'var(--grn)' : 'var(--bl3)'};font-weight:700">${Math.min(waterPct, 100)}%</span>
          </div>
          <div style="height:5px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden">
            <div style="width:${Math.min(waterPct, 100)}%;height:100%;background:var(--bl3);border-radius:3px;transition:width .4s"></div>
          </div>
        </div>

        <!-- Foods section -->
        ${dayData.foods.length > 0 ? `
          <div>
            <div style="font-size:10px;color:var(--mut);font-weight:700;letter-spacing:1px;margin-bottom:8px">NUTRITION LOG</div>
            ${dayData.foods.map(f => `
              <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;border-bottom:1px solid rgba(255,255,255,.04)">
                <span style="color:var(--wht)">${f.name}</span>
                <span style="color:var(--gld)">${f.cal}kcal</span>
              </div>`).join('')}
          </div>` : ''}

        <!-- Analysis -->
        <div style="margin-top:14px;padding:12px;background:rgba(230,51,41,.04);border:1px solid rgba(230,51,41,.15);border-radius:10px">
          <div style="font-size:9px;color:var(--red);font-weight:700;letter-spacing:1.5px;margin-bottom:6px">📊 DAY ANALYSIS</div>
          <div style="font-size:12px;color:var(--wht);line-height:1.7">
            ${this.generateAnalysis(dayData, habits)}
          </div>
        </div>
      </div>`;
  },

  generateAnalysis(dayData, habits) {
    const msgs = [];
    const doneCount = dayData.done.length;
    const totalH = dayData.habitCount;
    const habitPct = totalH > 0 ? Math.round((doneCount / totalH) * 100) : 0;
    const waterPct = Store.data.waterGoal > 0 ? Math.round((dayData.water / Store.data.waterGoal) * 100) : 0;

    if (habitPct >= 100) msgs.push('🏆 <strong>All habits completed!</strong> Perfect discipline.');
    else if (habitPct >= 70) msgs.push(`✅ Strong habit performance at <strong>${habitPct}%</strong>. Almost perfect!`);
    else if (habitPct > 0) msgs.push(`⚠️ Only <strong>${doneCount}/${totalH}</strong> habits completed. Push harder next time.`);
    else msgs.push('❌ No habits completed. Every day is a fresh start!');

    if (waterPct >= 100) msgs.push('💧 <strong>Hydration goal met!</strong> Great water discipline.');
    else if (waterPct >= 50) msgs.push(`💧 ${dayData.water}/${Store.data.waterGoal} glasses — <strong>${100 - waterPct}% short</strong> of hydration goal.`);
    else if (dayData.water > 0) msgs.push(`💧 Only ${dayData.water} glasses. Drink more water!`);

    if (dayData.calories > 0) {
      const diff = dayData.calories - Store.data.calorieGoal;
      if (Math.abs(diff) < 200) msgs.push(`🔥 Calories on target at <strong>${dayData.calories}kcal</strong>. Solid nutrition.`);
      else if (diff > 0) msgs.push(`🔥 <strong>${diff}kcal over</strong> calorie goal. Consider lighter meals.`);
      else msgs.push(`🔥 <strong>${Math.abs(diff)}kcal under</strong> calorie goal. Consider eating more.`);
    }

    if (dayData.score >= 80) msgs.push('⚡ <strong>Outstanding day!</strong> Score: ' + dayData.score + '/100');
    else if (dayData.score >= 50) msgs.push('📈 Decent day. Score: ' + dayData.score + '/100. Room for improvement.');

    return msgs.join('<br>');
  }
};
