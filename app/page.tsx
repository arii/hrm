import DashboardClient from '@/components/DashboardClient'

<<<<<<< HEAD
interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
=======
// Dynamically import SpotifyDisplay with SSR disabled.
// This prevents the heavy Spotify SDK logic from blocking the initial server HTML or hydration.
const SpotifyDisplay = dynamic(() => import('@/components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height="80px" />, // Optional: Render nothing while loading to avoid layout shift
})

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const WorkoutTableHeader = dynamic(
  () => import('@/components/WorkoutTableHeader'),
  {
    ssr: false,
    loading: () => <DashboardSectionLoadingSkeleton height="500px" />,
  }
)

const GoogleDocViewer = dynamic(() => import('@/components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height="500px" />,
})

const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

const mainGridStyles: SxProps = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    lg: '1fr 1fr',
  },
  gap: 2,
>>>>>>> origin/leader
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const params = await searchParams
  const nativeParam = params.native
  const nativeValue = Array.isArray(nativeParam) ? nativeParam[0] : nativeParam

  const useNativeTable =
    nativeValue === 'true' ||
    (process.env.NEXT_PUBLIC_USE_NATIVE_TABLE === 'true' &&
      nativeValue !== 'false')

  // Check for test-error
  const testErrorParam = params['test-error']
  const testErrorValue = Array.isArray(testErrorParam)
    ? testErrorParam[0]
    : testErrorParam

  if (testErrorValue === 'true') {
    throw new Error('VRT Test Error')
  }

<<<<<<< HEAD
  return <DashboardClient useNativeTable={useNativeTable} />
=======
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { initializeAudio } = useAudio()

  const handleRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1)
  }

  const handleInteraction = () => {
    if (!audioInitialized) {
      initializeAudio()
      setAudioInitialized(true)
    }
  }

  return (
    <Container
      data-testid="dashboard"
      maxWidth="xl"
      onClick={handleInteraction}
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Box sx={mainGridStyles}>
        {/*
         * The extra Box with height: '100%' is necessary to ensure the TimerDisplay
         * component stretches to fill the full height of the grid cell. The grid
         * itself defines the cell's height, but the child needs to explicitly
         * be told to occupy that full height.
         */}
        <Box sx={{ height: '100%' }}>
          <TimerDisplay />
        </Box>
        {/*
         * HrmConnectionPanel does not need a height wrapper because
         * it's internally structured to fill the height of its container.
         */}
        <HrmConnectionPanel />
      </Box>
      <Box sx={{ width: '100%', mt: 2 }}>
        {process.env.NEXT_PUBLIC_USE_NATIVE_TABLE === 'true' ? (
          <WorkoutTableHeader
            docId={DOC_ID}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        ) : (
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={500}
            isShrunk={docIsManuallyShrunk}
            onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        )}
      </Box>

      <SpotifyDisplay />
    </Container>
  )
>>>>>>> origin/leader
}
