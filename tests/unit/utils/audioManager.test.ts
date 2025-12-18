/**
 * @jest-environment jsdom
 */
import { AudioManager } from '@/utils/audioManager'

describe('utils/AudioManager', () => {
  it('should initialize with a default volume of 0.9', () => {
    const audioManager = new AudioManager()
    // Access the private volume property for testing purposes
    expect((audioManager as any).volume).toBe(0.9)
  })
})
