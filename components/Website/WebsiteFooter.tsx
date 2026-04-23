import Link from 'next/link';
import Image from 'next/image';
import styles from './WebsiteFooter.module.scss';

export default function WebsiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.col}>
          <Image src="/logo/nomio-circles-lockup.svg" alt="Nomio" width={96} height={23} />
          <p className={styles.tagline}>Plan and relive your trips together.</p>
          <span className={styles.betaPill}>Beta</span>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>Product</p>
          <Link href="/landing" className={styles.footerLink}>Home</Link>
          <a href="/landing#how-it-works" className={styles.footerLink}>How it works</a>
          <Link href="/faq" className={styles.footerLink}>FAQ</Link>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>Legal</p>
          <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
          <Link href="/terms" className={styles.footerLink}>Terms</Link>
          <Link href="/contact" className={styles.footerLink}>Contact</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© 2026 Nomio · Built in Belgium · All rights reserved</span>
        <a href="mailto:loic@dupong.be" className={styles.email}>loic@dupong.be</a>
      </div>
    </footer>
  );
}
