'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './WebsiteNav.module.scss';

export default function WebsiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={styles.inner}>
        <Link href="/landing" className={styles.brand}>
          <Image src="/logo/nomio-circles-lockup.svg" alt="Nomio" width={108} height={26} priority />
        </Link>

        <div className={styles.center}>
          <a href="/landing#how-it-works" className={styles.navLink}>How it works</a>
          <Link href="/faq" className={styles.navLink}>FAQ</Link>
          <Link href="/contact" className={styles.navLink}>Contact</Link>
        </div>

        <div className={styles.right}>
          <span className={styles.betaPill}>Beta</span>
          <Link href="/auth/login" className={styles.signIn}>Sign in</Link>
          <Link href="/" className={styles.ctaBtn}>Try Nomio →</Link>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-drawer"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}
        id="mobile-drawer"
        aria-hidden={!menuOpen}
      >
        <a href="/landing#how-it-works" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>How it works</a>
        <Link href="/faq" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>FAQ</Link>
        <Link href="/contact" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>Contact</Link>
        <Link href="/privacy" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>Privacy</Link>
        <Link href="/terms" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>Terms</Link>
        <Link href="/" className={styles.drawerCta}>Open Nomio →</Link>
      </div>
    </nav>
  );
}
