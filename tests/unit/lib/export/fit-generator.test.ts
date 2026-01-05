/**
 * @jest-environment jsdom
 */
import { generateFitFile } from '@/lib/export/fit-generator'

describe('fit-generator', () => {
  it('should generate a FIT file blob with user data', () => {
    const data = {
      startTime: new Date().getTime(),
      durationSeconds: 30,
      totalCalories: 50,
      records: [
        { time: new Date().getTime(), hr: 120 },
        { time: new Date().getTime() + 1000, hr: 122 },
      ],
      userAge: 30,
      userWeight: 80,
      gender: 'male' as 'male' | 'female' | undefined,
    }

    const blob = generateFitFile(data)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/octet-stream')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate a FIT file blob without user data', () => {
    const data = {
      startTime: new Date().getTime(),
      durationSeconds: 30,
      totalCalories: 50,
      records: [
        { time: new Date().getTime(), hr: 120 },
        { time: new Date().getTime() + 1000, hr: 122 },
      ],
    }

    const blob = generateFitFile(data)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/octet-stream')
    expect(blob.size).toBeGreaterThan(0)
  })
})
