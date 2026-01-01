# Known Issues

This file documents known issues and fragile implementations in the codebase that should be addressed in the future.

## `PlaylistSelector.tsx` - Reliance on Internal MUI Class Name

The `getItemSize` function in `PlaylistSelector.tsx` relies on the internal MUI class name `MuiAutocomplete-groupLabel` to differentiate between group headers and regular list items in the virtualized `Autocomplete` component. This is a common workaround for this specific use case, but it's a fragile implementation that could break if MUI changes its internal class structure in a future update.

**Location:** `components/Spotify/PlaylistSelector.tsx`

**Recommendation:**

Investigate a more robust way to get item size in `PlaylistSelector.tsx`. This might involve:

*   Passing a flag via `itemData` to identify group headers.
*   Using a custom rendering prop to apply a stable identifier to group headers.
*   Waiting for MUI to provide a more stable API for this use case.
