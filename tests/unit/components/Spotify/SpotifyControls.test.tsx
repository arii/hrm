/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpotifyControls from '@/components/Spotify/SpotifyControls';
import { useWebSocket } from '@/context/WebSocketContext';
import useVolumePreference from '@/hooks/useVolumePreference';

jest.mock('@/context/WebSocketContext');
jest.mock('@/hooks/useVolumePreference');

const mockedUseWebSocket = useWebSocket as jest.Mock;
const mockedUseVolumePreference = useVolumePreference as jest.Mock;

describe('SpotifyControls', () => {
  const sendData = jest.fn();

  beforeEach(() => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        albumArtUrl: 'http://example.com/album.jpg',
        isPlaying: true,
        progressMs: 60000,
        durationMs: 180000,
        shuffleState: false,
        repeatState: 'off',
      },
      sendData,
    });
    mockedUseVolumePreference.mockReturnValue({
      volume: 50,
      setVolume: jest.fn(),
    });
  });

  it('renders the track information', () => {
    render(<SpotifyControls />);
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByAltText('Test Track')).toHaveAttribute('src', 'http://example.com/album.jpg');
  });

  it('sends a PAUSE command when the pause button is clicked', () => {
    render(<SpotifyControls />);
    fireEvent.click(screen.getByLabelText('pause'));
    expect(sendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'PAUSE',
    });
  });
});
