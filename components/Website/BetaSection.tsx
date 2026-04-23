'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './BetaSection.module.scss';

export default function BetaSection() {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      viewport={{ once: true }}
    >
      <div className={styles.inner}>
        <span className={styles.betaPill}>Beta</span>
        <h2 className={styles.title}>We're building this in the open.</h2>
        <p className={styles.body}>
          Nomio is in beta. That means things change fast, and your feedback shapes what comes next.
          If something's broken, missing, or could be better — we want to know.
        </p>
        <Link href="/contact" className={styles.cta}>Send us feedback →</Link>
      </div>
    </motion.section>
  );
}
