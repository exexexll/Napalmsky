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
  title: 'Napalm Sky - Speed Dating Reimagined',
  description: 'Speed Dating Reimagined — Live Matches, Zero Waiting.',
  openGraph: {
    title: 'Napalm Sky - Speed Dating Reimagined',
    description: 'Speed Dating Reimagined — Live Matches, Zero Waiting.',
    images: [
      {
        url: '/public/image.jpg',
        width: 1200,
        height: 630,
        alt: 'Napalm Sky',
      },
    ],
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

