import { useState, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  // Use refs to hold the Audio objects
  const sounds = useRef<{ WORK: HTMLAudioElement | null; REST: HTMLAudioElement | null; COUNTDOWN: HTMLAudioElement | null }>({
    WORK: null,
    REST: null,
    COUNTDOWN: null,
  });

  // Call this function *after* the user's first click
  const initAudio = useCallback(() => {
    if (isInitialized) return;

    // Pre-load the sounds
    sounds.current.WORK = new Audio('/beep-hi.wav');
    sounds.current.REST = new Audio('/beep-lo.wav');
    sounds.current.COUNTDOWN = new Audio('/beep-lo.wav');
    
    // You can play a short, silent sound to "unlock" the audio context
    // This is a common trick
    if (sounds.current.WORK) {
      sounds.current.WORK.volume = 0;
      sounds.current.WORK.play().catch(e => console.warn("Audio context not unlocked", e));
      sounds.current.WORK.volume = 1;
    }

    setIsInitialized(true);
  }, [isInitialized]);

  const playSound = useCallback((soundName: 'WORK' | 'REST' | 'COUNTDOWN') => {
    if (!isInitialized || !sounds.current[soundName]) {
      console.warn(`Audio not initialized or sound "${soundName}" not found.`);
      return;
    }

    const audio = sounds.current[soundName];
    if (audio) {
      audio.currentTime = 0; // Rewind to start
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  }, [isInitialized]);

  return { initAudio, playSound };
};
