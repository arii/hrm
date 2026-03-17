import { useState, useCallback, useEffect } from 'react'
import Cookies from 'js-cookie'

export const useBluetoothStorage = () => {
  const [savedDeviceId, setSavedDeviceId] = useState<string | null>(null)

  useEffect(() => {
    // Read the cookie only on the client side
    const id = Cookies.get('hrm_device_id')
    setSavedDeviceId(id || null)
  }, [])

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

export default useBluetoothStorage
