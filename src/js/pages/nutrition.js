import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';
import { AI } from '../ai/gemini.js';

export const Nutrition = {
  activeFoodMatch: null,

  init() {
    this.renderFoodDb();
    
    // Attach event listeners for the food input UI
    window.onFoodInput = () => this.handleFoodSearch();
    window.calcFoodMacros = () => this.handleQtyChange();
    window.addFoodRecord = () => this.addFoodEntry();
    window.saveFoodToDb = () => this.saveToDb();
    window.askAiNutrition = () => this.autoFillWithAI();
  },

  // ─── FOOD DATABASE SETTINGS ───
  saveToDb() {
    const name = document.getElementById('ndb-name').value.trim();
    const base = parseFloat(document.getElementById('ndb-base').value) || 100;
    const unit = document.getElementById('ndb-unit').value;
    const cal = parseFloat(document.getElementById('ndb-k').value) || 0;
    const pro = parseFloat(document.getElementById('ndb-p').value) || 0;
    const crb = parseFloat(document.getElementById('ndb-c').value) || 0;
    const fat = parseFloat(document.getElementById('ndb-f').value) || 0;

    if (!name) return alert("Please enter a food name.");

    if (!Store.data.foodDatabase) Store.data.foodDatabase = {};
    Store.data.foodDatabase[name.toLowerCase()] = { name, base, unit, cal, pro, crb, fat };
    Store.saveLocal();
    AudioEngine.play('success');
    
    // Clear inputs
    document.getElementById('ndb-name').value = '';
    document.getElementById('ndb-base').value = '';
    document.getElementById('ndb-k').value = '';
    document.getElementById('ndb-p').value = '';
    document.getElementById('ndb-c').value = '';
    document.getElementById('ndb-f').value = '';
    
    this.renderFoodDb();
  },

  async autoFillWithAI() {
    const name = document.getElementById('ndb-name').value.trim();
    if (!name) {
      alert("Please enter a Food Name first! (e.g. Peanuts)");
      return;
    }
    
    const qty = document.getElementById('ndb-base').value || 100;
    const unit = document.getElementById('ndb-unit').value === 'g' ? 'grams' : 'units';
    
    document.getElementById('ndb-k').placeholder = '...';
    AudioEngine.play('nav');

    const prompt = `Return ONLY a raw JSON object detailing the exact nutritional values for ${qty} ${unit} of "${name}". Do not use markdown blocks. JSON keys exactly: "cal", "pro", "crb", "fat". Example: {"cal":560, "pro":26, "crb":16, "fat":49}`;
    
    try {
      const resp = await AI.askCoach(prompt, {});
      // Parse out the JSON object if it gave markdown accidentally
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw "No JSON found";
      const data = JSON.parse(jsonMatch[0]);
      
      document.getElementById('ndb-k').value = data.cal || 0;
      document.getElementById('ndb-p').value = data.pro || 0;
      document.getElementById('ndb-c').value = data.crb || 0;
      document.getElementById('ndb-f').value = data.fat || 0;
      AudioEngine.play('success');
    } catch(err) {
      alert("AI Auto-fill failed. Check your Gemini API Key or try manually.\n" + err);
    }
  },

  renderFoodDb() {
    const list = document.getElementById('ndb-list');
    if (!list) return;
    const db = Store.data.foodDatabase || {};
    list.innerHTML = '';
    
    Object.values(db).forEach(f => {
      const div = document.createElement('div');
      div.className = 'fb-card'; // Re-use styling from base
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '8px';
      div.style.marginBottom = '6px';
      div.style.background = 'rgba(255,255,255,0.03)';
      div.style.borderRadius = '6px';
      div.innerHTML = `
        <div>
          <div style="font-weight:bold; font-size:12px; color:var(--wht)">${f.name}</div>
          <div style="font-size:10px; color:var(--mut);">per ${f.base}${f.unit === 'g' ? 'g' : ''}</div>
        </div>
        <div style="font-size:11px; text-align:right;">
          <span style="color:var(--gld);">${f.cal}k</span> / <span style="color:var(--red);">${f.pro}p</span> / <span style="color:var(--bl3);">${f.crb}c</span> / <span style="color:var(--prp);">${f.fat}f</span>
          <button style="background:none; border:none; color:var(--red); cursor:pointer; margin-left:8px;" onclick="window.deleteFoodDb('${f.name}')">🗑</button>
        </div>
      `;
      list.appendChild(div);
    });

    window.deleteFoodDb = (name) => {
      delete Store.data.foodDatabase[name.toLowerCase()];
      Store.saveLocal();
      this.renderFoodDb();
    };
  },

  // ─── MAIN FOOD LOGGING ───
  handleFoodSearch() {
    const name = document.getElementById('food-nm').value.trim().toLowerCase();
    const db = Store.data.foodDatabase || {};
    
    // Find exact match
    const match = db[name];
    if(match) {
      this.activeFoodMatch = match;
      document.getElementById('food-unit').value = match.unit;
      this.handleQtyChange(); // compute with qty=1 or latest
      AudioEngine.play('nav');
    } else {
      this.activeFoodMatch = null;
    }
  },

  handleQtyChange() {
    if(!this.activeFoodMatch) return;
    const f = this.activeFoodMatch;
    const qty = parseFloat(document.getElementById('food-qty').value) || 1;
    const unit = document.getElementById('food-unit').value;
    
    // Determine multiplier based on unit mapping
    let multiplier = 1;
    if (f.unit === 'g' && unit === 'g') {
      multiplier = qty / f.base; // e.g., db is per 100g, they entered 50g -> 0.5
    } else if (f.unit === 'item' && unit === 'item') {
      multiplier = qty / f.base; // e.g., db is per 1 unit, they entered 2 -> 2.0
    } else {
      multiplier = qty / f.base;
    }

    document.getElementById('food-cal').value = Math.round(f.cal * multiplier);
    document.getElementById('food-pro').value = Math.round(f.pro * multiplier);
    document.getElementById('food-crb').value = Math.round(f.crb * multiplier);
    document.getElementById('food-fat').value = Math.round(f.fat * multiplier);
  },

  addFoodEntry() {
    const name = document.getElementById('food-nm').value.trim();
    if (!name) return;

    const qty = document.getElementById('food-qty').value;
    const unit = document.getElementById('food-unit').value;
    
    const cal = parseFloat(document.getElementById('food-cal').value) || 0;
    const pro = parseFloat(document.getElementById('food-pro').value) || 0;
    const crb = parseFloat(document.getElementById('food-crb').value) || 0;
    const fat = parseFloat(document.getElementById('food-fat').value) || 0;

    const entry = {
      id: Date.now(),
      name: `${qty}${unit === 'g' ? 'g' : 'x'} ${name}`,
      cal, pro, crb, fat,
      timestamp: new Date().toISOString()
    };

    if (!Store.data.foods) Store.data.foods = [];
    Store.data.foods.push(entry);
    Store.saveLocal();
    AudioEngine.play('success');

    // Reset UI
    document.getElementById('food-nm').value = '';
    document.getElementById('food-qty').value = '1';
    document.getElementById('food-cal').value = '';
    document.getElementById('food-pro').value = '';
    document.getElementById('food-crb').value = '';
    document.getElementById('food-fat').value = '';
    this.activeFoodMatch = null;
    
    // Call user's global rerender if exists since modular UI bounds are missing
    if(window.renderNutrition) window.renderNutrition();
    document.dispatchEvent(new Event('store:changed'));
  }
};
