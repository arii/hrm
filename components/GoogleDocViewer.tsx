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
  const [iframeUrl, setIframeUrl] = useState(
    embedUrl.includes('?embedded=true') ? embedUrl : `${embedUrl}?embedded=true`
  )

  const handleRefresh = () => {
    setIframeLoading(true)
    const newUrl = new URL(iframeUrl)
    newUrl.searchParams.set('timestamp', Date.now().toString())
    setIframeUrl(newUrl.toString())
  }

  // Effect to update URL if the embedUrl prop changes
  useEffect(() => {
    const finalEmbedUrl = embedUrl.includes('?embedded=true')
      ? embedUrl
      : `${embedUrl}?embedded=true`
    setIframeUrl(finalEmbedUrl)
  }, [embedUrl])

  const dynamicHeight = isShrunk ? 200 : height // Use a smaller height when shrunk

  // Use useEffect to set a timeout fallback in case onLoad doesn't fire
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIframeLoading(false)
    }, 3000) // Show iframe after 3 seconds regardless
    return () => clearTimeout(timeout)
  }, [iframeUrl]) // Rerun on URL change

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
            src={iframeUrl}
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
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {onToggleShrink && (
            <IconButton
              onClick={onToggleShrink}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,1)',
                },
              }}
              aria-label={isShrunk ? 'Expand document' : 'Collapse document'}
            >
              {isShrunk ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
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
        </Box>
      </CardContent>
    </Card>
  )
}

export default memo(GoogleDocViewer)
