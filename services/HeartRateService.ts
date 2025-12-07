// File: services/HeartRateService.ts
import { HR_ZONES } from '../utils/visualization.js'
import { UserSettings } from '../types/websocket.js'

interface HeartRateDataPoint {
  hr: number
  timestamp: number
}

interface TimeInZone {
  [zone: string]: number
}

export interface WorkoutStats {
  averageHr: number
  caloriesBurned: number
  timeInZones: TimeInZone
  duration: number // in seconds
  date: string
}

class HeartRateService {
  private sessionData: HeartRateDataPoint[] = []
  private userSettings: UserSettings | null = null
  private sessionStartTime: number | null = null

  startSession(settings: UserSettings) {
    this.userSettings = settings
    this.sessionStartTime = Date.now()
    this.sessionData = []
  }

  addHeartRateDataPoint(hr: number) {
    if (!this.sessionStartTime) return
    this.sessionData.push({ hr, timestamp: Date.now() })
  }

  endSession(): WorkoutStats | null {
    if (
      !this.sessionStartTime ||
      !this.userSettings ||
      this.sessionData.length === 0
    )
      return null

    const duration = (Date.now() - this.sessionStartTime) / 1000
    const averageHr =
      this.sessionData.reduce((acc, curr) => acc + curr.hr, 0) /
      this.sessionData.length

    const caloriesBurned = this.sessionData.reduce((acc, curr) => {
      const age = this.userSettings?.userAge ?? 30
      const weight = this.userSettings?.weight ?? 70
      const caloriesPerMinute =
        (-55.0969 + 0.6309 * curr.hr + 0.1988 * weight + 0.2017 * age) /
        4.184 /
        60
      return acc + caloriesPerMinute
    }, 0)

    const timeInZones = this.calculateTimeInZones()

    const workoutStats: WorkoutStats = {
      averageHr,
      caloriesBurned,
      timeInZones,
      duration,
      date: new Date().toISOString(),
    }

    this.sessionStartTime = null
    this.userSettings = null
    this.sessionData = []

    return workoutStats
  }

  private calculateTimeInZones(): TimeInZone {
    if (!this.userSettings) return {}

    const timeInZones: TimeInZone = {}
    HR_ZONES.forEach((zone) => (timeInZones[zone.name] = 0))

    for (let i = 1; i < this.sessionData.length; i++) {
      const previousPoint = this.sessionData[i - 1]
      const currentPoint = this.sessionData[i]
      if (previousPoint && currentPoint) {
        const timeDiff =
          (currentPoint.timestamp - previousPoint.timestamp) / 1000

        const percentageOfMax = currentPoint.hr / this.userSettings.maxHr

        let zoneName = 'Zone 1'
        for (const zone of HR_ZONES) {
          if (percentageOfMax >= zone.min) {
            zoneName = zone.name
          }
        }
        timeInZones[zoneName] = (timeInZones[zoneName] || 0) + timeDiff
      }
    }
    return timeInZones
  }
}

export default HeartRateService
