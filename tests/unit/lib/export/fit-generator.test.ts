/**
 * @jest-environment jsdom
 */
import { generateFitFile } from '@/lib/export/fit-generator'

describe('lib/export/fit-generator', () => {
  it('should generate a FIT file blob', () => {
    const data = {
      startTime: Date.now(),
      durationSeconds: 60,
      totalCalories: 100,
      userAge: 30,
      userWeight: 75,
      records: [
        { time: Date.now(), hr: 120 },
        { time: Date.now() + 1000, hr: 121 },
      ],
    }

    const blob = generateFitFile(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/octet-stream')
    expect(blob.size).toBeGreaterThan(0)
  })
})
