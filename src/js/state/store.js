// ═══════════════════════════════════════════════════════
//   APP STATE & DATA STORE
// ═══════════════════════════════════════════════════════
import { pushStateToCloud, pullStateFromCloud, onAuthChange } from './firebase.js';

export const Store = {
  currentUser: null,
  
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
    onAuthChange(async (user) => {
      this.currentUser = user;
      if (user) {
        // Authenticated — pull from cloud to sync down
        try {
          const cloudState = await pullStateFromCloud(user.uid);
          if (cloudState) {
            this.data = { ...this.data, ...cloudState };
            this.ensureTodayData();
            this.saveLocal();
          } else {
            // First time, push local to cloud
            this.syncToCloud();
          }
        } catch(e) { console.warn('Cloud sync failed:', e); }
        document.dispatchEvent(new CustomEvent('auth:status', { detail: { authorized: true, email: user.email } }));
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
    this.data.todayDone = this.data.history[t].done || [];
    this.data.waterCount = this.data.history[t].water || 0;
    // Restore today's foods from history if available
    if (this.data.history[t].foods && this.data.history[t].foods.length > 0 && (!this.data.foods || this.data.foods.length === 0)) {
      this.data.foods = this.data.history[t].foods;
    }
  },

  saveLocal() {
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
      document.dispatchEvent(new Event('store:changed'));
      
      // Auto Sync if logged in
      this.syncToCloud();
    } catch (e) {}
  },

  syncToCloud() {
    if (this.currentUser) {
      try { pushStateToCloud(this.currentUser.uid, this.data); } catch(e) {}
    }
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
