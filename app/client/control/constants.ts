/**
 * Delay before reverting disconnected UI state to idle.
 * Increased to 2000ms to provide better stability during Visual Regression Testing (VRT).
 */
export const DISCONNECTED_UI_REVERT_DELAY = 2000 // ms

/**
 * Timeout for optimistic actions before they are reverted.
 * Increased to 5000ms to accommodate slower test environments and ensure UI stability for VRT snapshots.
 */
export const OPTIMISTIC_ACTION_TIMEOUT = 5000 // ms for reverting optimistic UI
