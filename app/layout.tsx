import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';

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
  openGraph: {
    title: 'Napalm Sky - Speed Dating Reimagined',
    description: 'Speed Dating Reimagined — Live Matches, Zero Waiting.',
    url: 'https://napalmsky.com',
    siteName: 'Napalm Sky',
    images: [
      {
        url: '/public/image.jpg',
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
    images: ['/public/image.jpg'],
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
      <body className="font-inter">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}

