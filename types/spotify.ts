export interface SpotifyTokenDeliveryPayload {
  refresh_token: string
  access_token?: string
  expires_in?: number
  scope?: string
}
