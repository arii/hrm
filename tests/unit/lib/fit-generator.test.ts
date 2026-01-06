/**
 * @jest-environment jsdom
 */
import { generateFitFile } from '@/lib/fit-generator'

describe('generateFitFile', () => {
  it('should generate a valid FIT file with session and record data', (done) => {
    const startTime = Date.now()
    const records = [
      { time: startTime + 1000, hr: 120 },
      { time: startTime + 2000, hr: 122 },
      { time: startTime + 3000, hr: 121 },
    ]

    const blob = generateFitFile({
      startTime,
      durationSeconds: 3,
      totalCalories: 10,
      records,
      age: 30,
      weightKg: 70,
    })

    const reader = new FileReader()
    reader.onload = async function (event) {
      try {
        const { default: FitParser } = await import('fit-file-parser')
        const fitParser = new FitParser({ force: true })
        fitParser.parse(event.target.result, (error, data) => {
          expect(error).toBeUndefined()
          expect(data).toBeDefined()
          expect(data.activity).toBeDefined()
          expect(data.activity.sessions).toHaveLength(1)
          expect(data.activity.sessions[0].total_calories).toBe(10)
          expect(data.activity.records).toHaveLength(3)
          expect(data.activity.records[0].heart_rate).toBe(120)
          done()
        })
      } catch (e) {
        done(e)
      }
    }
    reader.readAsArrayBuffer(blob)
  })
})
