
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyApiService } from '../../../services/spotifyApiService'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: jest.fn(),
}))

describe('SpotifyApiService', () => {
  let mockSdk: jest.Mocked<SpotifyApi>
  let service: SpotifyApiService

  beforeEach(() => {
    mockSdk = {
      player: {
        getCurrentlyPlayingTrack: jest.fn(),
        getAvailableDevices: jest.fn(),
        startResumePlayback: jest.fn(),
        pausePlayback: jest.fn(),
        skipToNext: jest.fn(),
        skipToPrevious: jest.fn(),
        transferPlayback: jest.fn(),
        setPlaybackVolume: jest.fn(),
      },
    } as any
    service = new SpotifyApiService(mockSdk)
  })

  it('should call getCurrentlyPlayingTrack', async () => {
    await service.getCurrentlyPlaying()
    expect(mockSdk.player.getCurrentlyPlayingTrack).toHaveBeenCalled()
  })

  it('should call getAvailableDevices', async () => {
    await service.getAvailableDevices()
    expect(mockSdk.player.getAvailableDevices).toHaveBeenCalled()
  })

  it('should call startResumePlayback', async () => {
    await service.startResumePlayback('device-id')
    expect(mockSdk.player.startResumePlayback).toHaveBeenCalledWith('device-id', undefined)
  })

  it('should call pausePlayback', async () => {
    await service.pausePlayback('device-id')
    expect(mockSdk.player.pausePlayback).toHaveBeenCalledWith('device-id')
  })

  it('should call skipToNext', async () => {
    await service.skipToNext('device-id')
    expect(mockSdk.player.skipToNext).toHaveBeenCalledWith('device-id')
  })

  it('should call skipToPrevious', async () => {
    await service.skipToPrevious('device-id')
    expect(mockSdk.player.skipToPrevious).toHaveBeenCalledWith('device-id')
  })

  it('should call transferPlayback', async () => {
    await service.transferPlayback('device-id')
    expect(mockSdk.player.transferPlayback).toHaveBeenCalledWith(['device-id'], true)
  })

  it('should call setPlaybackVolume', async () => {
    await service.setPlaybackVolume(50, 'device-id')
    expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(50, 'device-id')
  })

  it('should clamp volume to 100', async () => {
    await service.setPlaybackVolume(150, 'device-id')
    expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(100, 'device-id')
  })

  it('should clamp volume to 0', async () => {
    await service.setPlaybackVolume(-50, 'device-id')
    expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(0, 'device-id')
  })

  it('should round volume to the nearest integer', async () => {
    await service.setPlaybackVolume(50.6, 'device-id')
    expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(51, 'device-id')
  })
})
