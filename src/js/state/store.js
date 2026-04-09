// ═══════════════════════════════════════════════════════
//   APP STATE & DATA STORE
// ═══════════════════════════════════════════════════════
import { pushStateToCloud, pullStateFromCloud, onAuthChange } from './firebase.js';

export const Store = {
  currentUser: null,
  syncTimer: null,
  syncDebounceMs: 1500,
  pendingSyncKey: 'spiderOS_pendingSync',
  localUpdatedKey: 'spiderOS_localUpdatedAt',
  
  data: {
    habits: [
      { id: 1, name: 'Morning Workout', emoji: '🏋️', cat: 'gym', streak: 0 },
      { id: 2, name: 'Read 30 min', emoji: '📚', cat: 'mindset', streak: 0 },
      { id: 3, name: 'Meditate', emoji: '🧘', cat: 'mindset', streak: 0 },
      { id: 4, name: '7h Sleep', emoji: '😴', cat: 'sleep', streak: 0 },
      { id: 5, name: 'No Sugar', emoji: '🚫', cat: 'nutrition', streak: 0 }
    ],
    todayDone: [],
    waterCount: 0,
    waterGoal: 8,
    foods: [],
    calorieGoal: 2200,
    macroGoals: { protein: 150, carbs: 250, fat: 70 },
    foodDatabase: {},
    exercises: [],
    history: {},
    prs: {},
    userProfile: null
  },

  todayKey() { return new Date().toISOString().split('T')[0]; },

  init() {
    this.loadLocal();
    window.addEventListener('online', () => this.flushPendingSync());

    onAuthChange(async (user) => {
      this.currentUser = user;
      if (user) {
        // Authenticated — reconcile local vs cloud by latest update timestamp.
        try {
          const cloudState = await pullStateFromCloud(user.uid);
          const localUpdatedAt = this.getLocalUpdatedAt();
          const cloudUpdatedAt = cloudState?.lastUpdated ? Date.parse(cloudState.lastUpdated) : 0;

          if (cloudState?.state) {
            if (localUpdatedAt > cloudUpdatedAt) {
              this.queueCloudSync(true);
            } else {
              this.data = { ...this.data, ...cloudState.state };
              this.markLocalUpdated(cloudUpdatedAt || Date.now());
            }
            this.ensureTodayData();
            this.saveLocal({ skipCloudSync: true });
          } else {
            // First time, push local to cloud
            this.queueCloudSync(true);
          }
        } catch(e) { console.warn('Cloud sync failed:', e); }
        document.dispatchEvent(new CustomEvent('auth:status', { detail: { authorized: true, email: user.email } }));
        this.flushPendingSync();
      } else {
        document.dispatchEvent(new CustomEvent('auth:status', { detail: { authorized: false, email: null } }));
      }
      document.dispatchEvent(new Event('store:changed'));
    });
  },

  loadLocal() {
    try {
      const s = localStorage.getItem('spiderOS_v4');
      if (s) {
        this.data = { ...this.data, ...JSON.parse(s) };
      }
    } catch (e) {}
    this.ensureTodayData();
  },

  ensureTodayData() {
    const t = this.todayKey();
    if (!this.data.history) this.data.history = {};
    if (!this.data.history[t]) this.data.history[t] = { done: [], water: 0, calories: 0, foods: [], exercises: [], score: 0 };
    
    // Always bind the active state strictly to today's history entry.
    // This clears the flat arrays if a new day has started.
    this.data.todayDone = this.data.history[t].done || [];
    this.data.waterCount = this.data.history[t].water || 0;
    this.data.foods = this.data.history[t].foods || [];
    this.data.exercises = this.data.history[t].exercises || [];
  },

  saveLocal(options = {}) {
    try {
      const t = this.todayKey();
      if (!this.data.history[t]) this.data.history[t] = {};
      this.data.history[t].done = [...this.data.todayDone];
      this.data.history[t].water = this.data.waterCount;
      this.data.history[t].foods = [...(this.data.foods || [])];
      this.data.history[t].exercises = [...(this.data.exercises || [])];
      this.data.history[t].calories = (this.data.foods || []).reduce((s, f) => s + (f.cal || 0), 0);
      this.data.history[t].score = this.getScore();
      this.data.history[t].habitCount = this.data.habits.length;
      
      localStorage.setItem('spiderOS_v4', JSON.stringify(this.data));
      this.markLocalUpdated();
      document.dispatchEvent(new Event('store:changed'));
      
      if (!options.skipCloudSync) {
        if (this.isOnline()) this.queueCloudSync();
        else localStorage.setItem(this.pendingSyncKey, 'true');
      }
    } catch (e) {}
  },

  async syncToCloud() {
    if (!this.currentUser) return;
    if (!this.isOnline()) {
      localStorage.setItem(this.pendingSyncKey, 'true');
      return;
    }
    try {
      await pushStateToCloud(this.currentUser.uid, this.data);
      localStorage.removeItem(this.pendingSyncKey);
    } catch (e) {
      localStorage.setItem(this.pendingSyncKey, 'true');
      console.warn('Cloud sync failed:', e);
    }
  },

  queueCloudSync(immediate = false) {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    if (immediate) {
      this.syncToCloud();
      return;
    }
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.syncToCloud();
    }, this.syncDebounceMs);
  },

  flushPendingSync() {
    const hasPending = localStorage.getItem(this.pendingSyncKey) === 'true';
    if (hasPending || this.currentUser) this.queueCloudSync(true);
  },

  isOnline() {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  },

  markLocalUpdated(ts = Date.now()) {
    localStorage.setItem(this.localUpdatedKey, String(ts));
  },

  getLocalUpdatedAt() {
    const raw = localStorage.getItem(this.localUpdatedKey) || '0';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  // ─── ACTION MUTATORS ───
  toggleHabit(id) {
    const idx = this.data.todayDone.indexOf(id);
    if (idx > -1) this.data.todayDone.splice(idx, 1);
    else this.data.todayDone.push(id);
    this.saveLocal();
  },

  addHabit(habit) {
    this.data.habits.push({
      id: Date.now(),
      name: habit.name,
      emoji: habit.emoji || '✅',
      cat: habit.cat || 'other',
      streak: 0,
      ...habit
    });
    this.saveLocal();
  },

  removeHabit(id) {
    this.data.habits = this.data.habits.filter(h => h.id !== id);
    this.data.todayDone = this.data.todayDone.filter(d => d !== id);
    this.saveLocal();
  },

  addWater(amt) {
    this.data.waterCount = Math.max(0, this.data.waterCount + amt);
    this.saveLocal();
  },

  getScore(dayKey) {
    if (dayKey && dayKey !== this.todayKey()) {
      const day = this.data.history[dayKey];
      if (!day) return 0;
      const totalHabits = day.habitCount || this.data.habits.length;
      const habPts = ((day.done || []).length / Math.max(1, totalHabits)) * 50;
      const wtrPts = Math.min(((day.water || 0) / this.data.waterGoal) * 25, 25);
      const cal = day.calories || 0;
      const dp = Math.abs(cal - this.data.calorieGoal);
      const ntrPts = cal > 0 ? Math.max(0, 25 - (dp / 50)) : 0;
      return Math.round(habPts + wtrPts + ntrPts);
    }
    const habPts = (this.data.todayDone.length / Math.max(1, this.data.habits.length)) * 50;
    const wtrPts = Math.min((this.data.waterCount / this.data.waterGoal) * 25, 25);
    const cal = (this.data.foods || []).reduce((s,f)=>s+(f.cal||0),0);
    const g = this.data.calorieGoal;
    const dp = Math.abs(cal - g);
    const ntrPts = Math.max(0, 25 - (dp / 50));
    return Math.round(habPts + wtrPts + ntrPts);
  },

  getDayData(dateKey) {
    const day = this.data.history[dateKey];
    if (!day) return null;
    return {
      date: dateKey,
      done: day.done || [],
      water: day.water || 0,
      calories: day.calories || 0,
      foods: day.foods || [],
      exercises: day.exercises || [],
      score: day.score || this.getScore(dateKey),
      habitCount: day.habitCount || this.data.habits.length
    };
  },

  getWeekData() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const hist = this.data.history[key];
      days.push({
        key,
        label: d.toLocaleDateString('en', { weekday: 'short' }).toUpperCase().slice(0, 3),
        isToday: i === 0,
        done: hist ? (hist.done || []).length : 0,
        total: hist ? (hist.habitCount || this.data.habits.length) : this.data.habits.length,
        water: hist ? (hist.water || 0) : 0,
        score: hist ? (hist.score || 0) : 0
      });
    }
    return days;
  }
};
