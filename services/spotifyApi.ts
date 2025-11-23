import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'

export class SpotifyApiService {
  private sdk: SpotifyApi | null = null

  constructor(clientId: string, accessToken: AccessToken) {
    this.sdk = SpotifyApi.withAccessToken(clientId, accessToken)
  }

  public updateToken(clientId: string, accessToken: AccessToken) {
    this.sdk = SpotifyApi.withAccessToken(clientId, accessToken)
  }

  public async getCurrentlyPlayingTrack() {
    if (!this.sdk) return null
    return this.sdk.player.getCurrentlyPlayingTrack()
  }

  public async getAvailableDevices() {
    if (!this.sdk) return []
    const response = await this.sdk.player.getAvailableDevices()
    return response.devices
  }

  public async startResumePlayback(deviceId: string, playlistUri?: string) {
    if (!this.sdk) return
    if (playlistUri) {
      await this.sdk.player.startResumePlayback(deviceId, playlistUri)
    } else {
      await this.sdk.player.startResumePlayback(deviceId)
    }
  }

  public async pausePlayback(deviceId: string) {
    if (!this.sdk) return
    await this.sdk.player.pausePlayback(deviceId)
  }

  public async skipToNext(deviceId: string) {
    if (!this.sdk) return
    await this.sdk.player.skipToNext(deviceId)
  }

  public async skipToPrevious(deviceId: string) {
    if (!this.sdk) return
    await this.sdk.player.skipToPrevious(deviceId)
  }

  public async transferPlayback(deviceIds: string[]) {
    if (!this.sdk) return
    await this.sdk.player.transferPlayback(deviceIds, true)
  }

  public async setPlaybackVolume(volume: number, deviceId?: string) {
    if (!this.sdk) return
    await this.sdk.player.setPlaybackVolume(volume, deviceId)
  }
}
