// services/HeartRateService.ts
import workoutRepository from './WorkoutRepository'
import { UserSettings } from '@/types'
import { HeartRateDataPoint } from '@/types/data-models'
import crypto from 'crypto'
import { HR_ZONES } from '@/constants'

class HeartRateService {
  private currentSessionId: string | null = null
  private startTime: number | null = null
  private userSettings: UserSettings | null = null
  private samples: HeartRateDataPoint[] = []

  public startSession(settings: UserSettings) {
    this.reset()
    this.currentSessionId = crypto.randomUUID()
    this.startTime = Date.now()
    this.userSettings = settings
  }

  public addSample(hr: number) {
    if (!this.currentSessionId || !this.startTime) return
    this.samples.push({
      id: crypto.randomUUID(),
      workoutSessionId: this.currentSessionId,
      timestamp: Date.now(),
      heartRate: hr,
    })
  }

  public async endSession() {
    if (!this.currentSessionId || !this.startTime || !this.userSettings)
      return null

    const endTime = new Date().toISOString()
    const stats = this.getSessionStats()

    const fullSessionData = {
      id: this.currentSessionId,
      userId: 'user-id-placeholder',
      startedAt: new Date(this.startTime).toISOString(),
      endedAt: endTime,
      source: 'live_tracking' as const,
      phases: [],
      notes: '',
      samples: this.samples,
      avgHr: stats.avgHr,
      calories: stats.calories,
      duration: stats.duration,
      timeInZone: stats.timeInZone,
    }

    await workoutRepository.saveSession(fullSessionData)

    this.reset()
    return stats
  }

  public getSessionStats() {
    if (!this.startTime || this.samples.length === 0 || !this.userSettings) {
      return {
        avgHr: 0,
        calories: 0,
        duration: 0,
        timeInZone: {},
      }
    }

    const duration = (Date.now() - this.startTime) / 1000 // in seconds
    const avgHr =
      this.samples.reduce((a, b) => a + b.heartRate, 0) / this.samples.length
    const calories = this.calculateCalories(
      avgHr,
      duration,
      this.userSettings.userAge
    )
    const timeInZone = this.calculateTimeInZones()

    return {
      avgHr: Math.round(avgHr),
      calories: Math.round(calories),
      duration,
      timeInZone,
    }
  }

  private calculateTimeInZones() {
    const timeInZone: { [key: string]: number } = {}
    if (!this.userSettings) return timeInZone

    // This is a simplified calculation assuming one sample per second
    this.samples.forEach((sample) => {
      const percentage = (sample.heartRate / this.userSettings!.maxHr) * 100
      for (const zone of HR_ZONES) {
        if (percentage >= zone.range[0] && percentage <= zone.range[1]) {
          timeInZone[zone.name] = (timeInZone[zone.name] || 0) + 1
          break
        }
      }
    })
    return timeInZone
  }

  private calculateCalories(
    hr: number,
    durationSeconds: number,
    age: number,
    weightKg: number = 70
  ) {
    const caloriesPerMinute =
      age * 0.074 - weightKg * 0.05741 + hr * 0.4472 - 20.4022
    return (caloriesPerMinute * durationSeconds) / 60
  }

  private reset() {
    this.currentSessionId = null
    this.startTime = null
    this.userSettings = null
    this.samples = []
  }
}

const heartRateService = new HeartRateService()
export default heartRateService
