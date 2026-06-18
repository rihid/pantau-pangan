import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ErrorBoundary } from '@/components/providers/error-boundary'
import { QueryProvider } from '@/components/providers/query-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pantaupangan.id'

export const metadata: Metadata = {
  title: 'Pantau Pangan',
  description: 'Visualisasi harga pangan strategis nasional berbasis bubble chart interaktif.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Pantau Pangan',
    description: 'Visualisasi harga pangan strategis nasional berbasis bubble chart interaktif.',
    url: siteUrl,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pantau Pangan',
    description: 'Visualisasi harga pangan strategis nasional berbasis bubble chart interaktif.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground">
        <ErrorBoundary>
          <QueryProvider>{children}</QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
