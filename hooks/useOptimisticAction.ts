// File: hooks/useOptimisticAction.ts
import { useState, useEffect, useCallback } from 'react'

const OPTIMISTIC_ACTION_TIMEOUT = 3000 // ms for reverting optimistic UI

type Action = 'START' | 'STOP'

/**
 * Custom hook to manage optimistic UI updates.
 *
 * @param serverIsRunning - The state of the action from the server.
 * @returns An object containing the derived running state and a function to set an optimistic action.
 */
export const useOptimisticAction = (serverIsRunning: boolean) => {
  const [optimisticAction, setOptimisticAction] = useState<Action | null>(null)

  // When the server's running state changes and confirms our optimistic
  // action, we can clear the optimistic state.
  useEffect(() => {
    if (optimisticAction === null) return

    const actionConfirmed =
      (optimisticAction === 'START' && serverIsRunning) ||
      (optimisticAction === 'STOP' && !serverIsRunning)

    if (actionConfirmed) {
      setOptimisticAction(null)
    }
  }, [serverIsRunning, optimisticAction])

  // Safety timeout to clear the optimistic action if the server doesn't
  // confirm it within a reasonable time.
  useEffect(() => {
    if (optimisticAction) {
      const timer = setTimeout(() => {
        console.warn(
          `[useOptimisticAction] Optimistic action "${optimisticAction}" timed out. Reverting UI.`
        )
        setOptimisticAction(null)
      }, OPTIMISTIC_ACTION_TIMEOUT)
      return () => clearTimeout(timer)
    }
    return () => {}
  }, [optimisticAction])

  const setAction = useCallback((action: Action | null) => {
    setOptimisticAction(action)
  }, [])

  // Derive the running state from the server state and any optimistic action.
  const isRunning =
    optimisticAction === 'START'
      ? true
      : optimisticAction === 'STOP'
      ? false
      : serverIsRunning

  return { isRunning, setOptimisticAction: setAction }
}
