// File: hooks/useHrmDataHistory.ts
import { useEffect, useReducer, useRef, useState } from 'react'
import { HrmData } from '@/context/WebSocketContext'
import throttle from 'lodash.throttle'

const MAX_HISTORY_LENGTH = 100 // Keep the last 100 data points
const THROTTLE_INTERVAL = 1000 // Update the chart every 1 second

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

  const [throttledDispatch] = useState(() =>
    throttle((entries: HrmData[]) => {
      dispatch({ type: 'ADD_ENTRIES', payload: entries })
    }, THROTTLE_INTERVAL)
  )

  useEffect(() => {
    if (hrmData !== lastDataRef.current) {
      const newEntries = hrmData.filter((d) => d.value > 0)
      if (newEntries.length > 0) {
        throttledDispatch(newEntries)
      }
      lastDataRef.current = hrmData
    }
  }, [hrmData, throttledDispatch])

  return history
}
