import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import '@/styles/globals.scss';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-figtree',
});

export const metadata: Metadata = {
  title: 'Travel Memory Map',
  description: 'Pin memories on a map with friends',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>{children}</body>
    </html>
  );
}
