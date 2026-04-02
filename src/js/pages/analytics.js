import { Store } from '../state/store.js';

export const Analytics = {
  charts: {},

  init() {
    document.addEventListener('nav:changed', (e) => {
      if(e.detail.page === 'analytics') this.render();
    });
    // Add Chart.js global defaults
    if (window.Chart) {
      Chart.defaults.color = 'rgba(200, 210, 255, 0.42)';
      Chart.defaults.font.family = "'Rajdhani', sans-serif";
      Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.05)';
    }
  },

  render() {
    if (!window.Chart) return;
    
    this.renderHabitsChart();
    this.renderCalorieChart();
    this.renderWaterChart();
  },

  renderHabitsChart() {
    const ctx = document.getElementById('chart-habits');
    if (!ctx) return;

    // Get last 7 days from getWeekData()
    const week = Store.getWeekData();
    const labels = week.map(d => d.label);
    const data = week.map(d => d.total > 0 ? Math.round((d.done / d.total) * 100) : 0);

    if (this.charts.habits) this.charts.habits.destroy();

    this.charts.habits = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Completed %',
          data,
          backgroundColor: data.map(v => v >= 100 ? 'rgba(230,51,41,0.8)' : 'rgba(230,51,41,0.3)'),
          borderColor: 'rgba(230,51,41,1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });
  },

  renderCalorieChart() {
    const ctx = document.getElementById('chart-cal');
    if (!ctx) return;

    // Last 14 days
    const labels = [];
    const data = [];
    const goalData = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const hist = Store.data.history[key];
      
      labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
      data.push(hist ? (hist.calories || 0) : 0);
      goalData.push(Store.data.calorieGoal || 2200);
    }

    if (this.charts.cal) this.charts.cal.destroy();

    this.charts.cal = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Calories',
            data,
            borderColor: '#ffd600',
            backgroundColor: 'rgba(255,214,0,0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Goal',
            data: goalData,
            borderColor: 'rgba(255,255,255,0.2)',
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  },

  renderWaterChart() {
    const ctx = document.getElementById('chart-water');
    if (!ctx) return;

    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const hist = Store.data.history[key];
      
      labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
      data.push(hist ? (hist.water || 0) : 0);
    }

    if (this.charts.water) this.charts.water.destroy();

    this.charts.water = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Glasses',
          data,
          backgroundColor: 'rgba(0,176,255,0.4)',
          borderColor: 'rgba(0,176,255,1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
};
