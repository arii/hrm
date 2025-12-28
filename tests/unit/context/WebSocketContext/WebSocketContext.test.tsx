import { reducer, INITIAL_STATE } from '@/context/WebSocketContext'
import { ServerMessage } from '@/types/websocket'

describe('WebSocket reducer', () => {
  it('should handle HRM_UPDATE for a new user', () => {
    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [{ clientId: '1', name: 'Test User', value: 120, maxHr: 190 }],
    }
    const newState = reducer(INITIAL_STATE, message)
    expect(newState.hrmData).toEqual([
      {
        clientId: '1',
        name: 'Test User',
        value: 120,
        maxHr: 190,
        isConnected: true,
      },
    ])
  })

  it('should handle HRM_UPDATE for an existing user', () => {
    const currentState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          name: 'Test User',
          value: 120,
          maxHr: 190,
          isConnected: true,
        },
      ],
    }
    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [{ clientId: '1', name: 'Test User', value: 125, maxHr: 190 }],
    }
    const newState = reducer(currentState, message)
    expect(newState.hrmData).toEqual([
      {
        clientId: '1',
        name: 'Test User',
        value: 125,
        maxHr: 190,
        isConnected: true,
      },
    ])
  })

  it('should handle HRM_UPDATE when a user disconnects', () => {
    const currentState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          name: 'Test User',
          value: 125,
          maxHr: 190,
          isConnected: true,
        },
      ],
    }
    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [],
    }
    const newState = reducer(currentState, message)
    expect(newState.hrmData).toEqual([
      {
        clientId: '1',
        name: 'Test User',
        value: 125,
        maxHr: 190,
        isConnected: false,
      },
    ])
  })

  it('should handle HRM_UPDATE with multiple users', () => {
    const currentState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          name: 'Test User 1',
          value: 120,
          maxHr: 190,
          isConnected: true,
        },
        {
          clientId: '2',
          name: 'Test User 2',
          value: 130,
          maxHr: 195,
          isConnected: true,
        },
      ],
    }
    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [
        { clientId: '1', name: 'Test User 1', value: 125, maxHr: 190 },
        { clientId: '3', name: 'Test User 3', value: 140, maxHr: 200 },
      ],
    }
    const newState = reducer(currentState, message)
    expect(newState.hrmData).toEqual([
      {
        clientId: '1',
        name: 'Test User 1',
        value: 125,
        maxHr: 190,
        isConnected: true,
      },
      {
        clientId: '2',
        name: 'Test User 2',
        value: 130,
        maxHr: 195,
        isConnected: false,
      },
      {
        clientId: '3',
        name: 'Test User 3',
        value: 140,
        maxHr: 200,
        isConnected: true,
      },
    ])
  })

  it('should persist user data on reconnect', () => {
    const currentState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          name: 'Test User',
          value: 120,
          maxHr: 190,
          isConnected: false,
        },
      ],
    }
    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [{ clientId: '1', value: 125 }],
    }
    const newState = reducer(currentState, message)
    expect(newState.hrmData).toEqual([
      {
        clientId: '1',
        name: 'Test User',
        value: 125,
        maxHr: 190,
        isConnected: true,
      },
    ])
  })
})
