import { Store } from '../state/store.js';

export const Analytics = {
  metricConfig: {
    habits: { id: 'chart-habits', color: '#e63329', fill: 'rgba(230,51,41,0.18)', unit: '%', max: 100 },
    water: { id: 'chart-water', color: '#00b0ff', fill: 'rgba(0,176,255,0.18)', unit: 'gl', max: null },
    cal: { id: 'chart-cal', color: '#ffd600', fill: 'rgba(255,214,0,0.18)', unit: 'k', max: null },
    score: { id: 'chart-score', color: '#b47bff', fill: 'rgba(180,123,255,0.18)', unit: 'pts', max: 100 }
  },

  init() {
    document.addEventListener('nav:changed', (e) => {
      if(e.detail.page === 'analytics') this.render();
    });
    document.addEventListener('store:changed', () => {
      if (document.getElementById('page-analytics')?.style.display !== 'none') this.render();
    });
    window.addEventListener('resize', () => {
      if (document.getElementById('page-analytics')?.style.display !== 'none') this.render();
    });
  },

  render() {
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
        const totalHabits = hist.habitCount || Store.data.habits.length;
        const hPct = totalHabits > 0 ? Math.round(((hist.done || []).length / totalHabits) * 100) : 0;
        habitsData.push(hPct);
        waterData.push(hist.water || 0);
        calData.push(hist.calories || 0);
        scoreData.push(hist.score || 0);
      } else {
        habitsData.push(0); waterData.push(0); calData.push(0); scoreData.push(0);
      }
    }

    this.drawMetricChart(this.metricConfig.habits, labels, habitsData);
    this.drawMetricChart(this.metricConfig.water, labels, waterData);
    this.drawMetricChart(this.metricConfig.cal, labels, calData);
    this.drawMetricChart(this.metricConfig.score, labels, scoreData);
  },

  drawMetricChart(config, labels, data) {
    const canvas = document.getElementById(config.id);
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(260, canvas.clientWidth || canvas.parentElement?.clientWidth || 260);
    const height = Math.max(170, canvas.clientHeight || 170);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const leftPad = 28;
    const rightPad = 10;
    const topPad = 12;
    const bottomPad = 24;
    const chartW = width - leftPad - rightPad;
    const chartH = height - topPad - bottomPad;

    if (chartW <= 0 || chartH <= 0 || labels.length === 0) return;

    const maxData = Math.max(1, ...data);
    const yMax = config.max || this.roundNice(maxData);

    context.strokeStyle = 'rgba(255,255,255,0.07)';
    context.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = topPad + (chartH * i) / 4;
      context.beginPath();
      context.moveTo(leftPad, y);
      context.lineTo(leftPad + chartW, y);
      context.stroke();
    }

    const points = data.map((value, i) => {
      const x = labels.length === 1 ? leftPad + chartW / 2 : leftPad + (chartW * i) / (labels.length - 1);
      const y = topPad + chartH - (Math.min(value, yMax) / yMax) * chartH;
      return { x, y, value };
    });

    const fillGradient = context.createLinearGradient(0, topPad, 0, topPad + chartH);
    fillGradient.addColorStop(0, config.fill);
    fillGradient.addColorStop(1, 'rgba(0,0,0,0)');

    context.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) context.moveTo(pt.x, pt.y);
      else context.lineTo(pt.x, pt.y);
    });
    context.lineTo(points[points.length - 1].x, topPad + chartH);
    context.lineTo(points[0].x, topPad + chartH);
    context.closePath();
    context.fillStyle = fillGradient;
    context.fill();

    context.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) context.moveTo(pt.x, pt.y);
      else context.lineTo(pt.x, pt.y);
    });
    context.strokeStyle = config.color;
    context.lineWidth = 2;
    context.stroke();

    points.forEach((pt) => {
      context.beginPath();
      context.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      context.fillStyle = config.color;
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1;
      context.stroke();
    });

    context.fillStyle = 'rgba(200, 210, 255, 0.48)';
    context.font = "11px Rajdhani, sans-serif";
    context.textAlign = 'center';
    labels.forEach((label, i) => {
      const x = labels.length === 1 ? leftPad + chartW / 2 : leftPad + (chartW * i) / (labels.length - 1);
      context.fillText(label, x, height - 8);
    });

    context.textAlign = 'right';
    context.fillStyle = 'rgba(200, 210, 255, 0.42)';
    context.font = "10px Rajdhani, sans-serif";
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((yMax * (4 - i)) / 4);
      const y = topPad + (chartH * i) / 4 + 3;
      context.fillText(`${value}${config.unit}`, leftPad - 4, y);
    }
  },

  roundNice(value) {
    if (value <= 10) return 10;
    if (value <= 25) return 25;
    if (value <= 50) return 50;
    if (value <= 100) return 100;
    return Math.ceil(value / 50) * 50;
  }
};
