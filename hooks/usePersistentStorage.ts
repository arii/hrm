// hooks/usePersistentStorage.ts
import useLocalStorage from '@/hooks/useLocalStorage'
import useCookie from '@/hooks/useCookie'

const checkLocalStorage = () => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    const testKey = 'hrm-local-storage-test'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

const usePersistentStorage = checkLocalStorage() ? useLocalStorage : useCookie

export default usePersistentStorage
