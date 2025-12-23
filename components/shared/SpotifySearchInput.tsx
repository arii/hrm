
import { useState, useEffect } from 'react'
import { Input, IconButton, CircularProgress, Typography } from '@mui/material'
import { Search, Clear } from '@mui/icons-material'
import { useDebounce } from '../../hooks'

interface Track {
  id: string
  name: string
  artists: { name: string }[]
}

const SpotifySearchInput = () => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<Track[]>([])
  const [error, setError] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 500)

  const handleClear = () => {
    setQuery('')
    setResults([])
    setError(null)
  }

  useEffect(() => {
    if (debouncedQuery) {
      const search = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await fetch(`/api/spotify/search?q=${debouncedQuery}`)
          if (!response.ok) {
            throw new Error('Failed to fetch results.')
          }
          const data = await response.json()
          setResults(data.tracks.items)
        } catch (err: any) {
          setError(err.message)
        } finally {
          setIsLoading(false)
        }
      }
      search()
    } else {
      setResults([])
      setError(null)
    }
  }, [debouncedQuery])

  return (
    <div>
      <Input
        startAdornment={<Search />}
        endAdornment={
          <>
            {query && (
              <IconButton onClick={handleClear} size="small" data-testid="clear-button">
                <Clear />
              </IconButton>
            )}
            {isLoading && <CircularProgress size={24} />}
          </>
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Spotify..."
      />
      {error && <Typography color="error">{error}</Typography>}
      {results.length === 0 && !isLoading && debouncedQuery && !error && <Typography>No results found.</Typography>}
      {results.length > 0 && (
        <ul>
          {results.map((result) => (
            <li key={result.id}>{result.name} by {result.artists.map((artist) => artist.name).join(', ')}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SpotifySearchInput
