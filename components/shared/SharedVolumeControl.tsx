// components/shared/SharedVolumeControl.tsx
'use client'
import useVolumePreference from '@/hooks/useVolumePreference';
import VolumeSlider from '../PlaybackControls/VolumeSlider';

const SharedVolumeControl = () => {
  const { volume, setVolume, muted, toggleMute } = useVolumePreference();

  return (
    <VolumeSlider
      volume={volume}
      muted={muted}
      onVolumeChange={setVolume}
      onToggleMute={toggleMute}
    />
  );
};

export default SharedVolumeControl;
