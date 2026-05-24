export function playUrduAudio(text: string) {
  if (!('speechSynthesis' in window)) {
    console.warn("Text-to-Speech not supported in this browser.");
    return;
  }
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ur-PK"; // Urdu (Pakistan)
  utterance.rate = 0.9; // Slightly slower for clarity
  
  // Try to find a specific Urdu voice if available
  const voices = window.speechSynthesis.getVoices();
  const urduVoice = voices.find(v => v.lang.includes("ur"));
  if (urduVoice) {
    utterance.voice = urduVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}

export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // First high-quality digital ding (A5 - 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);
    
    // Second digital ding (E6 - 1318.5Hz) delayed by 120ms for rich harmonic delay
    setTimeout(() => {
      try {
        if (ctx.state === "closed") return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1318.5, ctx.currentTime);
        
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.8);
      } catch (err) {
        console.error("Second chime osc error:", err);
      }
    }, 120);
  } catch (error) {
    console.error("Failed to play synthesized audio chime:", error);
  }
}
