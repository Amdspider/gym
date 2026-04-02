// ═══════════════════════════════════════════════════════
//   AI COACH - Gemini API Integration
// ═══════════════════════════════════════════════════════
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

export const AI = {
  getStoredKey() {
    return localStorage.getItem('spider_gemini_key') || '';
  },

  async askCoach(userMessage, stateContext) {
    const key = this.getStoredKey();
    if(!key) {
      return "⚠️ **API key not set.**\n\nGo to the **⚙ Settings** page and paste your Gemini API key to activate the coach.";
    }

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const systemInstruction = `You are SPIDER AI Coach — an elite, motivating personal performance coach embedded in the SPIDER OS app. You have a Spider-Man inspired personality: witty, confident, fast-paced, focused on results. Communication style: direct bullet points, specific numbers, highly actionable next steps.

═══ USER DATA CONTEXT ═══
${JSON.stringify(stateContext, null, 2)}
═════════════════════════

COACHING RULES:
1. Reference their EXACT data (habits, calories, workouts).
2. Give CONCRETE action items (e.g., adding +2.5kg to bench).
3. Use **bold** for key numbers.
4. Keep responses punchy (under 250 words total).
5. If they missed a workout, push them to get back in.
6. Make it butter smooth. Use emojis 🕷️🕸️⚡.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
      });

      return result.response.text();
    } catch (err) {
      console.error(err);
      return `❌ **Error connecting to Gemini:** ${err.message}. \n\nPlease check your internet connection or verify your API key in settings.`;
    }
  },

  async analyzeDay() {
    const key = localStorage.getItem('spider_gemini_key');
    if (!key || !Store.data.userProfile) return;

    const t = Store.todayKey();
    const todayData = Store.data.history[t] || {};
    const calories = todayData.calories || 0;
    const goal = Store.data.calorieGoal;
    
    // Only analyze if the user has actually logged a decent amount of calories or it's late in the day
    const hour = new Date().getHours();
    if (calories < (goal * 0.5) && hour < 18) return;

    try {
      const prompt = `You are a strict, motivational AI coach for the SPIDER OS system.
      The user's goal is: ${Store.data.userProfile.goal}.
      Their target calories: ${goal}. They have consumed: ${calories} today.
      Their water intake is: ${todayData.water || 0}/8 glasses.
      Their habit completion is: ${(todayData.done || []).length}/${Store.data.habits.length}.
      
      Give them a very short (max 2 sentences) assessment of their day and 1 piece of actionable advice. Do not use pleasantries.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const txt = data.candidates[0].content.parts[0].text;

      // Drop a toast
      const toast = document.createElement('div');
      toast.className = 'toast show gold';
      toast.innerHTML = `<div class="toast-ico">🤖</div><div><div class="toast-t">COACH INTEL</div><div class="toast-m">${txt}</div></div>`;
      document.getElementById('alert-zone')?.appendChild(toast);
      setTimeout(() => toast.remove(), 10000);

    } catch(e) {
      console.error("AI Analysis failed", e);
    }
  }
};
