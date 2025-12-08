// components/UserProfile.tsx
'use client'
import React, { useEffect, useReducer } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

interface State {
  loading: boolean
  data: { name?: string; email?: string } | null
  error: string | null
}

type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: { name?: string; email?: string } }
  | { type: 'FETCH_FAILURE'; payload: string }

const initialState: State = {
  loading: true,
  data: null,
  error: null,
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH_INIT':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload }
    case 'FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload }
    default:
      return state
  }
}

const UserProfile = () => {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const fetchUserProfile = async () => {
      dispatch({ type: 'FETCH_INIT' })
      try {
        const response = await fetch('/api/profile')
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }
        const data = await response.json()
        dispatch({ type: 'FETCH_SUCCESS', payload: data })
      } catch (error) {
        dispatch({
          type: 'FETCH_FAILURE',
          payload:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
        })
      }
    }

    fetchUserProfile()
  }, [])

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h5">
          User Profile
        </Typography>
        <Box sx={{ mt: 2 }}>
          {state.loading && <CircularProgress />}
          {state.error && <Alert severity="error">{state.error}</Alert>}
          {state.data && (
            <>
              <Typography>Name: {state.data.name}</Typography>
              <Typography>Email: {state.data.email}</Typography>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default UserProfile
