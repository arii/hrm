// tests/integration/app/api/workouts/route.test.ts
import { GET, POST, PUT, DELETE } from '../../../../../app/api/workouts/route'
import { serviceContainer } from '../../../../../lib/serviceContainer'
import { WorkoutHistoryService } from '../../../../../services/workoutHistoryService'
import { Workout } from '../../../../../types/workout'
import { getServerSession } from 'next-auth/next'

jest.mock('next-auth/next')

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

describe('/api/workouts', () => {
  let service: WorkoutHistoryService

  beforeEach(async () => {
    service = new WorkoutHistoryService()
    await service.ensureInitialized()
    serviceContainer.register('workoutHistoryService', service)
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } })
  })

  it('should reject unauthenticated requests', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const request = new Request('http://localhost/api/workouts')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('should get the workout history', async () => {
    await service.addWorkout(mockWorkout)
    const request = new Request('http://localhost/api/workouts')
    const response = await GET(request)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual([mockWorkout])
  })

  it('should get a workout by id', async () => {
    await service.addWorkout(mockWorkout)
    const request = new Request('http://localhost/api/workouts?id=test-id')
    const response = await GET(request)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual(mockWorkout)
  })

  it('should add a workout', async () => {
    const request = new Request('http://localhost/api/workouts', {
      method: 'POST',
      body: JSON.stringify(mockWorkout),
    })
    const response = await POST(request)
    const body = await response.json()
    expect(response.status).toBe(201)
    expect(body).toEqual(mockWorkout)
  })

  it('should update a workout', async () => {
    await service.addWorkout(mockWorkout)
    const updatedWorkout = { ...mockWorkout, duration: 4000 }
    const request = new Request('http://localhost/api/workouts?id=test-id', {
      method: 'PUT',
      body: JSON.stringify(updatedWorkout),
    })
    const response = await PUT(request)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual(updatedWorkout)
  })

  it('should delete a workout', async () => {
    await service.addWorkout(mockWorkout)
    const request = new Request('http://localhost/api/workouts?id=test-id', {
      method: 'DELETE',
    })
    const response = await DELETE(request)
    expect(response.status).toBe(200)
    const history = await service.getHistory()
    expect(history).toEqual([])
  })
})
