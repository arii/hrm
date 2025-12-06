// services/HeartRateService.ts
import { HR_ZONES } from '../utils/visualization.js'

interface WorkoutSession {
  startTime: number | null
  endTime: number | null
  hrReadings: number[]
  timeInZones: { [zone: string]: number }
}

class HeartRateService {
  private session: WorkoutSession

  constructor() {
    this.session = this.getInitialSession()
  }

  private getInitialSession(): WorkoutSession {
    return {
      startTime: null,
      endTime: null,
      hrReadings: [],
      timeInZones: Object.fromEntries(HR_ZONES.map((z) => [z.name, 0])),
    }
  }

  startSession() {
    this.session = this.getInitialSession()
    this.session.startTime = Date.now()
  }

  stopSession() {
    this.session.endTime = Date.now()
  }

  addHrReading(bpm: number, maxHr: number) {
    if (!this.session.startTime || this.session.endTime) {
      return // Session not running
    }

    this.session.hrReadings.push(bpm)

    const percentOfMax = bpm / maxHr
    const firstZone = HR_ZONES[0];
    if (!firstZone) {
      return; // Guard against empty HR_ZONES array
    }

    let currentZone = firstZone.name;
    for (let i = HR_ZONES.length - 1; i >= 0; i--) {
      const hrZone = HR_ZONES[i];
      if (hrZone && percentOfMax >= hrZone.min) {
        currentZone = hrZone.name;
        break
      }
    }

    if (typeof this.session.timeInZones[currentZone] === 'number') {
      this.session.timeInZones[currentZone]++;
    }
  }

  getWorkoutSummary() {
    if (!this.session.startTime) {
      return null
    }

    const durationInSeconds =
      ((this.session.endTime || Date.now()) - this.session.startTime) / 1000
    const averageHr =
      this.session.hrReadings.reduce((a, b) => a + b, 0) /
        this.session.hrReadings.length || 0

    // A simple calorie calculation formula.
    // This should be replaced with a more accurate one if user data like weight and gender is available.
    const caloriesBurned = Math.round(
      (averageHr / 150) * 8 * (durationInSeconds / 60)
    )

    return {
      startTime: this.session.startTime,
      endTime: this.session.endTime,
      durationInSeconds: Math.round(durationInSeconds),
      averageHr: Math.round(averageHr),
      caloriesBurned,
      timeInZones: this.session.timeInZones,
    }
  }

  reset() {
    this.session = this.getInitialSession()
  }
}

export const heartRateService = new HeartRateService()
