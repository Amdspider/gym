// ═══════════════════════════════════════════════════════
//   GYM MODULE - Workout Tracking & Templates
// ═══════════════════════════════════════════════════════
import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';

const TEMPLATES = {
  push: [
    { name: 'Bench Press', grp: 'Chest', sets: 4 },
    { name: 'Incline Dumbbell Press', grp: 'Chest', sets: 3 },
    { name: 'Overhead Press', grp: 'Shoulders', sets: 3 },
    { name: 'Lateral Raises', grp: 'Shoulders', sets: 3 },
    { name: 'Tricep Pushdowns', grp: 'Triceps', sets: 3 },
    { name: 'Overhead Tricep Extension', grp: 'Triceps', sets: 3 },
  ],
  pull: [
    { name: 'Barbell Rows', grp: 'Back', sets: 4 },
    { name: 'Lat Pulldowns', grp: 'Back', sets: 3 },
    { name: 'Face Pulls', grp: 'Back', sets: 3 },
    { name: 'Barbell Curls', grp: 'Biceps', sets: 3 },
    { name: 'Hammer Curls', grp: 'Biceps', sets: 3 },
  ],
  legs: [
    { name: 'Squats', grp: 'Legs', sets: 4 },
    { name: 'Romanian Deadlift', grp: 'Legs', sets: 3 },
    { name: 'Leg Press', grp: 'Legs', sets: 3 },
    { name: 'Leg Curls', grp: 'Legs', sets: 3 },
    { name: 'Calf Raises', grp: 'Legs', sets: 4 },
  ],
  full: [
    { name: 'Squats', grp: 'Legs', sets: 3 },
    { name: 'Bench Press', grp: 'Chest', sets: 3 },
    { name: 'Barbell Rows', grp: 'Back', sets: 3 },
    { name: 'Overhead Press', grp: 'Shoulders', sets: 3 },
    { name: 'Barbell Curls', grp: 'Biceps', sets: 2 },
    { name: 'Tricep Pushdowns', grp: 'Triceps', sets: 2 },
  ],
};

