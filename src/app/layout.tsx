import type { Metadata, Viewport } from 'next';
import { Source_Sans_3, Zilla_Slab } from 'next/font/google';
import './globals.css';

// Self-hosted at build time: neither face is installed on Android or Samsung tablets.
const display = Zilla_Slab({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display', display: 'swap' });
const body = Source_Sans_3({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'Trailside Seasons — Table',
  description: 'A PARKS-style hiking game for one tablet and a phone per player.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1d2b24',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
