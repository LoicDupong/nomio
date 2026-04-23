'use client';
import { motion } from 'framer-motion';
import styles from './ProblemSolutionSection.module.scss';

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const, delay } },
});

export default function ProblemSolutionSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <motion.div
          className={styles.problem}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp(0)}
        >
          <span className={styles.label}>The problem</span>
          <h2 className={styles.title}>Group chats, shared albums, Google Docs... scattered everywhere.</h2>
          <p className={styles.body}>
            Every trip ends the same way. The memories exist — in five different places,
            across three apps, inaccessible to half the group. Nothing tells the story.
          </p>
        </motion.div>

        <motion.div
          className={styles.solution}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp(0.1)}
        >
          <span className={styles.label}>The solution</span>
          <h2 className={styles.title}>One shared map. Every memory, in its place.</h2>
          <p className={styles.body}>
            Nomio puts your whole crew on the same map. Drop pins where it happened,
            add photos and notes, and build a shared journal that actually tells the story.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
