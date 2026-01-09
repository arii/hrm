'use client'
import { useState, useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'

export function useHrmBroadcaster() {
  const { sendMessage } = useWebSocket()
  const { hrData, device } = useBluetoothHRM()
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  useEffect(() => {
    if (hrData.heartRate && device) {
      const message = {
        type: 'HRM_INPUT',
        payload: {
          deviceId: device.id,
          value: hrData.heartRate,
        },
      }
      sendMessage(message)
      setIsBroadcasting(true)
    } else {
      setIsBroadcasting(false)
    }
  }, [hrData, device, sendMessage])

  return { isBroadcasting }
}
