'use client';
import Link from 'next/link';
import NomioLogo from '@/components/NomioLogo';
import { motion } from 'framer-motion';
import styles from './HeroSection.module.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
} as const;

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <motion.div
          className={styles.content}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div className={styles.heroLogo} variants={fadeUp}>
            <NomioLogo size={96} variant="onLight" withWordmark />
          </motion.div>
          <motion.span className={styles.betaBadge} variants={fadeUp}>Beta</motion.span>
          <motion.h1 className={styles.headline} variants={fadeUp}>
            Pin memories,<br />share the <em>journey</em>.
          </motion.h1>
          <motion.p className={styles.subline} variants={fadeUp}>
            A collaborative map journal for your travel crew.
          </motion.p>
          <motion.div className={styles.ctas} variants={fadeUp}>
            <Link href="/auth/register" className={styles.ctaPrimary}>Start for free →</Link>
            <a href="#how-it-works" className={styles.ctaSecondary}>See how it works ↓</a>
          </motion.div>
        </motion.div>
        <div className={styles.blob} aria-hidden="true" />
      </div>
    </section>
  );
}