export const Gym = {
  init() {
    window.loadTpl      = (type) => this.loadTemplate(type);
    window.addExModal    = () => this.openAddExModal();
    window.confirmAddEx  = () => this.confirmAddExercise();

    document.addEventListener('store:changed', () => this.renderAll());
    this.renderAll();
  },

  renderAll() {
    this.renderExercises();
    this.renderSessionSummary();
    this.renderPRs();
  },

  // ─────────────────────────────────────────────────────
  //  LOAD WORKOUT TEMPLATE
  // ─────────────────────────────────────────────────────
  loadTemplate(type) {
    const tpl = TEMPLATES[type];
    if (!tpl) return;

    Store.data.exercises = tpl.map((ex, i) => ({
      id: Date.now() + i,
      name: ex.name,
      grp: ex.grp,
      sets: Array.from({ length: ex.sets }, (_, si) => ({
        id: si + 1,
        weight: '',
        reps: '',
        done: false
      }))
    }));
    Store.saveLocal();
    AudioEngine.play('success');
  },

  // ─────────────────────────────────────────────────────
  //  RENDER EXERCISE LIST
  // ─────────────────────────────────────────────────────
  renderExercises() {
    const el = document.getElementById('ex-list');
    if (!el) return;

    const exercises = Store.data.exercises || [];
    if (exercises.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--mut);font-size:12px">Select a template or add exercises manually.</div>`;
      return;
    }

    el.innerHTML = exercises.map((ex, ei) => `
      <div class="ex-card">
        <div class="ex-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <div>
            <div class="ex-nm">${ex.name}</div>
            <div class="ex-mt">${ex.grp}</div>
          </div>
          <div style="font-size:11px;color:var(--mut)">${ex.sets.filter(s => s.done).length}/${ex.sets.length} sets</div>
        </div>
        <div class="ex-body">
          <table class="sets-tbl">
            <thead><tr><th>SET</th><th>WEIGHT (KG)</th><th>REPS</th><th></th></tr></thead>
            <tbody>
              ${ex.sets.map((s, si) => `
                <tr>
                  <td style="font-size:12px;font-weight:700;color:var(--mut)">${s.id}</td>
                  <td><input class="set-inp" type="number" placeholder="0" value="${s.weight || ''}" onchange="window.updateSet(${ei},${si},'weight',this.value)"></td>
                  <td><input class="set-inp" type="number" placeholder="0" value="${s.reps || ''}" onchange="window.updateSet(${ei},${si},'reps',this.value)"></td>
                  <td><button class="set-btn ${s.done ? 'done' : ''}" onclick="window.toggleSet(${ei},${si})">${s.done ? '✓' : 'LOG'}</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
          <button class="add-set-btn" onclick="window.addSet(${ei})">+ ADD SET</button>
        </div>
        <button style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--mut);cursor:pointer;font-size:14px" onclick="window.removeExercise(${ei})">✕</button>
      </div>`).join('');

    // Wire set controls
    window.updateSet = (ei, si, field, val) => {
      Store.data.exercises[ei].sets[si][field] = parseFloat(val) || '';
      Store.saveLocal();
    };

    window.toggleSet = (ei, si) => {
      Store.data.exercises[ei].sets[si].done = !Store.data.exercises[ei].sets[si].done;
      Store.saveLocal();
      AudioEngine.play('toggle');
    };

    window.addSet = (ei) => {
      const sets = Store.data.exercises[ei].sets;
      sets.push({ id: sets.length + 1, weight: '', reps: '', done: false });
      Store.saveLocal();
      AudioEngine.play('click');
    };

    window.removeExercise = (ei) => {
      Store.data.exercises.splice(ei, 1);
      Store.saveLocal();
      AudioEngine.play('click');
    };
  },

  // ─────────────────────────────────────────────────────
  //  SESSION SUMMARY
  // ─────────────────────────────────────────────────────
  renderSessionSummary() {
    const el = document.getElementById('gym-sum');
    if (!el) return;

    const exercises = Store.data.exercises || [];
    const totalSets = exercises.reduce((s, ex) => s + ex.sets.length, 0);
    const doneSets = exercises.reduce((s, ex) => s + ex.sets.filter(s => s.done).length, 0);
    const totalVol = exercises.reduce((s, ex) => s + ex.sets
      .filter(s => s.done)
      .reduce((v, s) => v + (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0), 0), 0);

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
          <div style="font-family:var(--fh);font-size:26px;color:var(--bl3)">${doneSets}/${totalSets}</div>
          <div style="font-size:8px;color:var(--mut);letter-spacing:1px">SETS DONE</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:9px">
          <div style="font-family:var(--fh);font-size:26px;color:var(--gld)">${Math.round(totalVol)}</div>
          <div style="font-size:8px;color:var(--mut);letter-spacing:1px">VOLUME (KG)</div>
        </div>
      </div>`;
  },

  // ─────────────────────────────────────────────────────
  //  PERSONAL RECORDS (PRs)
  // ─────────────────────────────────────────────────────
  renderPRs() {
    const el = document.getElementById('pr-list');
    if (!el) return;

    const prs = Store.data.prs || {};
    const entries = Object.entries(prs);

    // Update PRs from current session
    const exercises = Store.data.exercises || [];
    exercises.forEach(ex => {
      ex.sets.filter(s => s.done && s.weight).forEach(s => {
        const w = parseFloat(s.weight) || 0;
        if (!prs[ex.name] || w > prs[ex.name]) {
          prs[ex.name] = w;
        }
      });
    });

    const prEntries = Object.entries(prs);
    if (prEntries.length === 0) {
      el.innerHTML = `<div style="font-size:11px;color:var(--mut);text-align:center;padding:12px">Complete sets to record PRs</div>`;
      return;
    }

    el.innerHTML = prEntries.map(([name, weight]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:7px;margin-bottom:5px">
        <span style="font-size:12px;font-weight:700">${name}</span>
        <span style="font-family:var(--fh);font-size:18px;color:var(--gld)">${weight}kg</span>
      </div>`).join('');
  },

  // ─────────────────────────────────────────────────────
  //  ADD EXERCISE MODAL
  // ─────────────────────────────────────────────────────
  openAddExModal() {
    const modal = document.getElementById('add-ex-modal');
    if (modal) {
      modal.classList.add('open');
      const nameInp = document.getElementById('me-name');
      if (nameInp) { nameInp.value = ''; nameInp.focus(); }
    }
    AudioEngine.play('nav');
  },

  confirmAddExercise() {
    const name = document.getElementById('me-name')?.value.trim();
    const grp = document.getElementById('me-grp')?.value || 'Chest';
    const setsCount = parseInt(document.getElementById('me-sets')?.value) || 3;

    if (!name) { alert('Enter an exercise name!'); return; }

    if (!Store.data.exercises) Store.data.exercises = [];
    Store.data.exercises.push({
      id: Date.now(),
      name,
      grp,
      sets: Array.from({ length: setsCount }, (_, i) => ({
        id: i + 1, weight: '', reps: '', done: false
      }))
    });

    Store.saveLocal();
    AudioEngine.play('success');

    const modal = document.getElementById('add-ex-modal');
    if (modal) modal.classList.remove('open');
  }
};
