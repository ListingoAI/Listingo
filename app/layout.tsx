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
  title:
    'Listingo — AI dla sprzedawców: opisy, social, zdjęcia i ceny | e-commerce',
  description:
    'Jeden panel zamiast kilku narzędzi: opisy pod SEO i marketplace, posty social, sugestie cen, studio zdjęć i ton marki. Allegro, Shopify, WooCommerce i więcej. Zacznij za darmo.',
  keywords:
    'opisy produktów AI, generator opisów, Allegro, e-commerce, SEO, social media sprzedaż, cennik AI, zdjęcia produktowe, Shopify, WooCommerce, brand voice',
  openGraph: {
    title: 'Listingo — Asystent AI pod całą sprzedaż online',
    description:
      'Opisy, social, ceny, zdjęcia i spójny głos marki — w jednym miejscu. Dla marketplace’ów i własnych sklepów.',
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Listingo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Listingo — Asystent AI pod całą sprzedaż online',
    description:
      'Opisy, social, ceny i zdjęcia produktów w jednym panelu. Dla Allegro, Shopify, WooCommerce i nie tylko.',
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
