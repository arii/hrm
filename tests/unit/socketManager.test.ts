// @ts-nocheck
import { initSocketManager } from '../../../../utils/socketManager'
import { WebSocketServer } from 'ws'

jest.mock('ws')

describe('initSocketManager', () => {
  it('should be defined', () => {
    expect(initSocketManager).toBeDefined()
  })
})
