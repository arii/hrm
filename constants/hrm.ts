/**
 * The duration in milliseconds after which heart rate data is considered stale
 * and a warning is displayed to the user (e.g., "Checking signal...").
 * This typically indicates a temporary connection issue or sensor pause.
 */
export const HRM_STALE_WARNING_MS = 20000

/**
 * The duration in milliseconds after which a stale heart rate tile is removed
 * from the dashboard entirely. This assumes the device has disconnected or
 * the user has left.
 */
export const STALE_TILE_REMOVAL_THRESHOLD_MS = 35000
