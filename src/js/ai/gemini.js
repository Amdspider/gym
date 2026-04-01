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
  }
};
