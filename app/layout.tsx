import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import { LegalFooter } from '@/components/LegalFooter';
import { CookieConsent } from '@/components/CookieConsent';

const playfair = Playfair_Display({
  weight: '700',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const inter = Inter({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 
    process.env.NEXT_PUBLIC_API_BASE || 
    'http://localhost:3000'
  ),
  title: 'Napalm Sky - Speed Dating Reimagined',
  description: 'Speed Dating Reimagined — Live Matches, Zero Waiting.',
  keywords: ['speed dating', 'video chat', 'matchmaking', 'dating app', 'live dating'],
  authors: [{ name: 'Napalm Sky' }],
  icons: {
    icon: '/Minimalist Sunset Icon Design.png',
    apple: '/Minimalist Sunset Icon Design.png',
    shortcut: '/Minimalist Sunset Icon Design.png',
  },
  openGraph: {
    title: 'Napalm Sky - Speed Dating Reimagined',
    description: 'Speed Dating Reimagined — Live Matches, Zero Waiting.',
    url: 'https://napalmsky.com',
    siteName: 'Napalm Sky',
    images: [
      {
        url: '/Minimalist Sunset Icon Design.png',
        width: 1200,
        height: 630,
        alt: 'Napalm Sky',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Napalm Sky - Speed Dating Reimagined',
    description: 'Speed Dating Reimagined — Live Matches, Zero Waiting.',
    images: ['/Minimalist Sunset Icon Design.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/Minimalist Sunset Icon Design.png" type="image/png" />
        <link rel="apple-touch-icon" href="/Minimalist Sunset Icon Design.png" />
      </head>
      <body className="font-inter">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <AuthGuard>
          {children}
        </AuthGuard>
        <LegalFooter />
        <CookieConsent />
      </body>
    </html>
  );
}

