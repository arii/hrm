import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import DeviceRecommendation from './DeviceRecommendation'

interface StatusColumnProps {
  displayTrackName: string
  displayArtist: string
  showConnectingBadge: boolean
  showActiveBadge: boolean
  showAutoPending: boolean
  showConnectButton: boolean
}

/** Left column: now-playing text plus the single status affordance. */
export const StatusColumn = ({
  displayTrackName,
  displayArtist,
  showConnectingBadge,
  showActiveBadge,
  showAutoPending,
  showConnectButton,
}: StatusColumnProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifySelf: 'start',
      gap: 2,
      minHeight: '2rem',
      minWidth: 0,
    }}
  >
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      data-testid="spotify-now-playing"
    >
      {displayTrackName} {displayArtist}
    </Typography>
    {showConnectingBadge && (
      <Typography
        variant="caption"
        sx={{
          backgroundColor: 'info.main',
          color: 'common.black',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        🔄 Connecting Player...
      </Typography>
    )}
    {showActiveBadge && (
      // A status, not an action: muted outline so it never reads as a button.
      <Typography
        variant="caption"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          color: 'grey.400',
          border: 1,
          borderColor: 'grey.700',
          px: 1,
          py: 0.25,
          borderRadius: 4,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'success.main',
          }}
        />
        Browser Player Active
      </Typography>
    )}
    {showAutoPending && (
      <Typography
        variant="caption"
        sx={{
          backgroundColor: 'info.main',
          color: 'common.black',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Connecting…
      </Typography>
    )}
    {showConnectButton && <DeviceRecommendation />}
  </Box>
)
