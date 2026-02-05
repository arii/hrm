# ADR: Separate Mute State for Spotify Playback

## Context
Spotify volume control requires distinction between "muted" and "volume=0".

## Decision
Maintain separate `isMuted` boolean alongside `volumePercent` in SpotifyPlaybackState.

## Rationale
- UX: Unmute restores previous volume, not just sets to arbitrary value.
- State sync: Server tracks mute intent separately from volume level.
- Multi-client: All clients see consistent mute state.

## Consequences
- Server must track both fields.
- WebSocket messages include both `volumePercent` and `isMuted`.
