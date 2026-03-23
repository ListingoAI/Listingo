import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ 
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Listingo — Opisy produktów w 30 sekund | AI dla e-commerce',
  description: 'Generuj profesjonalne opisy produktów pod Allegro, Shopify i WooCommerce za pomocą AI. Zoptymalizowane pod SEO. Po polsku. Oszczędź 90% czasu.',
  keywords: 'opisy produktów, AI, Allegro, e-commerce, SEO, generator opisów, sztuczna inteligencja, Shopify, WooCommerce',
  openGraph: {
    title: 'Listingo — Opisy produktów w 30 sekund',
    description: 'AI pisze opisy produktów. Ty sprzedajesz więcej. Zoptymalizowane pod Allegro, Shopify i WooCommerce.',
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Listingo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Listingo — AI opisy produktów',
    description: 'Generuj opisy produktów w 30 sekund',
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
        {children}
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
