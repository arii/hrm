'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function Main({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <ErrorProvider>
        <LoadingProvider>
          <Providers>
            <UserSettingsProvider>
              <TimerSoundProvider>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    variants={pageVariants}
                    initial="initial"
                    animate="in"
                    exit="out"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </TimerSoundProvider>
            </UserSettingsProvider>
          </Providers>
          <LoadingIndicator />
          <ErrorDisplay />
        </LoadingProvider>
      </ErrorProvider>
      <Footer />
      <BottomNavBar />
    </ErrorBoundary>
  )
}
