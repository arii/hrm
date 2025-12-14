**Context:** Spotify Integration PR

**Focus Areas:**
- ✅ **API Rate Limiting:** Ensure that all calls to the Spotify API are handled gracefully, with proper error handling for rate-limiting (429) responses.
- ✅ **State Consistency:** Verify that the local application state remains consistent with the Spotify player state. Check for edge cases like the token expiring, the user changing devices, or playback being controlled from another app.
- ✅ **Token Management:** Ensure that OAuth tokens are refreshed correctly and that there are no token leaks.
- ✅ **Error Handling:** Check for robust handling of API errors (e.g., 401 Unauthorized, 403 Forbidden, 404 Not Found) for scenarios like invalid device IDs or private sessions.

**Scope Enforcement:**
- ❌ **No UI/Styling Suggestions:** Unless it directly relates to displaying Spotify data, do not suggest UI changes.
- ❌ **No Timer Logic Changes:** Do not suggest modifications to the Tabata timer or other non-Spotify features.
