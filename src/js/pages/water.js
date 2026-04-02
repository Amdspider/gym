// ═══════════════════════════════════════════════════════
//   WATER MODULE - Hydration Tracking
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

export const Water = {
  init() {
    // Wire global handlers for inline HTML calls
    window.addWater = (amt) => this.addWater(amt);

    // Re-render on every store change
    document.addEventListener('store:changed', () => this.renderAll());

    // Initial render
    this.renderAll();
  },

  // ─────────────────────────────────────────────────────
  //  ADD WATER
  // ─────────────────────────────────────────────────────
  addWater(amt) {
    Store.addWater(amt);
    if (amt > 0) {
      AudioEngine.play('water');
      // Animate the circle
      const circle = document.getElementById('water-circle');
      if (circle) {
        circle.style.transform = 'scale(1.08)';
        setTimeout(() => circle.style.transform = 'scale(1)', 300);
      }
    } else {
      AudioEngine.play('click');
    }
  },

  // ─────────────────────────────────────────────────────
  //  MASTER RENDER
  // ─────────────────────────────────────────────────────
  renderAll() {
    this.renderWaterCount();
    this.renderWaterCircle();
    this.renderWaterLog();
  },

  // ─────────────────────────────────────────────────────
  //  WATER COUNT (main + overview)
  // ─────────────────────────────────────────────────────
  renderWaterCount() {
    const count = Store.data.waterCount || 0;
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('water-cnt', count);
  },

  // ─────────────────────────────────────────────────────
  //  WATER CIRCLE PROGRESS
  // ─────────────────────────────────────────────────────
  renderWaterCircle() {
    const circle = document.getElementById('water-circle');
    if (!circle) return;

    const count = Store.data.waterCount || 0;
    const goal = Store.data.waterGoal || 8;
    const pct = Math.min(count / goal, 1);

    // Update the ring color intensity based on progress
    const intensity = Math.round(pct * 100);
    circle.style.background = `
      radial-gradient(circle at center, 
        rgba(0,176,255,${0.03 + pct * 0.12}) 0%, 
        transparent 70%)`;
    circle.style.boxShadow = `
      0 0 ${20 + intensity * 0.4}px rgba(0,176,255,${0.1 + pct * 0.3}),
      inset 0 0 ${15 + intensity * 0.3}px rgba(0,176,255,${0.05 + pct * 0.15})`;
    circle.style.borderColor = `rgba(0,176,255,${0.2 + pct * 0.5})`;
    circle.style.transition = 'all 0.5s ease';

    // Update label
    const lbl = circle.querySelector('.water-lbl');
    if (lbl) {
      if (count >= goal) {
        lbl.textContent = '✅ GOAL REACHED!';
        lbl.style.color = 'var(--grn)';
      } else {
        lbl.textContent = `glasses today`;
        lbl.style.color = '';
      }
    }
  },

  // ─────────────────────────────────────────────────────
  //  WATER LOG
  // ─────────────────────────────────────────────────────
  renderWaterLog() {
    const el = document.getElementById('water-log');
    if (!el) return;

    const count = Store.data.waterCount || 0;
    const goal = Store.data.waterGoal || 8;
    const pct = goal > 0 ? Math.round((count / goal) * 100) : 0;
    const ml = count * 250;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
        <span style="font-size:12px;font-weight:600">Progress</span>
        <span style="font-size:12px;color:var(--bl3);font-weight:700">${pct}%</span>
      </div>
      <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:14px">
        <div style="width:${Math.min(pct, 100)}%;height:100%;background:linear-gradient(90deg,var(--bl3),var(--bl2));border-radius:3px;transition:width .6s ease"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
          <div style="font-family:var(--fh);font-size:22px;color:var(--bl3)">${count}</div>
          <div style="font-size:8px;color:var(--mut);letter-spacing:1px">GLASSES</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
          <div style="font-family:var(--fh);font-size:22px;color:var(--bl3)">${ml}</div>
          <div style="font-size:8px;color:var(--mut);letter-spacing:1px">ML</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
          <div style="font-family:var(--fh);font-size:22px;color:${count >= goal ? 'var(--grn)' : 'var(--gld)'}">${goal - count > 0 ? goal - count : '✓'}</div>
          <div style="font-size:8px;color:var(--mut);letter-spacing:1px">REMAINING</div>
        </div>
      </div>
      <div style="display:flex;gap:4px;margin-top:14px;height:42px">
        ${Array.from({ length: goal }, (_, i) => {
          const filled = i < count;
          return `<div style="flex:1;border-radius:5px;background:rgba(255,255,255,.03);border:1px solid ${filled ? 'var(--bl3)' : 'var(--br)'};position:relative;overflow:hidden;transition:all .3s">
            <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,176,255,.62),rgba(41,121,255,.22));transition:height .38s ease;height:${filled ? '100' : '0'}%"></div>
          </div>`;
        }).join('')}
      </div>`;
  }
};
