import { AudioContextType } from '@/context/AudioContext'

export const mockAudioContext: AudioContextType = {
  volume: 50,
  setVolume: () => {},
  muted: false,
  toggleMute: () => {},
  isMuted: false,
  isInitialized: true,
}
