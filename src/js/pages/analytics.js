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
    }
  },

  render() {
    if (!window.Chart) return;
    
    // Extracted trailing 7 days data for all 4 charts
    const labels = [];
    const habitsData = [];
    const waterData = [];
    const calData = [];
    const scoreData = [];
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const hist = Store.data.history[key];
      
      labels.push(d.toLocaleDateString('en', { weekday: 'short' }));
      
      if(hist) {
        const hPct = hist.habitCount > 0 ? (hist.done.length / hist.habitCount) * 100 : 0;
        habitsData.push(hPct);
        waterData.push(hist.water || 0);
        calData.push(hist.calories || 0);
        scoreData.push(hist.score || 0);
      } else {
        habitsData.push(0); waterData.push(0); calData.push(0); scoreData.push(0);
      }
    }

    this.createLineChart('chart-habits', this.charts.habits, labels, habitsData, '#e63329', 'rgba(230,51,41,0.2)', '%', (ctx, chart) => this.charts.habits = chart);
    this.createLineChart('chart-water', this.charts.water, labels, waterData, '#00b0ff', 'rgba(0,176,255,0.2)', 'gl', (ctx, chart) => this.charts.water = chart);
    this.createLineChart('chart-cal', this.charts.cal, labels, calData, '#ffd600', 'rgba(255,214,0,0.2)', 'k', (ctx, chart) => this.charts.cal = chart);
    this.createLineChart('chart-score', this.charts.score, labels, scoreData, '#b47bff', 'rgba(180,123,255,0.2)', 'pts', (ctx, chart) => this.charts.score = chart);
  },

  createLineChart(id, existingChart, labels, data, hexColor, fillRgba, unit, saveRef) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    
    if (existingChart) existingChart.destroy();

    // Create a smooth gradient
    let gradient = null;
    const canvasContext = ctx.getContext('2d');
    if (canvasContext) {
      gradient = canvasContext.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, fillRgba);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: hexColor,
          backgroundColor: gradient || fillRgba,
          borderWidth: 2,
          pointBackgroundColor: hexColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(8,13,26,0.9)',
            titleFont: { family: "'Orbitron', sans-serif", size: 10 },
            bodyFont: { family: "'Rajdhani', sans-serif", size: 14, weight: 'bold' },
            padding: 10,
            borderColor: hexColor,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `${ctx.raw}${unit}`
            }
          }
        },
        scales: {
          x: { border: { display: false }, grid: { display: false } },
          y: { 
            beginAtZero: true, border: { display: false },
            ticks: { maxTicksLimit: 5, callback: val => `${val}${unit}` }
          }
        },
        layout: { padding: { top: 10, bottom: 10 } }
      }
    });

    saveRef(ctx, chart);
  }
};
