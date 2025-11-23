// File: components/GoogleDocViewer.tsx (Google Doc Viewer Component)
/**
 * Google Doc Viewer Component: Embeds a Google Doc/Sheet/Presentation using an iframe.
 * Uses Material UI for responsive card structure.
 */
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Box, Card, CardContent, IconButton, Skeleton } from '@mui/material'
import { useEffect, useState } from 'react'
import { convertGoogleDocUrl } from '../utils/urls'

interface GoogleDocViewerProps {
  title: string
  // URL must be the 'embed' version of the Google Doc/Sheet/etc.
  embedUrl: string
  height?: number
  isShrunk?: boolean // New prop
  onToggleShrink?: () => void // New callback prop
}

const GoogleDocViewer = ({
  title,
  embedUrl,
  height = 700,
  isShrunk = false, // Default to not shrunk
  onToggleShrink,
}: GoogleDocViewerProps) => {
  const [iframeLoading, setIframeLoading] = useState(true)

  // Use the centralized utility to ensure the URL is correctly formatted for embedding
  const finalEmbedUrl = convertGoogleDocUrl(embedUrl)

  const dynamicHeight = isShrunk ? 200 : height // Use a smaller height when shrunk

  // Use useEffect to set a timeout fallback in case onLoad doesn't fire
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIframeLoading(false)
    }, 3000) // Show iframe after 3 seconds regardless
    return () => clearTimeout(timeout)
  }, [])

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
            component="iframe"
            src={finalEmbedUrl}
            title={title}
            width="100%"
            height="100%"
            loading="lazy" // Added lazy loading
            sx={{
              border: 'none',
              display: iframeLoading ? 'none' : 'block',
              position: 'absolute',
              top: 0,
              left: 0,
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

export default GoogleDocViewer
