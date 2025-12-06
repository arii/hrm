'use client'
// components/UserProfile.tsx
import React, { useReducer, useEffect } from 'react'

// Define state and action types
interface State {
  loading: boolean
  data: any | null
  error: string | null
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: any }
  | { type: 'FETCH_ERROR'; payload: string }

// Reducer function
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload }
    default:
      return state
  }
}

const UserProfile: React.FC = () => {
  const initialState: State = {
    loading: false,
    data: null,
    error: null,
  }

  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({ type: 'FETCH_START' })
    // Mock API call
    setTimeout(() => {
      try {
        // Mock success
        const mockData = { name: 'Jules', email: 'jules@example.com' }
        dispatch({ type: 'FETCH_SUCCESS', payload: mockData })
      } catch (error) {
        // Mock error
        dispatch({ type: 'FETCH_ERROR', payload: 'Failed to fetch user data' })
      }
    }, 1000)
  }, [])

  return (
    <div>
      {state.loading && <p>Loading...</p>}
      {state.error && <p>Error: {state.error}</p>}
      {state.data && (
        <div>
          <h2>User Profile</h2>
          <p>Name: {state.data.name}</p>
          <p>Email: {state.data.email}</p>
        </div>
      )}
    </div>
  )
}

export default UserProfile
