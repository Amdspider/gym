// ═══════════════════════════════════════════════════════
//   WATER MODULE — Hydration tracking, render, log
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

export const Water = {
  init() {
    // Wire global handler for inline HTML onclick="addWater(1)"
    window.addWater = (amt) => {
      Store.addWater(amt);
      AudioEngine.play('water');
    };

    // Re-render on data changes
    document.addEventListener('store:changed', () => this.render());

    // Initial render
    this.render();
  },

  render() {
    this.renderCount();
    this.renderCircle();
    this.renderLog();
    this.renderOverviewWater();
  },

  renderCount() {
    const count = Store.data.waterCount || 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('water-cnt', count);
    set('ov-water', count);
    set('ov-water-big', count);
  },

  renderCircle() {
    const circle = document.getElementById('water-circle');
    if (!circle) return;

    const count = Store.data.waterCount || 0;
    const goal = Store.data.waterGoal || 8;
    const pct = Math.min(count / goal, 1);

    // Update the visual ring
    circle.style.background = `conic-gradient(
      var(--bl3) ${pct * 360}deg,
      rgba(255,255,255,.06) ${pct * 360}deg
    )`;
  },

  renderLog() {
    const log = document.getElementById('water-log');
    if (!log) return;

    const count = Store.data.waterCount || 0;
    const goal = Store.data.waterGoal || 8;

    if (count === 0) {
      log.innerHTML = '<div style="text-align:center;padding:16px;color:var(--mut);font-size:12px">No water logged yet today. Stay hydrated! 💧</div>';
      return;
    }

    const pct = Math.round((count / goal) * 100);
    const remaining = Math.max(0, goal - count);
    const mlConsumed = count * 250;

    log.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="text-align:center;padding:12px;background:rgba(0,176,255,.06);border:1px solid rgba(0,176,255,.18);border-radius:10px">
          <div style="font-family:var(--fh);font-size:24px;color:var(--bl3)">${count}</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">GLASSES</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:10px">
          <div style="font-family:var(--fh);font-size:24px;color:var(--wht)">${mlConsumed}ml</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">CONSUMED</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:10px">
          <div style="font-family:var(--fh);font-size:24px;color:${remaining === 0 ? 'var(--grn)' : 'var(--gld)'}">${remaining === 0 ? '✓' : remaining}</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">${remaining === 0 ? 'GOAL MET' : 'REMAINING'}</div>
        </div>
      </div>
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px;color:var(--mut);font-weight:600">PROGRESS</span>
          <span style="font-size:10px;color:var(--bl3);font-weight:700">${pct}%</span>
        </div>
        <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden">
          <div style="width:${Math.min(pct, 100)}%;height:100%;background:linear-gradient(90deg,var(--bl3),var(--bl2));border-radius:3px;transition:width .6s cubic-bezier(.22,1,.36,1)"></div>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:10px">
        ${Array.from({length: goal}, (_, i) => {
          const filled = i < count;
          return `<div style="flex:1;min-width:28px;height:38px;border-radius:5px;background:${filled ? 'rgba(0,176,255,.15)' : 'rgba(255,255,255,.03)'};border:1px solid ${filled ? 'var(--bl3)' : 'var(--br)'};position:relative;overflow:hidden;transition:all .3s">
            ${filled ? `<div style="position:absolute;bottom:0;left:0;right:0;height:100%;background:linear-gradient(to top,rgba(0,176,255,.5),rgba(41,121,255,.2));transition:height .3s"></div>` : ''}
          </div>`;
        }).join('')}
      </div>
      ${pct >= 100 ? '<div style="text-align:center;margin-top:12px;font-size:12px;color:var(--grn);font-weight:700">🎉 Daily hydration goal complete!</div>' : ''}`;
  },

  renderOverviewWater() {
    const vis = document.getElementById('ov-water-vis');
    if (!vis) return;

    const count = Store.data.waterCount || 0;
    const goal = Store.data.waterGoal || 8;

    vis.innerHTML = Array.from({length: goal}, (_, i) => {
      const filled = i < count;
      return `<div class="wcup ${filled ? 'filled' : ''}" style="flex:1;min-width:18px;height:38px">
        <div class="wfill"></div>
      </div>`;
    }).join('');
  }
};
