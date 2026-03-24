import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AppChrome } from '@/components/shared/AppChrome'

const inter = Inter({ 
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://listingo.pl'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Listingo — Opisy produktów w 30 sekund | AI dla e-commerce',
  description:
    'Jeden asystent AI pod opisy, social media, ceny i zdjęcia — Allegro, Shopify, WooCommerce. SEO i quality score. Po polsku. Zacznij za darmo.',
  keywords: 'opisy produktów, AI, Allegro, e-commerce, SEO, generator opisów, sztuczna inteligencja, Shopify, WooCommerce',
  openGraph: {
    title: 'Listingo — Opisy produktów w 30 sekund',
    description:
      'Jeden asystent AI zamiast skakania między narzędziami. Opisy, social, ceny — Allegro, Shopify, WooCommerce.',
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Listingo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Listingo — AI opisy produktów',
    description:
      'AI pod całą sprzedaż online: opisy, social, ceny. Allegro, Shopify, WooCommerce.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" className="dark">
      <body className={`${inter.className} antialiased`}>
        <AppChrome>{children}</AppChrome>
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            duration: 3000,
            style: {
              background: 'hsl(222.2 47% 11%)',
              color: 'hsl(210 40% 98%)',
              border: '1px solid hsl(217.2 32.6% 17.5%)',
            },
            success: {
              iconTheme: {
                primary: 'hsl(160 84% 39%)',
                secondary: 'white',
              },
            },
          }} 
        />
      </body>
    </html>
  )
}
