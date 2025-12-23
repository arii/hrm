'use client'
import React, { ReactNode } from 'react'
import { styled } from '@mui/material/styles'
import { grey } from '@mui/material/colors'
import Box from '@mui/material/Box'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'

const bottomSheetBleeding = 56

interface Props {
  open: boolean
  onClose: () => void
  onOpen: () => void
  children: ReactNode
  height?: string | number
}

const Root = styled('div')(({ theme }) => ({
  height: '100%',
  backgroundColor:
    theme.palette.mode === 'light'
      ? grey[100]
      : theme.palette.background.default,
}))

const Puller = styled(Box)(({ theme }) => ({
  width: 30,
  height: 6,
  backgroundColor: theme.palette.mode === 'light' ? grey[300] : grey[900],
  borderRadius: 3,
  position: 'absolute',
  top: 8,
  left: 'calc(50% - 15px)',
}))

export default function BottomSheet({
  open,
  onClose,
  onOpen,
  children,
  height = '50%',
}: Props) {
  return (
    <Root>
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={onOpen}
        swipeAreaWidth={bottomSheetBleeding}
        disableSwipeToOpen={false}
        ModalProps={{
          keepMounted: true,
          'aria-label': 'Secondary Controls',
        }}
        PaperProps={{
          sx: {
            height: `calc(${height} - ${bottomSheetBleeding}px)`,
            overflow: 'visible',
            top: -bottomSheetBleeding,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            visibility: 'visible',
            right: 0,
            left: 0,
            background: 'rgba(255, 255, 255, 0.1)', // Glassmorphism background
            backdropFilter: 'blur(10px)', // Blur effect
            boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.1)', // Subtle shadow
            border: '1px solid rgba(255, 255, 255, 0.3)', // Light border
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            pb: 2,
            height: '100%',
            overflow: 'auto',
          }}
        >
          <Puller />
          {children}
        </Box>
      </SwipeableDrawer>
    </Root>
  )
}
