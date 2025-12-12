# [Audit] Frontend Architecture & UX Review

## Summary
This audit of the frontend architecture reveals critical performance bottlenecks and violations of modern Next.js best practices. The primary issue is the over-reliance on client-side rendering and a monolithic WebSocket state structure, causing excessive re-renders across the entire application. While some optimizations like dynamic imports are present, the foundational architecture needs significant refactoring to improve performance, maintainability, and accessibility.

## Component Optimization Table

| Component Path        | Issue                                                                                                                    | Recommended Fix                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx`        | **Top-Level Client Component**: Declaring `'use client'` at the top level forces the entire page to be client-side rendered, forfeiting the performance benefits of Next.js Server Components for static UI elements. | Refactor `app/page.tsx` to be a Server Component. Move client-side logic and state (`useWebSocket`, `useState`) into smaller, specific Client Components (e.g., a new `DashboardClient.tsx`). |
| `app/page.tsx`        | **Monolithic State Consumption**: The page consumes the entire `useWebSocket` context, causing a re-render of the entire component tree on every single data tick from any source (Timer, HRM, etc.). | Decouple context consumers. Have child components like `HrmTiles` and `TimerDisplay` consume the `useWebSocket` context directly, so they only re-render when *their* specific data changes. |
| `app/page.tsx`        | **Prop Drilling**: `timerData` is destructured and its properties are passed down to `<TimerDisplay />`. This is an anti-pattern that makes components less reusable and harder to maintain. | Remove prop drilling. The `<TimerDisplay />` component should call `useWebSocket` itself to get the `timerData` it needs directly from the source. |
| `components/HrmTiles.tsx` | **Unnecessary Re-renders**: Despite using `useMemo`, this component re-renders whenever any WebSocket data changes (e.g., timer ticks), because the parent component (`app/page.tsx`) is forcing the update. | Make `HrmTiles` consume the context directly. This, combined with its internal `useMemo`, will ensure it *only* updates when `hrmData` or `activeAlerts` actually change. |

## UX/A11y Violations

1.  **Missing ARIA Labels for Interactive Elements**:
    *   **File**: `app/page.tsx`
    *   **Issue**: The main `Container` has an `onClick` handler (`handleInteraction`) to initialize audio context. This interaction is not conveyed to screen reader users. A user navigating by keyboard or assistive tech won't know this action is available or what it does.
    *   **Fix**: Add `role="button"` and an appropriate `aria-label` to the container, or move the interaction to a more explicit element like a "Click to Enable Audio" button that is only rendered before audio is initialized.
    *   **Code Snippet**:
        ```tsx
        // Problem
        <Container maxWidth="xl" onClick={handleInteraction}>
          ...
        </Container>

        // Solution (Example)
        <Container maxWidth="xl">
          {!audioInitialized && (
            <button aria-label="Enable audio for timer alerts" onClick={handleInteraction}>
              Enable Audio
            </button>
          )}
          ...
        </Container>
        ```

2.  **Ambiguous Loading State**:
    *   **File**: `components/HrmTiles.tsx`
    *   **Issue**: The component renders two hardcoded skeletons when loading or when no users are connected. This can be misleading. A user cannot distinguish between a loading state and an empty state.
    *   **Fix**: Differentiate the UI between the loading state and the empty state. Show skeletons while loading, but display a clear message like "No active participants" or "Waiting for heart rate data..." when the connection is live but no tiles are available.

## Code Snippets & Refactoring Example

### **Current Inefficient Structure (`app/page.tsx`)**
```tsx
'use client' // Renders the whole page on the client

import { useWebSocket } from '@/context/WebSocketContext'
import TimerDisplay from '../components/TimerDisplay'
// ... other imports

const Dashboard = () => {
  // Any change here re-renders the entire page and all children
  const { timerData, hrmData } = useWebSocket()

  return (
    <Container>
      {/* Prop drilling */}
      <TimerDisplay
        phase={timerData.currentPhase}
        timeRemaining={timerData.timeRemaining}
        // ... more props
      />
      <HrmTiles /> {/* This re-renders on timer ticks */}
    </Container>
  )
}
```

### **Proposed High-Performance Structure**

**`app/page.tsx` (Server Component)**
```tsx
// No 'use client' - this is a Server Component!
import DashboardClient from './DashboardClient'

// This component renders instantly from the server with no client-side JS.
export default function DashboardPage() {
  return (
    <DashboardClient />
  );
}
```

**`app/DashboardClient.tsx` (New Client Component)**
```tsx
'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import TimerDisplay from '../components/TimerDisplay'
import HrmTiles from '../components/HrmTiles'
// ... other imports

// This component contains all the client-side interactivity
export default function DashboardClient() {
  return (
    <Container>
      {/* Each component now fetches its own data from the context */}
      <TimerDisplay />
      <HrmTiles />
    </Container>
  )
}
```

**`components/TimerDisplay.tsx` (Refactored to be self-sufficient)**
```tsx
'use client'

import { useWebSocket } from '@/context/WebSocketContext'

// No more props needed!
export default function TimerDisplay() {
  const { timerData } = useWebSocket(); // Fetches its own data

  return (
    //... JSX using timerData
  )
}
```
