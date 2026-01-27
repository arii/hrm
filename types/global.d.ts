declare global {
  interface Window {
    __TEST_READY__?: boolean
    __TEST_WEBSOCKET_READY__?: boolean
    TEST_CONTROLS?: {
      setHrmStatus?: (status: import('./bluetooth').BluetoothConnectionStatus) => void;
      setCustomHrmStatusMessage?: (message: string) => void;
    };
  }
}

export {}
