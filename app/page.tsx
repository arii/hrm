// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
import DashboardClient from './DashboardClient'

// This component renders instantly from the server with no client-side JS.
export default function DashboardPage() {
  return <DashboardClient />
}
