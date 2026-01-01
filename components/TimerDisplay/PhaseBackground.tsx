// File: components/TimerDisplay/PhaseBackground.tsx
'use client'
import Box from '@mui/material/Box'
import { keyframes } from '@mui/system'
import { TimerPhase } from '@/types/core'
import { memo } from 'react'

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 0.6; }
`

interface PhaseBackgroundProps {
  phase: TimerPhase
}

const PhaseBackground: React.FC<PhaseBackgroundProps> = ({ phase }) => {
  const getPhaseStyle = () => {
    switch (phase) {
      case 'WORK':
        return {
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          animation: `${pulse} 4s infinite ease-in-out`,
        }
      case 'REST':
        return {
          background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
          animation: `${pulse} 8s infinite ease-in-out`,
        }
      case 'PREPARE':
        return {
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        }
      case 'RUNNING':
        return {
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        }
      default:
        return {
          background: 'linear-gradient(135deg, #4B5563 0%, #1F2937 100%)',
        }
    }
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        transition: 'background 0.5s ease-in-out',
        ...getPhaseStyle(),
      }}
    />
  )
}

export default memo(PhaseBackground)
