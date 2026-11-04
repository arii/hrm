import { useState } from 'react'
import logger from '@/utils/logger'

/**
 * Full device reset flow: forgets the BLE device, then resets local
 * state, tracking the in-flight flag throughout. Failures log and
 * clear the flag without resetting. Extracted verbatim from
 * ConnectView; covered here and by its component tests.
 */
export const useFullReset = (
  onForgetDevice: () => Promise<void>,
  onReset: () => void
) => {
  const [isResetting, setIsResetting] = useState(false)

  const handleFullReset = async () => {
    setIsResetting(true)
    try {
      await onForgetDevice()
      onReset()
    } catch (error) {
      logger.error('Reset failed:', error)
    } finally {
      setIsResetting(false)
    }
  }

  return { handleFullReset, isResetting }
}
