// File: components/GoogleDocViewer.tsx
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  Skeleton,
  Tooltip,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { ZoomIn, ZoomOut } from '@mui/icons-material'

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
    const timer = setTimeout(() => setIframeLoading(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={title}
        action={
          onToggleShrink && (
            <Tooltip title={isShrunk ? 'Expand' : 'Collapse'}>
              <IconButton onClick={onToggleShrink} aria-label="Toggle document size">
                {isShrunk ? <ZoomOut /> : <ZoomIn />}
              </IconButton>
            </Tooltip>
          )
        }
        sx={{
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      />
      <CardContent sx={{ p: 1, flexGrow: 1, position: 'relative' }}>
        {iframeLoading && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height={dynamicHeight}
          />
        )}
        <Box
          component="iframe"
          src={finalEmbedUrl}
          title={title}
          width="100%"
          height={dynamicHeight}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          sx={{
            border: 'none',
            display: iframeLoading ? 'none' : 'block',
            transition: 'height 0.3s ease-in-out',
          }}
          onLoad={() => setIframeLoading(false)}
        />
      </CardContent>
    </Card>
  )
}

export default GoogleDocViewer
