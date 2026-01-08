/**
 * @jest-environment jsdom
 */
import { reducer, INITIAL_STATE } from '../../../context/webSocketReducer'

describe('webSocketReducer', () => {
  it('should return the initial state', () => {
    // The action here is intentionally an unknown type to test the default case of the reducer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(reducer(INITIAL_STATE, { type: 'UNKNOWN_ACTION' } as any)).toEqual(
      INITIAL_STATE
    )
  })

  it('should handle RESET_STATE', () => {
    const currentState = {
      ...INITIAL_STATE,
      hrmData: [{ clientId: '1', hr: 120, isConnected: true }],
    }
    expect(reducer(currentState, { type: 'RESET_STATE' })).toEqual(
      INITIAL_STATE
    )
  })

  it('should handle INITIAL_STATE', () => {
    const payload = {
      hrmData: [{ clientId: '1', hr: 120 }],
      timerData: { isRunning: true },
    }
    const expectedState = {
      ...INITIAL_STATE,
      ...payload,
      hrmData: [{ clientId: '1', hr: 120, isConnected: true }],
    }
    expect(
      reducer(INITIAL_STATE, { type: 'INITIAL_STATE', payload } as any)
    ).toEqual(expectedState)
  })

  it('should handle HRM_UPDATE', () => {
    const currentState = {
      ...INITIAL_STATE,
      hrmData: [
        { clientId: '1', hr: 120, isConnected: true },
        { clientId: '2', hr: 130, isConnected: true },
      ],
    }
    const payload = [{ clientId: '1', hr: 125 }]
    const expectedState = {
      ...currentState,
      hrmData: [
        { clientId: '1', hr: 125, isConnected: true },
        { clientId: '2', hr: 130, isConnected: false },
      ],
    }
    expect(
      reducer(currentState, { type: 'HRM_UPDATE', payload } as any)
    ).toEqual(expectedState)
  })

  it('should handle TIMER_UPDATE', () => {
    const payload = { isRunning: true }
    const expectedState = {
      ...INITIAL_STATE,
      timerData: { ...INITIAL_STATE.timerData, ...payload },
    }
    expect(
      reducer(INITIAL_STATE, { type: 'TIMER_UPDATE', payload } as any)
    ).toEqual(expectedState)
  })

  it('should handle SPOTIFY_UPDATE', () => {
    const payload = { isPlaying: true }
    const expectedState = {
      ...INITIAL_STATE,
      spotifyData: { ...INITIAL_STATE.spotifyData, ...payload },
    }
    expect(
      reducer(INITIAL_STATE, { type: 'SPOTIFY_UPDATE', payload } as any)
    ).toEqual(expectedState)
  })
})
