import { HR_ZONES, HrZone } from '@/constants/heartRateZones'
import { UserSettings } from '@/types'

export interface WorkoutStats {
  duration: number
  avgHr: number
  maxHr: number
  calories: number
  timeInZones: Record<HrZone, number>
}

class HeartRateService {
  private hrmReadings: number[] = []
  private startTime: number | null = null

  startWorkout() {
    this.hrmReadings = []
    this.startTime = Date.now()
  }

  stopWorkout(userSettings: UserSettings): WorkoutStats | null {
    if (!this.startTime) {
      return null
    }

    const duration = (Date.now() - this.startTime) / 1000 // in seconds
    const avgHr = this.calculateAverageHr()
    const maxHr = this.calculateMaxHr()
    const calories = this.calculateCalories(duration, avgHr, userSettings)
    const timeInZones = this.calculateTimeInZones(userSettings)

    return {
      duration,
      avgHr,
      maxHr,
      calories,
      timeInZones,
    }
  }

  addHrmReading(hr: number) {
    this.hrmReadings.push(hr)
  }

  private calculateAverageHr(): number {
    if (this.hrmReadings.length === 0) {
      return 0
    }
    const sum = this.hrmReadings.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.hrmReadings.length)
  }

  private calculateMaxHr(): number {
    if (this.hrmReadings.length === 0) {
      return 0
    }
    return Math.max(...this.hrmReadings)
  }

  // A simple calorie calculation formula
  private calculateCalories(
    duration: number, // in seconds
    avgHr: number,
    userSettings: UserSettings
  ): number {
    const { userAge, restingHr } = userSettings
    if (!userAge || !restingHr) {
      return 0
    }

    // This is a simplified formula. A more accurate one would use weight and gender.
    const caloriesPerMinute =
      (-55.0969 + 0.6309 * avgHr + 0.1988 * userAge) / 4.184
    const totalCalories = (caloriesPerMinute * duration) / 60
    return Math.round(totalCalories)
  }

  private calculateTimeInZones(userSettings: UserSettings): Record<HrZone, number> {
    const { maxHr } = userSettings
    if (!maxHr) {
      return {
        ZONE_1: 0,
        ZONE_2: 0,
        ZONE_3: 0,
        ZONE_4: 0,
        ZONE_5: 0,
      }
    }

    const timeInZones: Record<HrZone, number> = {
      ZONE_1: 0,
      ZONE_2: 0,
      ZONE_3: 0,
      ZONE_4: 0,
      ZONE_5: 0,
    }

    this.hrmReadings.forEach((hr) => {
      const percentage = (hr / maxHr) * 100
      for (const zone of Object.values(HR_ZONES)) {
        if (percentage >= zone.range[0] && percentage <= zone.range[1]) {
          timeInZones[zone.key] += 1
          break
        }
      }
    })

    return timeInZones
  }
}

export const heartRateService = new HeartRateService()
