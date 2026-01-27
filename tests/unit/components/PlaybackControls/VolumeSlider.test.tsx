/**
 * @jest-environment jsdom
 */
// tests/unit/components/PlaybackControls/VolumeSlider.test.tsx
import { render, screen } from '@testing-library/react'
import VolumeSlider from '@/components/PlaybackControls/VolumeSlider'

describe('VolumeSlider', () => {
  it('should have the correct accessibility attributes when not muted', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    );

    const muteButton = screen.getByRole('button', { name: /mute/i });
    expect(muteButton).toHaveAttribute('aria-label', 'Mute');

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-labelledby', 'volume-slider');

    const sliderLabel = screen.getByText('Volume');
    expect(sliderLabel).toHaveAttribute('id', 'volume-slider');
  });

  it('should have the correct accessibility attributes when muted', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={true}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    );

    const unmuteButton = screen.getByRole('button', { name: /unmute/i });
    expect(unmuteButton).toHaveAttribute('aria-label', 'Unmute');
  });
});
