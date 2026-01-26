// File: components/GoogleDocViewer.tsx (Google Doc Viewer Component)
/**
 * Google Doc Viewer Component: Embeds a Google Doc/Sheet/Presentation using an iframe.
 * Uses Material UI for responsive card structure.
 */
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import { memo, useEffect, useState } from 'react'

interface GoogleDocViewerProps {
  title: string
  // URL must be the 'embed' version of the Google Doc/Sheet/etc.
  embedUrl: string
  height?: number
  isShrunk?: boolean // New prop
  onToggleShrink?: () => void // New callback prop
  refreshKey?: number
}

const GoogleDocViewer = ({
  title,
  embedUrl,
  height = 700,
  isShrunk = false, // Default to not shrunk
  onToggleShrink,
  refreshKey,
}: GoogleDocViewerProps) => {
  const [iframeLoading, setIframeLoading] = useState(true)

  // Ensure embedUrl always includes ?embedded=true
  const url = new URL(embedUrl)
  url.searchParams.set('embedded', 'true')
  const finalEmbedUrl = url.toString()

  const dynamicHeight = isShrunk ? 200 : height // Use a smaller height when shrunk

  // Use useEffect to set a timeout fallback in case onLoad doesn't fire
  useEffect(() => {
    // The loading skeleton must be shown on each refresh, so we reset the
    // loading state here. This is a deliberate and safe use case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIframeLoading(true) // Reset loading state on refresh
    const timeout = setTimeout(() => {
      setIframeLoading(false)
    }, 3000) // Show iframe after 3 seconds regardless
    return () => clearTimeout(timeout)
  }, [refreshKey]) // Rerun on refresh

  return (
    <Card elevation={6} sx={{ position: 'relative' }}>
      <CardContent sx={{ p: 1 }}>
        <Box
          sx={{
            width: '100%',
            height: `${dynamicHeight}px`,
            overflow: 'hidden',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300',
            position: 'relative',
          }}
        >
          {iframeLoading && (
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              sx={{ position: 'absolute', top: 0, left: 0 }}
            />
          )}
          <Box
            key={refreshKey}
            component="iframe"
            src={finalEmbedUrl}
            title={title}
            width="100%"
            height="100%"
            loading="lazy"
            sx={{
              border: 'none',
              display: iframeLoading ? 'none' : 'block',
              position: 'absolute',
              top: 0,
              left: 0,
              transition: 'height 0.3s ease-in-out',
            }}
            onLoad={() => setIframeLoading(false)}
          />
        </Box>
        {onToggleShrink && (
          <IconButton
            onClick={onToggleShrink}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              backgroundColor: 'rgba(255,255,255,0.9)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,1)',
              },
              zIndex: 10,
            }}
            aria-label={isShrunk ? 'Expand document' : 'Collapse document'}
          >
            {isShrunk ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(GoogleDocViewer)
