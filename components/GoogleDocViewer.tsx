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
import { useTheme } from '@mui/material/styles'
import { memo, useEffect, useMemo, useState } from 'react'

interface GoogleDocViewerProps {
  title: string
  // URL must be the 'embed' version of the Google Doc/Sheet/etc.
  embedUrl: string
  isShrunk?: boolean // New prop
  onToggleShrink?: () => void // New callback prop
}

const GoogleDocViewer = ({
  title,
  embedUrl,
  isShrunk = false, // Default to not shrunk
  onToggleShrink,
}: GoogleDocViewerProps) => {
  const theme = useTheme()
  const [iframeLoading, setIframeLoading] = useState(true)

  const finalEmbedUrl = useMemo(() => {
    try {
      // In a client component, we can safely assume URL is available.
      const url = new URL(embedUrl)
      url.searchParams.set('embedded', 'true')
      return url.toString()
    } catch (e) {
      console.error('Invalid embedUrl provided to GoogleDocViewer:', embedUrl, e)
      // Return a safe, non-functional URL or the original if it's better than nothing
      return embedUrl
    }
  }, [embedUrl])

  // Use useEffect to set a timeout fallback in case onLoad doesn't fire
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIframeLoading(false)
    }, 3000) // Show iframe after 3 seconds regardless
    return () => clearTimeout(timeout)
  }, [])

  return (
    <Card
      elevation={6}
      sx={{
        position: 'relative',
        height: isShrunk ? theme.spacing(25) : '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.3s ease-in-out',
      }}
    >
      <CardContent sx={{ p: 1, flexGrow: 1, position: 'relative' }}>
        <Box
          sx={{
            width: '100%',
            // Take up all available space in the card
            height: '100%',
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
