// File: components/GoogleDocViewer.tsx (Google Doc Viewer Component)
/**
 * Google Doc Viewer Component: Embeds a Google Doc/Sheet/Presentation using an iframe.
 * Uses Material UI for responsive card structure.
 */
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import { memo, useEffect, useState } from 'react'

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
  // Use a lazy initializer for the state to ensure the function is only called once
  const [refreshKey, setRefreshKey] = useState(() => Date.now())

  const handleRefresh = () => {
    setIframeLoading(true)
    setRefreshKey(Date.now()) // It's okay to use Date.now() in an event handler
  }

  // A more robust way to handle URL params
  const url = new URL(embedUrl)
  url.searchParams.set('embedded', 'true')
  // Using a named param like 'v' or 'cache_bust' is more descriptive
  url.searchParams.set('v', refreshKey.toString())
  const finalEmbedUrl = url.toString()

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
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            zIndex: 10,
          }}
        >
          <Tooltip title="Refresh document">
            <IconButton
              onClick={handleRefresh}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,1)',
                },
              }}
              aria-label="Refresh document"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {onToggleShrink && (
            <Tooltip title={isShrunk ? 'Expand document' : 'Collapse document'}>
              <IconButton
                onClick={onToggleShrink}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,1)',
                  },
                }}
                aria-label={
                  isShrunk ? 'Expand document' : 'Collapse document'
                }
              >
                {isShrunk ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default memo(GoogleDocViewer)
