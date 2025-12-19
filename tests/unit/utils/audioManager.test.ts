/**
 * @jest-environment jsdom
 */
import { AudioManager } from '@/utils/audioManager'

describe('utils/AudioManager', () => {
  it('should initialize with a default volume of 0.9', () => {
    const audioManager = new AudioManager()
    // Access the private volume property for testing purposes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((audioManager as any).volume).toBe(0.9)
  })
})
