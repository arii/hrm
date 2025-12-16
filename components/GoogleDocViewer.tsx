// File: components/GoogleDocViewer.tsx
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Box, Card, CardContent, IconButton, Skeleton, Fade } from '@mui/material'
import { useEffect, useState } from 'react'

interface GoogleDocViewerProps {
  title: string
  embedUrl: string
  height?: number
  isShrunk?: boolean
  onToggleShrink?: () => void
}

const GoogleDocViewer = ({
  title,
  embedUrl,
  height = 700,
  isShrunk = false,
  onToggleShrink,
}: GoogleDocViewerProps) => {
  const [iframeLoading, setIframeLoading] = useState(true)

  const finalEmbedUrl = embedUrl.includes('?embedded=true')
    ? embedUrl
    : `${embedUrl}?embedded=true`

  const dynamicHeight = isShrunk ? 200 : height

  useEffect(() => {
    const timeout = setTimeout(() => setIframeLoading(false), 3000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <Card elevation={6} sx={{ position: 'relative', overflow: 'hidden' }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box
          sx={{
            width: '100%',
            height: `${dynamicHeight}px`,
            transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth resize
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            position: 'relative',
            backgroundColor: 'background.paper',
          }}
        >
          {iframeLoading && (
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              animation="wave"
              sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            />
          )}

          <Fade in={!iframeLoading} timeout={500}>
            <Box
              component="iframe"
              src={finalEmbedUrl}
              title={title}
              width="100%"
              height="100%"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={() => setIframeLoading(false)}
              sx={{ border: 'none' }}
            />
          </Fade>
        </Box>

        {onToggleShrink && (
          <IconButton
            onClick={onToggleShrink}
            // Accessibility: Clear label
            aria-label={isShrunk ? `Expand ${title}` : `Collapse ${title}`}
            sx={{
              position: 'absolute',
              bottom: 24, // Increased padding from edge
              right: 24,
              backgroundColor: 'background.paper',
              boxShadow: 3,
              width: 48, // Minimum touch target 48px
              height: 48,
              '&:hover': {
                backgroundColor: 'grey.100',
              },
              zIndex: 10,
            }}
          >
            {isShrunk ? <ExpandMoreIcon fontSize="medium" /> : <ExpandLessIcon fontSize="medium" />}
          </IconButton>
        )}
      </CardContent>
    </Card>
  )
}

export default GoogleDocViewer