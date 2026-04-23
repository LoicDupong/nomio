import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import '@/styles/globals.scss';
import FeedbackWidget from '@/components/Feedback/FeedbackWidget';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-figtree',
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
    <html lang="en" className={figtree.variable}>
      <body>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
