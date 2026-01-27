import { jest } from '@jest/globals'
import {
  _resetState,
  _setClientData,
  resetHrmData,
} from '../../../utils/socketManager'
import * as websocketUtils from '../../../utils/websocketUtils'

jest.mock('../../../utils/websocketUtils', () => ({
  ...jest.requireActual('../../../utils/websocketUtils'),
  broadcast: jest.fn(),
}))

describe('socketManager', () => {
  afterEach(() => {
    _resetState()
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
      _setClientData(mockClients)

      // Act
      resetHrmData()

      // Assert
      const broadcastMock = jest.spyOn(websocketUtils, 'broadcast')
      expect(broadcastMock).toHaveBeenCalled()
    })
  })
})
