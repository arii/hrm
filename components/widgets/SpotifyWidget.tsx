
import React from 'react';
import Widget from './Widget';
import TrackInfo from '../Spotify/TrackInfo';

const SpotifyWidget: React.FC = () => {
  return (
    <Widget title="Spotify">
      <TrackInfo />
    </Widget>
  );
};

export default SpotifyWidget;
