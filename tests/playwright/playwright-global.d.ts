// tests/playwright/playwright-global.d.ts
declare global {
  interface Window {
    bluetoothTestHelpers?: {
      simulateHeartRate: (bpm: number) => void;
    };
    MockBluetoothDevice?: any; // Or define the full type if needed
  }
  interface Navigator {
    bluetooth: any; // Or a more specific type if desired
  }
}
export {};
