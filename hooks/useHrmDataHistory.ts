// File: hooks/useHrmDataHistory.ts
import { useEffect, useReducer, useRef } from 'react'
import { HrmData } from '@/context/WebSocketContext'

const MAX_HISTORY_LENGTH = 100 // Keep the last 100 data points

type HistoryState = {
  [clientId: string]: { value: number; timestamp: number }[]
}

type HistoryAction = {
  type: 'ADD_ENTRIES'
  payload: HrmData[]
}

const historyReducer = (
  state: HistoryState,
  action: HistoryAction
): HistoryState => {
  switch (action.type) {
    case 'ADD_ENTRIES': {
      const now = Date.now()
      const updatedHistory = { ...state }
      action.payload.forEach((entry) => {
        if (!updatedHistory[entry.clientId]) {
          updatedHistory[entry.clientId] = []
        }
        const clientHistory = updatedHistory[entry.clientId]
        if (clientHistory) {
          clientHistory.push({
            value: entry.value,
            timestamp: now,
          })
          if (clientHistory.length > MAX_HISTORY_LENGTH) {
            clientHistory.shift()
          }
        }
      })
      return updatedHistory
    }
    default:
      return state
  }
}

export const useHrmDataHistory = (hrmData: HrmData[]) => {
  const [history, dispatch] = useReducer(historyReducer, {})
  const lastDataRef = useRef<HrmData[]>(hrmData)

  useEffect(() => {
    if (hrmData !== lastDataRef.current) {
      const newEntries = hrmData.filter((d) => d.value > 0)
      if (newEntries.length > 0) {
        dispatch({ type: 'ADD_ENTRIES', payload: newEntries })
      }
      lastDataRef.current = hrmData
    }
  }, [hrmData])

  return history
}
