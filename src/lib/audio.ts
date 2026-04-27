let audioContext: AudioContext | null = null;

export const playSound = (type: 'fire' | 'deagle' | 'click' | 'hit' | 'headshot' | 'kill' | 'success' | 'error' | 'pop') => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const now = audioContext.currentTime;
  
  switch (type) {
    case 'pop':
      // Satisfying bubble pop sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      oscillator.start(now);
      oscillator.stop(now + 0.08);
      break;

    case 'deagle':
      // HEAVY, high-noise punch for Desert Eagle (.50 AE)
      // Primary Thump (Sub-bass)
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(60, now);
      oscillator.frequency.exponentialRampToValueAtTime(20, now + 0.25);
      
      gainNode.gain.setValueAtTime(0.8, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      oscillator.start(now);
      oscillator.stop(now + 0.3);

      // High-frequency mechanical "Crack"
      const crack = audioContext.createOscillator();
      const crackGain = audioContext.createGain();
      crack.type = 'sawtooth';
      crack.frequency.setValueAtTime(1200, now);
      crack.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      crackGain.gain.setValueAtTime(0.4, now);
      crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      crack.connect(crackGain);
      crackGain.connect(audioContext.destination);
      crack.start(now);
      crack.stop(now + 0.15);

      // Distant Reverb/Noise floor
      const noise = audioContext.createBufferSource();
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.4, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      const noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      const noiseG = audioContext.createGain();
      noiseG.gain.setValueAtTime(0.3, now);
      noiseG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseG);
      noiseG.connect(audioContext.destination);
      noise.start(now);
      break;

    case 'fire':
      // Short white noise / percussion for gun fire
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
      
    case 'click':
      // UI Click
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, now);
      
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      
      oscillator.start(now);
      oscillator.stop(now + 0.05);
      break;
      
    case 'hit':
      // Hitmarker sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, now);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;

    case 'headshot':
      // High pitch ding
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, now);
      oscillator.frequency.exponentialRampToValueAtTime(1500, now + 0.05);
      
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;

    case 'kill':
      // Impact kill
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;

    case 'success':
      // Uplifting arpeggio
      oscillator.type = 'sine';
      [440, 554, 659, 880].forEach((freq, i) => {
        const time = now + i * 0.1;
        oscillator.frequency.setValueAtTime(freq, time);
      });
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
      break;

    case 'error':
      // Low buzz
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, now);
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
  }
};
