import { Store } from '../state/store.js';

export const HistoryList = {
  init() {
    document.addEventListener('nav:changed', (e) => {
      if(e.detail.page === 'history') this.render();
    });
  },

  render() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (!Store.data.history || Object.keys(Store.data.history).length === 0) {
      container.innerHTML = `<div style="text-align:center;color:var(--mut);padding:24px;border:1px dashed var(--br);border-radius:12px;font-size:12px">No history recorded yet. Stay consistent!</div>`;
      return;
    }

    // Sort by descending date
    const dates = Object.keys(Store.data.history).sort((a,b) => new Date(b) - new Date(a));

    container.innerHTML = dates.map(key => {
      const day = Store.data.history[key];
      const dateObj = new Date(key + 'T12:00:00');
      const dateStr = dateObj.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      
      const done = (day.done || []).length;
      const totalH = day.habitCount || Store.data.habits.length;
      const score = day.score || 0;
      
      let badgeHtml = '';
      if (score >= 90) badgeHtml = '<span class="badge" style="background:rgba(0,230,118,0.2);color:var(--grn);border:1px solid var(--grn)">S-RANK</span>';
      else if (score >= 70) badgeHtml = '<span class="badge" style="background:rgba(0,176,255,0.2);color:var(--bl3);border:1px solid var(--bl3)">A-RANK</span>';
      else badgeHtml = '<span class="badge" style="background:rgba(255,214,0,0.2);color:var(--gld);border:1px solid var(--gld)">C-RANK</span>';

      return `
      <div class="card" style="border-left:4px solid ${score >= 90 ? 'var(--grn)' : (score >= 70 ? 'var(--bl3)' : 'var(--gld)')}; cursor:pointer" onclick="go('calendar'); window.selectCalDay('${key}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-family:var(--fd);font-size:11px;font-weight:700;color:var(--mut);letter-spacing:1px">${dateStr.toUpperCase()}</div>
          ${badgeHtml}
        </div>
        
        <div style="display:flex;gap:12px">
          <div style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,.04);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--wht)">${score}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px">SCORE</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,.04);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--wht)">${done}/${totalH}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px">HABITS</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,.04);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--wht)">${day.water || 0}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px">WATER</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,.04);border-radius:8px">
            <div style="font-family:var(--fh);font-size:20px;color:var(--wht)">${day.calories || 0}</div>
            <div style="font-size:9px;color:var(--mut);letter-spacing:1px">KCAL</div>
          </div>
        </div>
      </div>
      `;
    }).join('');
  }
};
