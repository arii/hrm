import { useEffect, useRef } from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import { calculateMaxHr } from '@/utils/hrCalculations'
import type {
  ClientCommandMessage,
  HrmMetadataUpdateData,
  HrmMetadataUpdateMessage,
} from '@/types/websocket'

/**
 * Syncs user details to the server as HRM_METADATA_UPDATE messages (#9596).
 * Extracted from useBluetoothHRM: fires when identity props or connection
 * status change, and suppresses redundant sends via last-sent comparison.
 * The connection lifecycle and signal/watchdog protocol stay in
 * useBluetoothHRM — their correctness lives in shared-ref interplay that a
 * hook boundary would only obscure.
 */

interface UseHrmMetadataSyncParams {
  userName?: string | null
  userAge?: number | null
  status: BluetoothConnectionStatus
  getDeviceName: () => string
  sendData: (data: ClientCommandMessage) => void
}

export const useHrmMetadataSync = ({
  userName,
  userAge,
  status,
  getDeviceName,
  sendData,
}: UseHrmMetadataSyncParams) => {
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)

  useEffect(() => {
    userDetailsRef.current = {
      name: userName || '',
      age: userAge || 0,
    }

    if (status === BluetoothConnectionStatus.CONNECTED) {
      const { name, age } = userDetailsRef.current
      const calculatedMaxHr = calculateMaxHr(age)
      const deviceName = getDeviceName()

      const metadataData: HrmMetadataUpdateData = {
        maxHr: calculatedMaxHr,
        name: name || `Bluetooth HRM (${deviceName})`,
      }
      if (typeof age === 'number') {
        metadataData.age = age
      }

      // Prevent sending redundant metadata updates
      if (
        JSON.stringify(lastSentMetadataRef.current) !==
        JSON.stringify(metadataData)
      ) {
        const metadata: HrmMetadataUpdateMessage = {
          type: 'HRM_METADATA_UPDATE',
          data: metadataData,
        }
        sendData(metadata)
        lastSentMetadataRef.current = metadataData
      }
    }
  }, [userName, userAge, status, sendData, getDeviceName])

  return { userDetailsRef }
}
