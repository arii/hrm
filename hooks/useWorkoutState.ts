import { useReducer, useCallback } from 'react'

// --- State, Actions, and Reducer for managing session state ---

export type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
}

type SessionAction =
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'RESET' }
  | { type: 'START_WORKOUT' }
  | { type: 'PAUSE_WORKOUT' }
  | { type: 'END_WORKOUT' }

const initialState: SessionState = {
  status: 'idle',
}

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'CONNECT':
    case 'START_WORKOUT':
      if (state.status === 'paused' || state.status === 'idle') {
        return { ...state, status: 'running' }
      }
      return state
    case 'PAUSE_WORKOUT':
    case 'DISCONNECT':
      if (state.status === 'running') {
        return { ...state, status: 'paused' }
      }
      return state
    case 'END_WORKOUT':
      return { ...state, status: 'idle' }
    case 'RESET':
      return initialState
    default:
      // This is a runtime safeguard against unhandled actions.
      throw new Error(`Unhandled action in sessionReducer`)
  }
}

// --- The Hook Implementation ---

/**
 * Manages the core lifecycle status of a workout session (idle, running, paused).
 */
export const useWorkoutState = () => {
  const [state, dispatch] = useReducer(sessionReducer, initialState)

  const startWorkout = useCallback(() => {
    dispatch({ type: 'START_WORKOUT' })
  }, [])

  const pauseWorkout = useCallback(() => {
    dispatch({ type: 'PAUSE_WORKOUT' })
  }, [])

  const endWorkout = useCallback(() => {
    dispatch({ type: 'END_WORKOUT' })
  }, [])

  const resetWorkout = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const connect = useCallback(() => {
    dispatch({ type: 'CONNECT' })
  }, [])

  const disconnect = useCallback(() => {
    dispatch({ type: 'DISCONNECT' })
  }, [])

  return {
    workoutStatus: state.status,
    startWorkout,
    pauseWorkout,
    endWorkout,
    resetWorkout,
    connect,
    disconnect,
  }
}
