// components/Toast/ToastContainer.tsx
'use client'

import React from 'react'
import Toast from './Toast'
import { Toast as ToastType } from '@/context/ToastContext'

interface ToastContainerProps {
  toasts: ToastType[]
  removeToast: (id: number) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1400,
      }}
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            marginBottom: '0.5rem',
            transform: `translateY(${index * 60}px)`,
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          <Toast
            open={true}
            message={toast.message}
            severity={toast.severity}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          />
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
