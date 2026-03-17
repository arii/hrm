import { useState, useCallback } from 'react'
import Cookies from 'js-cookie'

/** @public */
export const useBluetoothStorage = () => {
  const [savedDeviceId, setSavedDeviceId] = useState<string | null>(() => {
    if (typeof document !== 'undefined') {
      return Cookies.get('hrm_device_id') || null
    }
    return null
  })

  const saveDeviceId = useCallback((id: string) => {
    Cookies.set('hrm_device_id', id, {
      expires: 365,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    })
    setSavedDeviceId(id)
  }, [])

  const clearDeviceId = useCallback(() => {
    Cookies.remove('hrm_device_id')
    setSavedDeviceId(null)
  }, [])

  return { savedDeviceId, saveDeviceId, clearDeviceId }
}
