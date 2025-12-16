import { WebSocket, Server as WebSocketServer } from 'ws'
import { resetSocketManager, initSocketManager } from '@/utils/socketManager'
import { broadcast } from '@/utils/broadcast'
import { CALORIE_DEFAULTS } from '@/utils/constants'

// Mock dependencies
jest.mock('ws')
jest.mock('@/utils/broadcast')

const mockTabataService = {
  handleCommand: jest.fn(),
  setMode: jest.fn(),
  setConfig: jest.fn(),
}

const mockSpotifyService = {
  handleCommand: jest.fn(),
}

const mockGetSnapshot = jest.fn(() => ({
  timer: {},
  spotify: {},
}))

describe('socketManager calorie calculation', () => {
  let wss: WebSocketServer
  const mockMath = Object.create(global.Math)
  let mockDateNow: jest.SpyInstance

  beforeEach(() => {
    wss = new WebSocketServer()
    jest.clearAllMocks()
    resetSocketManager()

    // Mock Math.random for predictable clientId
    mockMath.random = () => 0.5
    global.Math = mockMath

    // Mock Date.now
    const initialTimestamp = 1700000000000
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(initialTimestamp)

    initSocketManager(
      wss,
      {
        tabataService: mockTabataService,
        spotifyService: mockSpotifyService,
      },
      mockGetSnapshot
    )
  })

  afterEach(() => {
    // Restore global mocks
    global.Math = Object.create(global.Math)
    mockDateNow.mockRestore()
  })

  it('should correctly calculate and accumulate calories over time', () => {
    // --- Setup ---
    const ws = new WebSocket('')
    const predictableClientId = 'user-lfgcojtor' // This is the ID generated when Math.random() returns 0.5

    // --- Act ---
    // 1. Simulate connection
    wss.emit('connection', ws)

    // 2. Simulate HRM_INPUT messages
    const messages = [
      { type: 'HRM_INPUT', data: { value: 120, age: 30, name: 'Jules' } },
      { type: 'HRM_INPUT', data: { value: 125, age: 30, name: 'Jules' } },
      { type: 'HRM_INPUT', data: { value: 130, age: 30, name: 'Jules' } },
    ]

    const initialTimestamp = Date.now()
    let lastTimestamp = initialTimestamp
    let accumulatedCalories = 0

    messages.forEach((msg, index) => {
      // Advance time by 1 second for each message
      const currentTimestamp = initialTimestamp + (index + 1) * 1000
      mockDateNow.mockReturnValue(currentTimestamp)

      const dtMinutes = (currentTimestamp - lastTimestamp) / (1000 * 60)
      lastTimestamp = currentTimestamp

      // Replicate server-side calculation for verification
      const rate =
        (-CALORIE_DEFAULTS.INTERCEPT +
          CALORIE_DEFAULTS.FACTOR_HR * msg.data.value +
          CALORIE_DEFAULTS.FACTOR_WEIGHT * CALORIE_DEFAULTS.WEIGHT_KG +
          CALORIE_DEFAULTS.FACTOR_AGE * msg.data.age) /
        CALORIE_DEFAULTS.JOULE_CONVERSION

      accumulatedCalories += Math.max(0, rate) * dtMinutes

      // Emit the message to the socket manager
      ws.emit('message', JSON.stringify(msg))

      // --- Assert ---
      // Check that broadcast was called with the updated, accumulated calories
      const expectedCalories = Math.round(accumulatedCalories * 10) / 10
      expect(broadcast).toHaveBeenLastCalledWith({
        type: 'HRM_UPDATE',
        payload: expect.arrayContaining([
          expect.objectContaining({
            clientId: predictableClientId,
            name: 'Jules',
            value: msg.data.value,
            calories: expect.closeTo(expectedCalories, 1),
          }),
        ]),
      })
    })
  })
})
