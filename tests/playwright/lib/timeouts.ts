/**
 * Centralized timeout constants for Visual Regression Tests (VRT)
 * Used to ensure fast failure detection and consistent wait times
 */
export const VRT_TIMEOUTS = {
  /** Page should load quickly in VRT environment */
  PAGE_READY: 5000,
  /** Elements should appear quickly in local/CI test environment */
  ELEMENT_VISIBLE: 5000,
  /** State changes (e.g., timer transitions) should be fast */
  STATE_TRANSITION: 5000,
  /** Components should render completely within this time */
  COMPONENT_RENDER: 6000,
  /** Multi-step operations or complex interactions may need more time */
  COMPLEX_INTERACTION: 8000,
} as const
