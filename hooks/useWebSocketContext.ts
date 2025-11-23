// File: hooks/useWebSocketContext.ts
'use client'
import { useContext } from 'react'
import {
  HrmContext,
  SpotifyContext,
  TimerContext,
  WebSocketActionsContext,
} from '../contexts/WebSocketContext'

/**
 * Hook to access only the timer data from the WebSocket context.
 * Components using this hook will only re-render when timerData changes.
 */
export const useTimer = () => useContext(TimerContext)

/**
 * Hook to access only the heart rate monitor data from the WebSocket context.
 * Components using this hook will only re-render when hrmData changes.
 */
export const useHrm = () => useContext(HrmContext)

/**
 * Hook to access only the Spotify data from the WebSocket context.
 * Components using this hook will only re-render when spotifyData changes.
 */
export const useSpotify = () => useContext(SpotifyContext)

/**
 * Hook to access the WebSocket actions (sendData, connect, disconnect) and connection status.
 * Components using this hook will not re-render when the application state changes.
 */
export const useWebSocketActions = () => useContext(WebSocketActionsContext)
