// services/HeartRateService.ts
import { HR_ZONES } from '@/constants'
import { UserSettings } from '@/types'

// A simple calorie burn formula (very basic)
const calculateCalories = (
  hr: number,
  durationSeconds: number,
  age: number,
  weightKg: number = 70
) => {
  // Simplified formula for demonstration
  const caloriesPerMinute =
    age * 0.074 - weightKg * 0.05741 + hr * 0.4472 - 20.4022
  return (caloriesPerMinute * durationSeconds) / 60
}

class HeartRateService {
  private samples: number[] = []
  private startTime: number | null = null
  private userSettings: UserSettings | null = null

  public startSession(settings: UserSettings) {
    this.reset()
    this.startTime = Date.now()
    this.userSettings = settings
  }

  public addSample(hr: number) {
    if (!this.startTime) return
    this.samples.push(hr)
  }

  public getSessionStats() {
    if (!this.startTime || this.samples.length === 0 || !this.userSettings) {
      return {
        avgHr: 0,
        calories: 0,
        timeInZone: {},
        duration: 0,
      }
    }
    const userSettings = this.userSettings

    const duration = (Date.now() - this.startTime) / 1000 // in seconds
    const avgHr = this.samples.reduce((a, b) => a + b, 0) / this.samples.length
    const calories = calculateCalories(avgHr, duration, userSettings.userAge)

    const timeInZone = this.calculateTimeInZones(userSettings)

    return {
      avgHr: Math.round(avgHr),
      calories: Math.round(calories),
      timeInZone,
      duration,
    }
  }

  private calculateTimeInZones(userSettings: UserSettings) {
    const timeInZone: { [key: string]: number } = {}

    // This is a simplified calculation assuming one sample per second
    this.samples.forEach((hr) => {
      const percentage = (hr / userSettings.maxHr) * 100
      for (const zone of HR_ZONES) {
        if (percentage >= zone.range[0] && percentage <= zone.range[1]) {
          timeInZone[zone.name] = (timeInZone[zone.name] || 0) + 1
          break
        }
      }
    })
    return timeInZone
  }

  public reset() {
    this.samples = []
    this.startTime = null
    this.userSettings = null
  }
}

const heartRateService = new HeartRateService()
export default heartRateService
