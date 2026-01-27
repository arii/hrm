import { jest } from '@jest/globals'
import { resetHrmData, _test_ } from '../../../utils/socketManager'
import * as websocketUtils from '../../../utils/websocketUtils'

jest.mock('../../../utils/websocketUtils', () => ({
  ...jest.requireActual('../../../utils/websocketUtils'),
  broadcast: jest.fn(),
}))

describe('socketManager', () => {
  afterEach(() => {
    _test_?._resetState()
    jest.clearAllMocks()
  })
  describe('resetHrmData', () => {
    it('should reset calorie data for all clients and broadcast the new state', () => {
      // Arrange
      const mockClients = new Map()
      mockClients.set('client1', {
        clientId: 'client1',
        value: 120,
        calories: 100,
        accumulatedCalories: 200,
      })
      mockClients.set('client2', {
        clientId: 'client2',
        value: 130,
        calories: 150,
        accumulatedCalories: 250,
      })
      _test_?._setClientData(mockClients)

      // Act
      resetHrmData()

      // Assert
      const broadcastMock = jest.spyOn(websocketUtils, 'broadcast')
      expect(broadcastMock).toHaveBeenCalled()

      const client1Data = _test_?.hrmDataRepository.findById('client1')
      const client2Data = _test_?.hrmDataRepository.findById('client2')
      const client1Session = _test_?.clientSessionState.get('client1')
      const client2Session = _test_?.clientSessionState.get('client2')

      expect(client1Data?.calories).toBe(0)
      expect(client2Data?.calories).toBe(0)
      expect(client1Session?.accumulatedCalories).toBe(0)
      expect(client2Session?.accumulatedCalories).toBe(0)
    })
  })
})
