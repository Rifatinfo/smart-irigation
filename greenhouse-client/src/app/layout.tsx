import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Greenhouse Controller',
    template: '%s · Greenhouse Controller',
  },
  description: 'Monitor your greenhouse, sensors and automated irrigation.',
}

// Same Google Fonts stylesheet the original design imported in index.css.
// Next.js drops remote @import url() from global CSS, so it is linked here instead.
const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  )
}
