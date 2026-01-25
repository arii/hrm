// types/index.ts
export interface ApiSpotifyTokenPayload {
  provider: string
  sub: string
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  obtainedAt: number
}

export interface WorkoutColumnItem {
  title: string
  value: string | number
  color?: string
  details?: string
}

export interface WorkoutItem {
  duration: number
  hr: number
  category?: string
  exercises?: string[]
  details?: string
}

export interface WorkoutData {
  [key: string]: WorkoutItem[]
}

export interface DashboardSectionLoadingSkeletonProps {
  height?: string
  width?: string
}
