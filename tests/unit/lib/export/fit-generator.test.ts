/**
 * @jest-environment jsdom
 */
import { generateFitFile } from '@/lib/export/fit-generator'

jest.mock('@markw65/fit-file-writer')

describe('generateFitFile', () => {
  it('should generate a FIT file Blob', () => {
    const data = {
      startTime: Date.now(),
      durationSeconds: 3600,
      totalCalories: 500,
      records: [
        { time: Date.now(), hr: 120 },
        { time: Date.now() + 1000, hr: 125 },
      ],
    }

    const blob = generateFitFile(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/octet-stream')
    expect(blob.size).toBeGreaterThan(0)
  })
})
