// @ts-nocheck
import { WebSocket, WebSocketServer } from 'ws'
import { initSocketManager } from '../../../utils/socketManager'
import { TabataTimer } from '../../../services/tabataTimer'
import { SpotifyPolling } from '../../../services/spotifyPolling'

jest.mock('ws')
jest.mock('../../../services/tabataTimer')
jest.mock('../../../services/spotifyPolling')

describe('SocketManager Integration', () => {
  it('should be defined', () => {
    expect(initSocketManager).toBeDefined()
  })
})
