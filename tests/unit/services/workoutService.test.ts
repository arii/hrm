// tests/unit/services/workoutService.test.ts
import { promises as fs } from 'fs'
import { saveWorkout, getWorkouts } from '../../../services/workoutService'
import { Workout } from '../../../types'

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}))

const mockFs = fs as jest.Mocked<typeof fs>

describe('workoutService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should save a workout', async () => {
    const workout: Workout = {
      id: '1',
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 100,
      caloriesBurned: 10,
      userName: 'Test User',
    }

    mockFs.readFile.mockResolvedValueOnce(JSON.stringify([]))

    await saveWorkout(workout)

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify([workout], null, 2)
    )
  })

  it('should get workouts', async () => {
    const workouts: Workout[] = [
      {
        id: '1',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 100,
        caloriesBurned: 10,
        userName: 'Test User',
      },
    ]

    mockFs.readFile.mockResolvedValueOnce(JSON.stringify(workouts))

    const result = await getWorkouts()

    expect(result).toEqual(workouts)
  })
})
