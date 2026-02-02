// utils/browserSupport.ts
export const checkOnboardingRequirements = () => {
  const isClient = typeof window !== 'undefined'
  return {
    bluetooth: isClient && !!navigator.bluetooth,
    webSockets: isClient && 'WebSocket' in window,
    isSecure: isClient && window.isSecureContext, // Required for Bluetooth
  }
}
