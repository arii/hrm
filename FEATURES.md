# Features

This document outlines the plans for new features and improvements to the HRM application.

## Spotify Playlist Selection

This feature will add the ability for users to select Spotify playlists from the control panel.

### Phase 1: Preset Exercise Playlists

- **Backend**: Add a new API endpoint to return a list of preset workout playlists.
- **Frontend**: Create a new component to display the preset playlists and allow users to select them.

### Phase 2: User's Personal Playlists

- **Backend**: Extend the Spotify API integration to fetch the user's personal playlists.
- **Frontend**: Add a new section to the UI to display the user's personal playlists.

## Spotify Token Refresh Hardening

This plan outlines the steps required to ensure that Spotify access tokens are refreshed automatically when they expire.

- **Baseline Assessment**: Document the current token lifecycle and reproduce the token expiration issue.
- **Diagnostics & Instrumentation**: Add logging to identify the root cause of the refresh failure.
- **Implementation Strategy**: Centralize the refresh logic in `SpotifyTokenManager` and add an API for on-demand token refreshing.
