// ═══════════════════════════════════════════════════════
//   NUTRITION MODULE - Food DB, Macro Tracking, Auto-Calc
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';
import { AI } from '../ai/gemini.js';

export const Nutrition = {
  activeFoodMatch: null,

  init() {
    // Wire global handlers for inline HTML calls
    window.onFoodInput      = () => this.handleFoodSearch();
    window.calcFoodMacros   = () => this.handleQtyChange();
    window.addFoodRecord    = () => this.addFoodEntry();
    window.saveFoodToDb     = () => this.saveToDb();
    window.askAiNutrition   = () => this.autoFillWithAI();
    window.saveMacroGoals   = (withAlert) => this.saveMacroGoals(withAlert);
    window.renderNutrition  = () => this.renderNutrition();

    // On every store change, re-render the nutrition dashboard
    document.addEventListener('store:changed', () => this.renderNutrition());

    // Populate settings goal inputs from stored values
    this.loadGoalInputs();
    this.renderFoodDb();
    this.renderNutrition();
  },

  // ─────────────────────────────────────────────────────
  //  MACRO PROGRESS DASHBOARD (Nutrition Page)
  // ─────────────────────────────────────────────────────
  renderNutrition() {
    const foods = Store.data.foods || [];
    const goals = Store.data.macroGoals || { protein: 150, carbs: 250, fat: 70 };
    const calGoal = Store.data.calorieGoal || 2200;

    // Tally today's intakes
    const totCal = foods.reduce((s, f) => s + (f.cal || 0), 0);
    const totPro = foods.reduce((s, f) => s + (f.pro || 0), 0);
    const totCrb = foods.reduce((s, f) => s + (f.crb || 0), 0);
    const totFat = foods.reduce((s, f) => s + (f.fat || 0), 0);

    // Update the 4 summary cards
    const setEl = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    setEl('sum-cal', totCal);
    setEl('sum-pro', totPro + 'g');
    setEl('sum-crb', totCrb + 'g');
    setEl('sum-fat', totFat + 'g');
    setEl('goal-cal-lbl', `/ ${calGoal} kcal`);
    setEl('goal-pro-lbl', `/ ${goals.protein}g goal`);
    setEl('goal-crb-lbl', `/ ${goals.carbs}g goal`);
    setEl('goal-fat-lbl', `/ ${goals.fat}g goal`);

    // Build the color-coded progress bars
    const dash = document.getElementById('macro-dashboard');
    if (!dash) return;
    
    const pct  = (val, goal) => Math.min(Math.round((val / Math.max(1, goal)) * 100), 100);
    const metColor = (p) => p >= 100 ? 'var(--grn)' : p >= 70 ? 'var(--gld)' : 'var(--red)';

    const bars = [
      { label: 'Calories', val: totCal, goal: calGoal, unit: 'kcal', color: 'var(--gld)' },
      { label: 'Protein',  val: totPro, goal: goals.protein, unit: 'g', color: 'var(--red)' },
      { label: 'Carbs',    val: totCrb, goal: goals.carbs,   unit: 'g', color: 'var(--bl3)' },
      { label: 'Fats',     val: totFat, goal: goals.fat,     unit: 'g', color: 'var(--prp)' },
    ];

    dash.innerHTML = bars.map(b => {
      const p = pct(b.val, b.goal);
      const remaining = Math.max(0, b.goal - b.val);
      const status = p >= 100 ? '✅ GOAL MET' : `${remaining}${b.unit} remaining`;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px; align-items:center;">
            <span style="font-size:11px; font-weight:700; color:${b.color}; letter-spacing:1px;">${b.label.toUpperCase()}</span>
            <span style="font-size:10px; color:var(--mut);">${b.val}${b.unit} / ${b.goal}${b.unit} &nbsp;·&nbsp; <span style="color:${metColor(p)}">${status}</span></span>
          </div>
          <div style="height:7px; border-radius:4px; background:rgba(255,255,255,.08); overflow:hidden;">
            <div style="width:${p}%; height:100%; background:${b.color}; border-radius:4px; transition:width .6s cubic-bezier(.22,1,.36,1);"></div>
          </div>
        </div>`;
    }).join('');

    // Render the food log entries
    this.renderFoodLog();
  },

  renderFoodLog() {
    const logEl = document.getElementById('food-log');
    if (!logEl) return;
    const foods = Store.data.foods || [];

    if (foods.length === 0) {
      logEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--mut); font-size:12px;">No food logged today. Add your first meal! 🍽️</div>`;
      return;
    }

    logEl.innerHTML = foods.map((f, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,.03); border:1px solid var(--br); border-radius:9px;">
        <div>
          <div style="font-size:13px; font-weight:700; color:var(--wht);">${f.name}</div>
          <div style="font-size:10px; color:var(--mut); margin-top:2px;">
            <span style="color:var(--gld);">${f.cal}kcal</span> &nbsp;•&nbsp;
            <span style="color:var(--red);">${f.pro}g P</span> &nbsp;•&nbsp;
            <span style="color:var(--bl3);">${f.crb}g C</span> &nbsp;•&nbsp;
            <span style="color:var(--prp);">${f.fat}g F</span>
          </div>
        </div>
        <button onclick="window.removeFoodEntry(${i})" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:16px; padding:4px 8px;">🗑</button>
      </div>`).join('');

    window.removeFoodEntry = (idx) => {
      Store.data.foods.splice(idx, 1);
      Store.saveLocal();
      AudioEngine.play('click');
    };
  },

  // ─────────────────────────────────────────────────────
  //  FOOD SEARCH & AUTO-FILL
  // ─────────────────────────────────────────────────────
  handleFoodSearch() {
    const query = document.getElementById('food-nm').value.trim().toLowerCase();
    const db = Store.data.foodDatabase || {};
    const suggestEl = document.getElementById('food-suggestions');

    if (!query || !suggestEl) { if(suggestEl) suggestEl.style.display = 'none'; return; }

    // Find partial matches
    const matches = Object.values(db).filter(f => f.name.toLowerCase().includes(query));

    if (matches.length === 0) {
      suggestEl.style.display = 'none';
      this.activeFoodMatch = null;
      return;
    }

    suggestEl.style.display = 'block';
    suggestEl.innerHTML = matches.map(f => `
      <div onclick="window.selectFood('${f.name.toLowerCase()}')"
        style="padding:9px 12px; cursor:pointer; border-bottom:1px solid var(--br); font-size:12px; color:var(--wht);"
        onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='transparent'">
        <strong>${f.name}</strong>
        <span style="color:var(--mut); margin-left:8px;">per ${f.base}${f.unit === 'item' ? '' : f.unit} → ${f.cal}kcal / ${f.pro}g P / ${f.crb}g C / ${f.fat}g F</span>
      </div>`).join('');

    window.selectFood = (key) => {
      const match = db[key];
      if (!match) return;
      this.activeFoodMatch = match;
      document.getElementById('food-nm').value = match.name;
      document.getElementById('food-unit').value = match.unit;
      if (suggestEl) suggestEl.style.display = 'none';
      this.handleQtyChange();
      AudioEngine.play('nav');
    };
  },

  handleQtyChange() {
    if (!this.activeFoodMatch) return;
    const f = this.activeFoodMatch;
    const qty = parseFloat(document.getElementById('food-qty').value) || 1;
    const multiplier = qty / Math.max(1, f.base);

    document.getElementById('food-cal').value = Math.round(f.cal * multiplier);
    document.getElementById('food-pro').value = Math.round(f.pro * multiplier);
    document.getElementById('food-crb').value = Math.round(f.crb * multiplier);
    document.getElementById('food-fat').value = Math.round(f.fat * multiplier);
  },

  addFoodEntry() {
    const name = document.getElementById('food-nm').value.trim();
    if (!name) return;

    const qty  = document.getElementById('food-qty').value || 1;
    const unit = document.getElementById('food-unit').value;
    const cal  = parseFloat(document.getElementById('food-cal').value) || 0;
    const pro  = parseFloat(document.getElementById('food-pro').value) || 0;
    const crb  = parseFloat(document.getElementById('food-crb').value) || 0;
    const fat  = parseFloat(document.getElementById('food-fat').value) || 0;

    Store.data.foods = Store.data.foods || [];
    Store.data.foods.push({
      id: Date.now(),
      name: `${qty}${unit === 'item' ? 'x' : unit} ${name}`,
      cal, pro, crb, fat,
    });
    Store.saveLocal();
    AudioEngine.play('success');

    // Clear inputs
    ['food-nm','food-cal','food-pro','food-crb','food-fat'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = '';
    });
    document.getElementById('food-qty').value = '1';
    const sug = document.getElementById('food-suggestions');
    if(sug) sug.style.display = 'none';
    this.activeFoodMatch = null;
  },

  // ─────────────────────────────────────────────────────
  //  FOOD DATABASE (Settings)
  // ─────────────────────────────────────────────────────
  saveToDb() {
    const name = document.getElementById('ndb-name').value.trim();
    const base = parseFloat(document.getElementById('ndb-base').value) || 100;
    const unit = document.getElementById('ndb-unit').value;
    const cal  = parseFloat(document.getElementById('ndb-k').value) || 0;
    const pro  = parseFloat(document.getElementById('ndb-p').value) || 0;
    const crb  = parseFloat(document.getElementById('ndb-c').value) || 0;
    const fat  = parseFloat(document.getElementById('ndb-f').value) || 0;

    if (!name) { alert("Please enter a food name."); return; }

    Store.data.foodDatabase = Store.data.foodDatabase || {};
    Store.data.foodDatabase[name.toLowerCase()] = { name, base, unit, cal, pro, crb, fat };
    Store.saveLocal();
    AudioEngine.play('success');

    ['ndb-name','ndb-base','ndb-k','ndb-p','ndb-c','ndb-f'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = '';
    });
    this.renderFoodDb();
  },

  async autoFillWithAI() {
    const name = document.getElementById('ndb-name').value.trim();
    if (!name) { alert("Enter a food name first! e.g. Chicken Breast"); return; }

    const qty  = document.getElementById('ndb-base').value || 100;
    const unit = document.getElementById('ndb-unit').value === 'g' ? 'grams' : 'units';

    ['ndb-k','ndb-p','ndb-c','ndb-f'].forEach(id => {
      const el = document.getElementById(id); if(el) { el.value = ''; el.placeholder = '...'; }
    });
    AudioEngine.play('nav');

    const prompt = `Return ONLY a raw JSON object (no markdown, no code fences) with the nutritional values for ${qty} ${unit} of "${name}". Use exactly these keys: "cal", "pro", "crb", "fat". Example: {"cal":560,"pro":26,"crb":16,"fat":49}`;

    try {
      const resp = await AI.askCoach(prompt, {});
      const jsonMatch = resp.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const data = JSON.parse(jsonMatch[0]);

      document.getElementById('ndb-k').value = data.cal || 0;
      document.getElementById('ndb-p').value = data.pro || 0;
      document.getElementById('ndb-c').value = data.crb || 0;
      document.getElementById('ndb-f').value = data.fat || 0;
      AudioEngine.play('success');
    } catch (err) {
      ['ndb-k','ndb-p','ndb-c','ndb-f'].forEach(id => {
        const el = document.getElementById(id); if(el) el.placeholder = '?';
      });
      alert("AI Auto-fill failed. Check your Gemini API Key.\nError: " + err.message);
    }
  },

  renderFoodDb() {
    const list = document.getElementById('ndb-list');
    if (!list) return;
    const db = Store.data.foodDatabase || {};
    const entries = Object.values(db);

    if (entries.length === 0) {
      list.innerHTML = `<div style="font-size:11px; color:var(--mut); text-align:center; padding:10px;">No foods saved yet.</div>`;
      return;
    }

    list.innerHTML = entries.map(f => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(255,255,255,.03); border-radius:7px; margin-bottom:5px;">
        <div>
          <span style="font-weight:700; font-size:12px; color:var(--wht);">${f.name}</span>
          <span style="font-size:10px; color:var(--mut); margin-left:6px;">per ${f.base}${f.unit === 'g' ? 'g' : ''}</span>
        </div>
        <div style="font-size:10px; text-align:right; display:flex; align-items:center; gap:8px;">
          <span style="color:var(--gld);">${f.cal}k</span>
          <span style="color:var(--red);">${f.pro}p</span>
          <span style="color:var(--bl3);">${f.crb}c</span>
          <span style="color:var(--prp);">${f.fat}f</span>
          <button onclick="window.deleteFoodDb('${f.name.toLowerCase()}')"
            style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;padding:2px 4px;">🗑</button>
        </div>
      </div>`).join('');

    window.deleteFoodDb = (key) => {
      delete Store.data.foodDatabase[key];
      Store.saveLocal();
      AudioEngine.play('click');
      this.renderFoodDb();
    };
  },

  // ─────────────────────────────────────────────────────
  //  MACRO GOALS (Settings)
  // ─────────────────────────────────────────────────────
  loadGoalInputs() {
    const goals  = Store.data.macroGoals || { protein: 150, carbs: 250, fat: 70 };
    const calG   = Store.data.calorieGoal || 2200;
    const setInp = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
    setInp('goal-cal-inp', calG);
    setInp('goal-pro-inp', goals.protein);
    setInp('goal-crb-inp', goals.carbs);
    setInp('goal-fat-inp', goals.fat);
  },

  saveMacroGoals(withAlert) {
    const cal = parseFloat(document.getElementById('goal-cal-inp').value) || 2200;
    const pro = parseFloat(document.getElementById('goal-pro-inp').value) || 150;
    const crb = parseFloat(document.getElementById('goal-crb-inp').value) || 250;
    const fat = parseFloat(document.getElementById('goal-fat-inp').value) || 70;

    Store.data.calorieGoal = cal;
    Store.data.macroGoals = { protein: pro, carbs: crb, fat };
    Store.saveLocal();
    AudioEngine.play('success');
    this.renderNutrition();
    if (withAlert === true) alert("✅ Macro goals saved!");
  }
};
