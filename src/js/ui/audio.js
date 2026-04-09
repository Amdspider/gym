// ═══════════════════════════════════════════════════════
//   AUDIO ENGINE - Web Audio API Synthesis
// ═══════════════════════════════════════════════════════

export const AudioEngine = {
  ctx: null,
  enabled: true,
  pack: 'scifi', // 'scifi', 'minimal', 'spider', 'classic', 'cinematic'
  masterVolume: 0.3,

  init() {
    if(!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Load saved settings
    const settings = JSON.parse(localStorage.getItem('spiderOS_audio') || '{}');
    if (settings.enabled !== undefined) this.enabled = settings.enabled;
    if (settings.pack) this.pack = settings.pack;
    if (settings.vol) this.masterVolume = settings.vol;

    // Attach click listeners to all buttons/inputs automatically
    document.addEventListener('click', (e) => {
      if(!this.enabled) return;
      const t = e.target.closest('button, .hi, .ex-hdr, .g-btn, .wbtn, .nb');
      if(t) {
        if(t.classList.contains('nb')) this.play('nav');
        else if(t.classList.contains('wcup') || t.classList.contains('wbtn')) this.play('water');
        else if(t.textContent.includes('ADD') || t.textContent.includes('SAVE')) this.play('success');
        else this.play('click');
      }
    });

    // Checkboxes / toggles
    document.addEventListener('change', (e) => {
      if(!this.enabled) return;
      if(e.target.tagName === 'INPUT' && e.target.type === 'checkbox') this.play('toggle');
    });
  },

  play(type) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Default envelope
    gain.gain.setValueAtTime(0, t);
    
    // Scifi Pack
    if (this.pack === 'scifi') {
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      }
      else if (type === 'nav') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.8, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      }
      else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.setValueAtTime(1200, t + 0.1);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      }
      else if (type === 'water') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.2);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      }
      else if (type === 'toggle') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.5, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      }
      else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(200, t + 0.2);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    }
    // Spider Pack
    else if (this.pack === 'spider') {
      if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      } else if (type === 'nav') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.7, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      } else if (type === 'success' || type === 'water') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, t);
        osc.frequency.linearRampToValueAtTime(1900, t + 0.1);
        osc.frequency.linearRampToValueAtTime(1800, t + 0.2);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    } 
    // Minimal Pack
    else if (this.pack === 'minimal') {
      osc.type = 'sine';
      if (type === 'click') {
        osc.frequency.setValueAtTime(600, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
      } else {
        osc.frequency.setValueAtTime(800, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    }
    // Classic Arcade Pack
    else if (this.pack === 'classic') {
      if (type === 'click') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.08);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.9, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
      } else if (type === 'nav') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.setValueAtTime(700, t + 0.05);
        osc.frequency.setValueAtTime(900, t + 0.1);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.75, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        osc.start(t);
        osc.stop(t + 0.14);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, t);
        osc.frequency.setValueAtTime(990, t + 0.08);
        osc.frequency.setValueAtTime(1320, t + 0.16);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.8, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.22);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(420, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.6, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    }
    // Cinematic Soft Pack
    else if (this.pack === 'cinematic') {
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(380, t + 0.12);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.55, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        osc.start(t);
        osc.stop(t + 0.14);
      } else if (type === 'nav') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(520, t + 0.18);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.5, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.setValueAtTime(660, t + 0.08);
        osc.frequency.setValueAtTime(880, t + 0.16);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.7, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      } else if (type === 'water') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(420, t + 0.16);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.55, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.45, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
      }
    }
  },

  saveSettings(enabled, pack, vol) {
    this.enabled = enabled;
    this.pack = pack;
    this.masterVolume = vol;
    localStorage.setItem('spiderOS_audio', JSON.stringify({ enabled, pack, vol }));
    this.play('success');
  }
};
