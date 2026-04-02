// ═══════════════════════════════════════════════════════
//   GYM MODULE — Workouts, Exercises, Tracking
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

export const Gym = {
  init() {
    window.loadTpl = (type) => this.loadTemplate(type);
    window.addExModal = () => this.openModal();
    window.confirmAddEx = () => this.confirmAdd();
    window.logSet = (id, setIdx, weightId, repsId) => this.logSet(id, setIdx, weightId, repsId);
    window.removeExercise = (id) => this.removeExercise(id);
    
    document.addEventListener('store:changed', () => this.render());
    document.addEventListener('nav:changed', (e) => {
      if(e.detail.page === 'gym') this.render();
    });

    this.render();
  },

  render() {
    this.checkLock();
    this.renderExercises();
    this.renderSummary();
    this.renderPRs();
  },

  checkLock() {
    const isGymDone = Store.data.todayDone.some(id => {
      const h = Store.data.habits.find(hx => hx.id === id);
      return h && h.cat === 'gym';
    });
    
    const lock = document.getElementById('gym-lock');
    const act = document.getElementById('gym-active');
    const badge = document.getElementById('gym-badge');
    
    if(!lock || !act || !badge) return;

    if (isGymDone) {
      lock.style.display = 'none';
      act.style.display = 'block';
      badge.textContent = 'UNLOCKED';
      badge.className = 'badge b-act';
    } else {
      lock.style.display = 'block';
      act.style.display = 'none';
      badge.textContent = 'LOCKED';
      badge.className = 'badge b-lck';
    }
  },

  loadTemplate(type) {
    if(Store.data.exercises && Store.data.exercises.length > 0) {
      if(!confirm("This will clear your current session. Load template?")) return;
    }
    
    let template = [];
    if(type === 'push') {
      template = [
        {name:"Bench Press", grp:"Chest", totalSets:4},
        {name:"Overhead Press", grp:"Shoulders", totalSets:3},
        {name:"Incline DB Press", grp:"Chest", totalSets:3},
        {name:"Tricep Pushdown", grp:"Triceps", totalSets:3}
      ];
    } else if(type === 'pull') {
      template = [
        {name:"Deadlift", grp:"Back", totalSets:4},
        {name:"Pull-Ups", grp:"Back", totalSets:3},
        {name:"Barbell Row", grp:"Back", totalSets:3},
        {name:"Bicep Curls", grp:"Biceps", totalSets:3}
      ];
    } else if(type === 'legs') {
      template = [
        {name:"Squat", grp:"Legs", totalSets:4},
        {name:"Leg Press", grp:"Legs", totalSets:3},
        {name:"Leg Extensions", grp:"Legs", totalSets:3},
        {name:"Calf Raises", grp:"Legs", totalSets:4}
      ];
    } else if(type === 'full') {
      template = [
        {name:"Squat", grp:"Legs", totalSets:3},
        {name:"Bench Press", grp:"Chest", totalSets:3},
        {name:"Barbell Row", grp:"Back", totalSets:3},
        {name:"Overhead Press", grp:"Shoulders", totalSets:3}
      ];
    }

    const exIdBase = Date.now();
    Store.data.exercises = template.map((ex, i) => ({
      id: exIdBase + i,
      name: ex.name,
      grp: ex.grp,
      sets: Array(ex.totalSets).fill({ w: '', r: '', done: false })
    }));
    
    Store.saveLocal();
    AudioEngine.play('success');
  },

  renderExercises() {
    const list = document.getElementById('ex-list');
    if(!list) return;

    const exs = Store.data.exercises || [];
    
    if(exs.length === 0) {
      list.innerHTML = `<div style="text-align:center;color:var(--mut);font-size:12px;padding:20px;border:1px dashed var(--br2);border-radius:10px">No exercises in this session. Add one or load a template.</div>`;
      return;
    }

    list.innerHTML = exs.map(ex => {
      let doneCount = ex.sets.filter(s => s.done).length;
      let allDone = doneCount === ex.sets.length;
      let vol = ex.sets.reduce((s, set) => s + (set.done ? ((parseFloat(set.w)||0) * (parseFloat(set.r)||0)) : 0), 0);
      
      const pr = Store.data.prs && Store.data.prs[ex.name.toLowerCase()] || {w:0, r:0};

      return `
      <div class="ex-card">
        <div class="ex-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <div>
            <div class="ex-nm">${ex.name} ${allDone ? '<span style="color:var(--grn);font-size:11px;margin-left:4px">✓ DONE</span>' : ''}</div>
            <div class="ex-mt">${ex.grp} • ${ex.sets.length} SETS${vol > 0 ? ` • <span style="color:var(--gld)">${vol}kg VOL</span>` : ''}</div>
          </div>
          <button style="background:none;border:none;color:var(--mut);font-size:14px;cursor:pointer" onclick="event.stopPropagation(); window.removeExercise(${ex.id})">✕</button>
        </div>
        <div class="ex-body" style="display:${allDone ? 'none' : 'block'}">
          <div style="font-size:9px;color:var(--bl3);margin-bottom:8px;font-weight:700">PR: ${pr.w}kg x ${pr.r}</div>
          <table class="sets-tbl">
            <tr><th>Set</th><th>Weight (kg)</th><th>Reps</th><th></th></tr>
            ${ex.sets.map((set, sIdx) => `
              <tr>
                <td style="font-size:11px;color:var(--mut);font-weight:700">${sIdx + 1}</td>
                <td><input type="number" class="set-inp" id="w_${ex.id}_${sIdx}" value="${set.w || ''}" placeholder="0" ${set.done?'disabled':''}></td>
                <td><input type="number" class="set-inp" id="r_${ex.id}_${sIdx}" value="${set.r || ''}" placeholder="0" ${set.done?'disabled':''}></td>
                <td><button class="set-btn ${set.done?'done':''}" onclick="logSet(${ex.id},${sIdx},'w_${ex.id}_${sIdx}','r_${ex.id}_${sIdx}')">${set.done?'✓':'LOG'}</button></td>
              </tr>
            `).join('')}
          </table>
          <button class="add-set-btn" onclick="window.addSet(${ex.id})">+ ADD SET</button>
        </div>
      </div>
      `;
    }).join('');

    window.addSet = (exId) => {
      const ex = Store.data.exercises.find(e => e.id === exId);
      if(ex) {
        ex.sets.push({w:'', r:'', done:false});
        Store.saveLocal();
        AudioEngine.play('click');
      }
    };
  },

  logSet(exId, setIdx, wid, rid) {
    const w = parseFloat(document.getElementById(wid).value) || 0;
    const r = parseFloat(document.getElementById(rid).value) || 0;
    
    if(w === 0 || r === 0) {
      alert("Enter weight and reps first!");
      return;
    }

    const ex = Store.data.exercises.find(e => e.id === exId);
    if(ex && ex.sets[setIdx]) {
      const isUndoing = ex.sets[setIdx].done;
      ex.sets[setIdx] = { w, r, done: !isUndoing };
      
      // Update PR if it's a new record and not undoing
      if(!isUndoing) {
        if(!Store.data.prs) Store.data.prs = {};
        const key = ex.name.toLowerCase();
        const pr = Store.data.prs[key];
        
        // Simple PR logic (1RM estimate or pure weight)
        const est1RM = w * (1 + (r / 30));
        const prev1RM = pr ? (pr.w * (1 + (pr.r / 30))) : 0;
        
        if(!pr || est1RM > prev1RM) {
          Store.data.prs[key] = { w, r, date: new Date().toISOString() };
        }
      }

      Store.saveLocal();
      AudioEngine.play(isUndoing ? 'click' : 'success');
    }
  },

  removeExercise(id) {
    if(confirm("Remove this exercise?")) {
      Store.data.exercises = Store.data.exercises.filter(e => e.id !== id);
      Store.saveLocal();
      AudioEngine.play('click');
    }
  },

  renderSummary() {
    const sum = document.getElementById('gym-sum');
    if(!sum) return;

    const exs = Store.data.exercises || [];
    let totVol = 0;
    let totSets = 0;

    exs.forEach(ex => {
      ex.sets.forEach(s => {
        if(s.done) {
          totSets++;
          totVol += (parseFloat(s.w)||0) * (parseFloat(s.r)||0);
        }
      });
    });

    sum.innerHTML = `
      <div style="display:flex;gap:12px">
        <div style="flex:1;text-align:center;padding:12px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:10px">
          <div style="font-family:var(--fh);font-size:24px;color:var(--gld)">${totVol}kg</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">TOTAL VOLUME</div>
        </div>
        <div style="flex:1;text-align:center;padding:12px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:10px">
          <div style="font-family:var(--fh);font-size:24px;color:var(--red)">${totSets}</div>
          <div style="font-size:9px;color:var(--mut);letter-spacing:1px;margin-top:2px">WORKING SETS</div>
        </div>
      </div>
    `;
  },

  renderPRs() {
    const list = document.getElementById('pr-list');
    if(!list) return;

    const prs = Store.data.prs || {};
    const keys = Object.keys(prs);

    if(keys.length === 0) {
      list.innerHTML = '<div style="font-size:11px;color:var(--mut);text-align:center">No PRs recorded yet. Keep pushing!</div>';
      return;
    }

    list.innerHTML = keys.map(k => {
      const pr = prs[k];
      return `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--br);font-size:12px">
        <span style="color:var(--wht);text-transform:capitalize">${k}</span>
        <span style="color:var(--gld);font-weight:700">${pr.w}kg x ${pr.r}</span>
      </div>
      `;
    }).join('');
  },

  openModal() {
    const m = document.getElementById('add-ex-modal');
    if(m) m.classList.add('open');
    AudioEngine.play('nav');
  },

  confirmAdd() {
    const name = document.getElementById('me-name').value.trim();
    const grp = document.getElementById('me-grp').value;
    const sets = parseInt(document.getElementById('me-sets').value) || 3;

    if(!name) { alert("Enter exercise name"); return; }

    if(!Store.data.exercises) Store.data.exercises = [];
    
    Store.data.exercises.push({
      id: Date.now(),
      name,
      grp,
      sets: Array(sets).fill({w:'', r:'', done:false})
    });

    Store.saveLocal();
    AudioEngine.play('success');

    document.getElementById('me-name').value = '';
    const m = document.getElementById('add-ex-modal');
    if(m) m.classList.remove('open');
  }
};
