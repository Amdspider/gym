import { Store } from '../state/store.js';
import { AudioEngine } from '../ui/audio.js';
import { AI } from '../ai/gemini.js';

export const Onboarding = {
  init() {
    // Only show if userProfile is null and we are not in the old 'ob-wrap'
    // But since the old ob-wrap is just an intro, we'll let main handle intro skipping.
    // We check userProfile to show the modal.
    setTimeout(() => {
      if (!Store.data.userProfile) {
        this.openModal();
      } else {
        this.fillSettingsForm();
      }
    }, 1000);

    // Global hooks
    window.submitOnboarding = () => this.submitOnboarding();
    window.saveSettingsBio = () => this.saveSettingsBio();
    window.forceAiCalibration = () => this.generateAiProtocol();
  },

  openModal() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.classList.add('open');
      AudioEngine.play('nav');
    }
  },

  closeModal() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.remove('open');
  },

  submitOnboarding() {
    const age = parseInt(document.getElementById('ob-age').value) || 25;
    const gender = document.getElementById('ob-gender').value;
    const weight = parseFloat(document.getElementById('ob-weight').value) || 70;
    const height = parseFloat(document.getElementById('ob-height').value) || 175;
    const activity = parseFloat(document.getElementById('ob-activity').value) || 1.55;
    const goal = document.getElementById('ob-goal').value;

    this.processProfile({ age, gender, weight, height, activity, goal });
    this.closeModal();
    AudioEngine.play('success');

    // Automatically trigger AI generation of protocol if key exists
    if (localStorage.getItem('spider_gemini_key')) {
      this.generateAiProtocol();
    } else {
      alert("Profile Saved! Consider adding your Gemini API key in Settings to generate a custom macro/workout protocol.");
    }
  },

  saveSettingsBio() {
    const age = parseInt(document.getElementById('set-age').value) || 25;
    const weight = parseFloat(document.getElementById('set-weight').value) || 70;
    const height = parseFloat(document.getElementById('set-height').value) || 175;
    const gender = document.getElementById('set-gender').value;
    const activity = parseFloat(document.getElementById('set-activity').value) || 1.55;
    const goal = document.getElementById('set-goal').value;

    this.processProfile({ age, gender, weight, height, activity, goal });
    AudioEngine.play('click');
    
    const toast = document.createElement('div');
    toast.className = 'toast show good';
    toast.innerHTML = `<div class="toast-ico">✅</div><div><div class="toast-t">SAVED</div><div class="toast-m">Biometrics updated.</div></div>`;
    document.getElementById('alert-zone')?.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  processProfile(p) {
    Store.data.userProfile = p;

    // Calculate BMR (Mifflin-St Jeor)
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr += (p.gender === 'male') ? 5 : -161;

    // Calculate TDEE
    let tdee = bmr * p.activity;

    // Goal adjustments
    let targetCals = tdee;
    if (p.goal === 'cut') targetCals -= 500;
    else if (p.goal === 'bulk') targetCals += 300;

    Store.data.calorieGoal = Math.round(targetCals);

    // Macros: Protein 2g/kg, Fat 1g/kg, Rest Carbs
    const protein = Math.round(p.weight * 2.2);
    const fat = Math.round(p.weight * 1);
    const pCals = protein * 4;
    const fCals = fat * 9;
    const carbs = Math.max(0, Math.round((targetCals - pCals - fCals) / 4));

    Store.data.macroGoals = { protein, fat, carbs };
    Store.saveLocal();
    
    this.fillSettingsForm();
  },

  fillSettingsForm() {
    const p = Store.data.userProfile;
    if (!p) return;
    
    const setObj = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setObj('set-age', p.age);
    setObj('set-weight', p.weight);
    setObj('set-height', p.height);
    setObj('set-gender', p.gender);
    setObj('set-activity', p.activity);
    setObj('set-goal', p.goal);
  },

  async generateAiProtocol() {
    if (!localStorage.getItem('spider_gemini_key')) {
      alert("Please save your Gemini API key in Settings first!");
      return;
    }
    document.getElementById('coach-panel').style.display = 'flex';
    document.getElementById('coach-output').innerHTML += `<div class="ai-msg">Analyzing biometrics and calibrating your protocol...</div>`;
    
    const prompt = `You are a professional fitness coach. The user just inputted their biometrics:
    Weight: ${Store.data.userProfile.weight}kg, Height: ${Store.data.userProfile.height}cm, Age: ${Store.data.userProfile.age}, Gender: ${Store.data.userProfile.gender}.
    Their goal is: ${Store.data.userProfile.goal}.
    Their calculated daily calories are: ${Store.data.calorieGoal}kcal.
    
    Please provide a concise, high-intensity, motivational daily routine, and a very short summary of a good meal plan for them. Format your response into a clean, easy-to-read list. Use Spider-man/tactical themed language.`;

    const response = await AI.ask(prompt);
    
    document.getElementById('coach-output').innerHTML += `<div class="ai-msg">${response}</div>`;
    AudioEngine.play('success');
  }
};
