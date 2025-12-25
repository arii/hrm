
'use client'
import type { Metadata } from 'next'
import { Inter, Roboto_Mono } from 'next/font/google'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorDisplay from '@/components/ErrorDisplay'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import LoadingIndicator from '@/components/LoadingIndicator'
import Providers from '@/components/Providers'
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { pageVariants } from '@/components/animation/variants'
import { ErrorProvider } from '@/context/ErrorContext'
import { LoadingProvider } from '@/context/LoadingContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const roboto_mono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  return (
    <html lang="en">
      <head>
        {/* Preload the primary display font to prevent FOUT. */}
        <link
          rel="preload"
          href="/assets/digital-7-mono.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} ${roboto_mono.variable}`}>
        <ThemeRegistry options={{ key: 'mui' }}>
          <ErrorBoundary fallback={<ErrorFallback />}>
            <ErrorProvider>
              <LoadingProvider>
                <Providers>
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
                </Providers>
                <LoadingIndicator />
                <ErrorDisplay />
              </LoadingProvider>
            </ErrorProvider>
            <Footer />
            <BottomNavBar />
          </ErrorBoundary>
        </ThemeRegistry>
      </body>
    </html>
  )
}
