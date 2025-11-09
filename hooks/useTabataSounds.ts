// File: hooks/useTabataSounds.ts
// Plays short audio cues when the Tabata timer broadcasts soundToPlay transitions.
// Uses Web Audio API to synthesize simple beeps so we avoid bundling audio assets.
// Patterns:
//   WORK: 2 quick high beeps
//   REST: 1 medium beep
//   COUNTDOWN: rapid low ticks (e.g., last 3 seconds)

import { useEffect, useRef } from "react";

interface BeepSpec {
  frequency: number; // Hz
  duration: number; // ms
  gain: number; // 0..1
  delay?: number; // ms after previous
}

const playBeepSequence = (audioCtx: AudioContext, sequence: BeepSpec[]) => {
  const now = audioCtx.currentTime;
  sequence.forEach((beep, _index) => {
    const startAt = now + (beep.delay || 0) / 1000;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.frequency.value = beep.frequency;
    osc.type = "sine";
    gainNode.gain.setValueAtTime(beep.gain, startAt);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      startAt + beep.duration / 1000
    );
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(startAt + beep.duration / 1000);
  });
};

// Predefined sequences
const sequences: Record<string, BeepSpec[]> = {
  WORK: [
    { frequency: 880, duration: 120, gain: 0.3 },
    { frequency: 1040, duration: 120, gain: 0.3, delay: 180 },
  ],
  REST: [{ frequency: 660, duration: 220, gain: 0.25 }],
  COUNTDOWN: [
    { frequency: 440, duration: 80, gain: 0.2 },
    { frequency: 440, duration: 80, gain: 0.2, delay: 120 },
    { frequency: 440, duration: 80, gain: 0.2, delay: 240 },
  ],
};

/**
 * Hook to play Tabata sound cues when the server broadcasts timerData.soundToPlay.
 * It debounces repeated identical cues by tracking lastPlayed in a ref.
 */
const useTabataSounds = (soundToPlay?: "WORK" | "REST" | "COUNTDOWN") => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!soundToPlay) return;
    // Avoid repeating same cue if state update duplicates
    if (lastPlayedRef.current === soundToPlay) return;

    // Lazy init AudioContext (iOS requires user gesture; on desktop it's fine)
    if (!audioCtxRef.current) {
      try {
        type WindowWithWebkitAudioContext = Window & { webkitAudioContext?: { new (contextOptions?: AudioContextOptions): AudioContext } };
        const AudioContextConstructor = window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext;
        if (AudioContextConstructor) {
          audioCtxRef.current = new AudioContextConstructor();
        } else {
          throw new Error("AudioContext not supported");
        }
      } catch (e) {
        console.warn("AudioContext initialization failed:", e);
        return;
      }
    }

    const seq = sequences[soundToPlay];
    if (seq && audioCtxRef.current) {
      playBeepSequence(audioCtxRef.current, seq);
      lastPlayedRef.current = soundToPlay;
    }
  }, [soundToPlay]);
};

export default useTabataSounds;
