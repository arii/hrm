import useLocalStorage from './useLocalStorage'
import useCookie from './useCookie'

const usePersistentStorage = <T>(key: string, initialValue: T) => {
  const isLocalStorageAvailable = typeof window !== 'undefined' && window.localStorage
  return isLocalStorageAvailable ? useLocalStorage(key, initialValue) : useCookie(key, initialValue)
};

export default usePersistentStorage;
