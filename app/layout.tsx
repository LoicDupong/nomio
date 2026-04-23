import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import '@/styles/globals.scss';
import FeedbackWidget from '@/components/Feedback/FeedbackWidget';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['italic'],
  display: 'optional',
  variable: '--font-fraunces',
});

export const metadata: Metadata = {
  title: 'Nomio',
  description: 'Plan and relive your trips together.',
  icons: {
    icon: '/logo/nomio-circles-app-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
