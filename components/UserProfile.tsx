// components/UserProfile.tsx
'use client'
import React, { useEffect, useReducer } from 'react'

interface User {
  id: number
  name: string
  username: string
  email: string
}

interface State {
  loading: boolean
  user: User | null
  error: string | null
}

type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: User }
  | { type: 'FETCH_FAILURE'; payload: string }

const initialState: State = {
  loading: false,
  user: null,
  error: null,
}

const dataFetchReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        loading: true,
        error: null,
      }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload,
      }
    case 'FETCH_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    default:
      throw new Error()
  }
}

// Mock user data
const mockUser: User = {
  id: 1,
  name: 'Leanne Graham',
  username: 'Bret',
  email: 'Sincere@april.biz',
}

const UserProfile: React.FC = () => {
  const [state, dispatch] = useReducer(dataFetchReducer, initialState)

  useEffect(() => {
    const fetchUser = async () => {
      dispatch({ type: 'FETCH_INIT' })
      try {
        // Simulate a successful API call with mock data
        await new Promise((resolve) => setTimeout(resolve, 500))
        dispatch({ type: 'FETCH_SUCCESS', payload: mockUser })
      } catch (error) {
        if (error instanceof Error) {
          dispatch({ type: 'FETCH_FAILURE', payload: error.message })
        } else {
          dispatch({
            type: 'FETCH_FAILURE',
            payload: 'An unknown error occurred',
          })
        }
      }
    }

    fetchUser()
  }, [])

  const { loading, user, error } = state

  return (
    <div>
      <h1>User Profile</h1>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {user && (
        <div>
          <p>
            <strong>ID:</strong> {user.id}
          </p>
          <p>
            <strong>Name:</strong> {user.name}
          </p>
          <p>
            <strong>Username:</strong> {user.username}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
        </div>
      )}
    </div>
  )
}

export default UserProfile
