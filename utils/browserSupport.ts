// utils/browserSupport.ts
export const checkOnboardingRequirements = () => {
  const bluetooth = typeof navigator !== 'undefined' && !!navigator.bluetooth
  const webSockets = typeof window !== 'undefined' && 'WebSocket' in window
  const isSecure = typeof window !== 'undefined' && window.isSecureContext // Required for Bluetooth

  return {
    bluetooth,
    webSockets,
    isSecure,
    allSupported: bluetooth && webSockets && isSecure,
  }
}
