'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import HeroSection from '@/components/Website/HeroSection';
import ProblemSolutionSection from '@/components/Website/ProblemSolutionSection';
import HowItWorksSection from '@/components/Website/HowItWorksSection';
import FeaturesSection from '@/components/Website/FeaturesSection';
import BetaSection from '@/components/Website/BetaSection';
import FAQTeaser from '@/components/Website/FAQTeaser';
import styles from './page.module.scss';

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setReady(true);
  }, []);

  if (!ready) return null;

  if (isMobile) {
    return (
      <div className={styles.mobileWrap}>
        <div className={styles.mobileHero}>
          <h1 className={styles.mobileHeadline}>
            Pin memories,<br />share the <em>journey</em>.
          </h1>
          <p className={styles.mobileSubline}>A collaborative map journal for your travel crew.</p>
          <Link href="/" className={styles.mobileCta}>Open Nomio →</Link>
        </div>
        <p className={styles.mobileBeta}>
          {'Nomio is currently in beta. '}
          <Link href="/contact">Feedback welcome.</Link>
        </p>
        <nav className={styles.mobileLinks}>
          <Link href="/faq">FAQ</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    );
  }

  return (
    <>
      <HeroSection />
      <ProblemSolutionSection />
      <HowItWorksSection />
      <FeaturesSection />
      <BetaSection />
      <FAQTeaser />
    </>
  );
}
