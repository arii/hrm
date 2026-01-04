// tests/unit/services/workoutHistoryService.test.ts
import { WorkoutHistoryService } from '../../../services/workoutHistoryService'
import { Workout } from '../../../types/workout'
import fs from 'fs/promises'
import path from 'path'

const HISTORY_FILE_PATH = path.join(
  process.cwd(),
  'logs',
  'workout-history.json'
)

const mockWorkout: Workout = {
  id: 'test-id',
  userId: 'test-user',
  timestamp: new Date().toISOString(),
  duration: 3600,
  averageHeartRate: 150,
  maxHeartRate: 180,
  caloriesBurned: 500,
  trainingLoad: 100,
  zoneDistribution: {
    zone1: 600,
    zone2: 1200,
    zone3: 1200,
    zone4: 600,
    zone5: 0,
  },
}

describe('WorkoutHistoryService', () => {
  let service: WorkoutHistoryService

  beforeEach(async () => {
    // Clear the history file before each test
    await fs.writeFile(HISTORY_FILE_PATH, '[]')
    service = new WorkoutHistoryService()
    await service.ensureInitialized()
  })

  it('should add a workout to the history', async () => {
    await service.addWorkout(mockWorkout)
    const history = await service.getHistory()
    expect(history).toEqual([mockWorkout])
  })

  it('should get the workout history', async () => {
    await service.addWorkout(mockWorkout)
    const history = await service.getHistory()
    expect(history).toEqual([mockWorkout])
  })

  it('should get a workout by id', async () => {
    await service.addWorkout(mockWorkout)
    const workout = await service.getWorkoutById('test-id')
    expect(workout).toEqual(mockWorkout)
  })

  it('should update a workout', async () => {
    await service.addWorkout(mockWorkout)
    const updatedWorkout = { ...mockWorkout, duration: 4000 }
    await service.updateWorkout('test-id', updatedWorkout)
    const workout = await service.getWorkoutById('test-id')
    expect(workout).toEqual(updatedWorkout)
  })

  it('should delete a workout', async () => {
    await service.addWorkout(mockWorkout)
    await service.deleteWorkout('test-id')
    const history = await service.getHistory()
    expect(history).toEqual([])
  })
})
