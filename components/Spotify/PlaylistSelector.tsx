'use client'
import React from 'react'

interface PlaylistSelectorProps {
  onPlaylistSelected: (uri: string) => void
  onPlaylistPlay: (uri: string) => void
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  onPlaylistSelected,
  onPlaylistPlay,
}) => {
  return (
    <div>
      <h2>Playlist Selector</h2>
      <p>This component has been temporarily simplified to remove dead code.</p>
    </div>
  )
}

export default PlaylistSelector
