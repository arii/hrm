/**
 * Shared color constants for the HRM application.
 * These are defined as plain strings to ensure compatibility across
 * both client-side (MUI theme) and server-side (HR zone configurations) code.
 */

export const HR_COLORS = {
  ZONE_6_MAX: '#9C27B0',    // Purple
  ZONE_5_PEAK: '#F44336',   // Red (MUI Primary)
  ZONE_4_CARDIO: '#FBC02D', // Amber/Yellow (MUI Warning Dark)
  ZONE_3_FATBURN: '#4CAF50', // Green (MUI Success)
  ZONE_2_WARMUP: '#2196F3',  // Blue (MUI Secondary)
  ZONE_1_RECOVERY: '#00ffff', // Cyan
  ZONE_0_IDLE: '#cccccc',     // Grey

  TEXT_LIGHT: '#FFFFFF',
  TEXT_DARK: '#000000',
} as const
