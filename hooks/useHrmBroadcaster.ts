import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { HrmData } from '@/types/hrm'

export const useHrmBroadcaster = (hrmData: HrmData) => {
  const { sendMessage } = useWebSocket()

  useEffect(() => {
    if (hrmData.heartRate !== null) {
      sendMessage({
        type: 'HRM_INPUT',
        payload: { value: hrmData.heartRate },
      })
    }
  }, [hrmData.heartRate, sendMessage])
}
