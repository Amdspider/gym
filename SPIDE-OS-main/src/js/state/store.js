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
        const cloudState = await pullStateFromCloud(user.uid);
        if (cloudState) {
          this.data = { ...this.data, ...cloudState };
          this.saveLocal();
        } else {
          // First time, push local to cloud
          this.syncToCloud();
        }
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
    if (!this.data.history[t]) this.data.history[t] = { done: [], water: 0, calories: 0, score: 0 };
    this.data.todayDone = this.data.history[t].done || [];
    this.data.waterCount = this.data.history[t].water || 0;
  },

  saveLocal() {
    try {
      const t = this.todayKey();
      if (!this.data.history[t]) this.data.history[t] = {};
      this.data.history[t].done = [...this.data.todayDone];
      this.data.history[t].water = this.data.waterCount;
      this.data.history[t].calories = (this.data.foods || []).reduce((s, f) => s + (f.cal || 0), 0);
      
      localStorage.setItem('spiderOS_v4', JSON.stringify(this.data));
      document.dispatchEvent(new Event('store:changed'));
      
      // Auto Sync if logged in
      this.syncToCloud();
    } catch (e) {}
  },

  syncToCloud() {
    if (this.currentUser) pushStateToCloud(this.currentUser.uid, this.data);
  },

  // ─── ACTION MUTATORS ───
  toggleHabit(id) {
    const idx = this.data.todayDone.indexOf(id);
    if (idx > -1) this.data.todayDone.splice(idx, 1);
    else this.data.todayDone.push(id);
    this.saveLocal();
  },

  addWater(amt) {
    this.data.waterCount = Math.max(0, this.data.waterCount + amt);
    this.saveLocal();
  },

  getScore() {
    const habPts = (this.data.todayDone.length / Math.max(1, this.data.habits.length)) * 50;
    const wtrPts = Math.min((this.data.waterCount / this.data.waterGoal) * 25, 25);
    const cal = (this.data.foods || []).reduce((s,f)=>s+(f.cal||0),0);
    const g = this.data.calorieGoal;
    const dp = Math.abs(cal - g);
    const ntrPts = Math.max(0, 25 - (dp / 50));
    return Math.round(habPts + wtrPts + ntrPts);
  }
};
