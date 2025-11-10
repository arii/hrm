# Spotify Playlist Selection Feature Plan

## Overview
Add playlist/song selection functionality to the HRM control panel, allowing users to choose workout music directly from the mobile interface.

## Phase 1: Preset Exercise Playlists

### 1.1 Backend API Extensions
- **New API Endpoint**: `/api/spotify/playlists`
  - GET: Return list of preset workout playlists
  - POST: Start playing selected playlist
- **Preset Playlist Configuration**:
  - Create `utils/spotifyPresets.ts` with curated workout playlist IDs
  - Include popular genres: HIIT, Cardio, Strength Training, Yoga, Running
  - Each preset includes: name, description, Spotify playlist ID, estimated BPM range

### 1.2 Server-Side Service Updates
- **Extend `services/spotifyPolling.ts`**:
  - Add `startPlaylist(playlistId: string, deviceId?: string)` function
  - Add `searchPlaylists(query: string)` for future expansion
- **WebSocket Message Types**:
  - Add `SPOTIFY_PLAYLIST_COMMAND` message type
  - Extend `SpotifyCommandMessage` interface to include playlist operations

### 1.3 Control Panel UI Components
- **New Component**: `components/PlaylistSelector.tsx`
  - Grid layout of preset playlist cards
  - Each card shows: playlist name, description, estimated duration
  - Visual indicators for BPM ranges (Low/Medium/High intensity)
- **Integration into Control Panel**:
  - Add playlist selector as collapsible section below Spotify controls
  - Show current playlist name when one is active
  - Quick access to "Workout Favorites" preset

### 1.4 Mobile UX Considerations
- **Responsive Design**: Cards stack vertically on mobile, 2-column on tablet
- **Quick Actions**: Swipe gestures for playlist navigation
- **Visual Feedback**: Loading states when switching playlists
- **Offline Handling**: Graceful fallback when playlists unavailable

## Phase 2: User's Personal Playlists

### 2.1 Spotify API Integration
- **Extend Authentication Scope**: Add `playlist-read-private` permission
- **New API Endpoints**:
  - `/api/spotify/user-playlists`: Fetch user's personal playlists
  - `/api/spotify/playlist-tracks`: Get tracks from specific playlist
- **Caching Strategy**: Store user playlists in memory with 30-minute TTL

### 2.2 Enhanced UI Components
- **Playlist Categories**:
  - "Workout Presets" (Phase 1 presets)
  - "My Playlists" (user's personal playlists)
  - "Recently Played" (last 5 workout playlists)
- **Search Functionality**: Filter playlists by name or description
- **Playlist Preview**: Show first few track names and total duration

### 2.3 Data Management
- **Local Storage**: Remember user's preferred workout playlists
- **Playlist Metadata**: Cache playlist info to reduce API calls
- **Smart Suggestions**: Recommend playlists based on timer mode (Tabata vs Stopwatch)

## Phase 3: Advanced Features

### 3.1 Workout-Specific Playlists
- **Timer Integration**: Auto-suggest playlists based on workout duration
- **BPM Matching**: Filter playlists by tempo matching workout intensity
- **Phase-Based Music**: Different tracks for work/rest phases in Tabata mode

### 3.2 Playlist Management
- **Create Workout Playlist**: Generate playlist from selected tracks
- **Playlist Editing**: Add/remove tracks from workout playlists
- **Collaborative Playlists**: Share workout playlists with other users

### 3.3 Smart Features
- **Auto-Play Logic**: Start playlist when timer begins
- **Volume Automation**: Adjust volume based on workout phase
- **Track Skipping**: Auto-skip tracks that don't match workout intensity

## Implementation Steps

### Step 1: Foundation (2-3 hours)
1. Create `utils/spotifyPresets.ts` with 5-10 curated workout playlists
2. Add playlist-related TypeScript interfaces to `types/websocket.ts`
3. Extend `SpotifyCommandMessage` to include playlist operations
4. Create basic `PlaylistSelector.tsx` component with preset list

### Step 2: Backend Integration (3-4 hours)
1. Add `/api/spotify/playlists` endpoint
2. Extend `spotifyPolling.ts` with playlist playback functions
3. Add WebSocket message handling for playlist commands
4. Test playlist switching with existing Spotify integration

### Step 3: Control Panel Integration (2-3 hours)
1. Add `PlaylistSelector` to control panel layout
2. Implement responsive design for mobile/tablet
3. Add loading states and error handling
4. Connect to WebSocket for real-time playlist updates

### Step 4: User Experience Polish (2-3 hours)
1. Add playlist preview functionality
2. Implement search/filter capabilities
3. Add visual indicators for playlist status
4. Test across different devices and screen sizes

### Step 5: Personal Playlists (4-5 hours)
1. Extend Spotify OAuth scope for playlist access
2. Add `/api/spotify/user-playlists` endpoint
3. Implement playlist caching and management
4. Add "My Playlists" section to UI

## Technical Considerations

### API Rate Limits
- Spotify API: 100 requests per minute per user
- Cache playlist data to minimize API calls
- Implement exponential backoff for rate limit handling

### Error Handling
- Network connectivity issues
- Spotify premium account requirements
- Playlist availability (private/deleted playlists)
- Device compatibility for playlist playback

### Performance
- Lazy load playlist artwork
- Paginate large playlist collections
- Optimize WebSocket message frequency
- Minimize re-renders during playlist switching

### Security
- Validate playlist IDs before API calls
- Sanitize user input for playlist search
- Respect Spotify's content policies
- Handle expired authentication tokens

## Future Enhancements

### Integration Opportunities
- **Heart Rate Sync**: Adjust music tempo based on current HR zone
- **Workout Analytics**: Track which playlists improve performance
- **Social Features**: Share workout playlists with friends
- **Voice Control**: "Play workout playlist" voice commands

### Platform Extensions
- **Apple Music Integration**: Support for non-Spotify users
- **Local Music**: Support for device-stored music files
- **Podcast Integration**: Workout podcasts and guided sessions
- **Custom Audio**: Upload custom workout audio cues

## Success Metrics
- **User Engagement**: Increased time spent in control panel
- **Workout Completion**: Higher timer completion rates with music
- **Feature Adoption**: Percentage of users using playlist selection
- **Performance**: Playlist switching time under 2 seconds
- **Reliability**: 99%+ success rate for playlist playback

## Dependencies
- Existing Spotify integration must be fully functional
- WebSocket connection stability for real-time updates
- Mobile-responsive design system already in place
- User authentication and session management working

## Risks and Mitigations
- **Spotify API Changes**: Monitor API deprecation notices, implement fallbacks
- **Premium Account Requirement**: Clear messaging about Spotify Premium needs
- **Device Compatibility**: Test across various Spotify Connect devices
- **Network Reliability**: Implement offline mode with cached playlists