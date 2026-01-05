/**
 * @jest-environment jsdom
 */
import { generateFitFile } from '@/lib/export/fit-generator'
import FitParser from 'fit-file-parser'

interface ParsedFitFile {
  user_profiles: Array<{
    weight: number
    age: number
  }>
}

describe('fit-generator', () => {
  it('should generate a FIT file with correct user profile data', async () => {
    const testData = {
      startTime: Date.now(),
      durationSeconds: 120,
      totalCalories: 150,
      records: [
        { time: Date.now() + 1000, hr: 120 },
        { time: Date.now() + 2000, hr: 125 },
        { time: Date.now() + 3000, hr: 130 },
      ],
      userWeight: 75,
      userAge: 30,
    }

    const blob = generateFitFile(testData)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(blob.type).toBe('application/octet-stream')

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(blob)
    })

    const fitParser = new FitParser({ force: true })

    await new Promise<void>((resolve) => {
      fitParser.parse(arrayBuffer, (err: Error | null, data: ParsedFitFile) => {
        expect(err).toBeFalsy()
        expect(data.user_profiles).toHaveLength(1)
        expect(data.user_profiles[0].weight).toBe(75)
        expect(data.user_profiles[0].age).toBe(30)
        resolve()
      })
    })
  }, 15000)
})
