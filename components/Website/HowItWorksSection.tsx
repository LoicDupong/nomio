'use client';
import { motion } from 'framer-motion';
import styles from './HowItWorksSection.module.scss';

const steps = [
  { number: '01', title: 'Create a trip', description: 'Give it a name and get an instant invite code to share with your crew.' },
  { number: '02', title: 'Drop pins on the map', description: 'Add notes, photos, and star ratings to every place you visit.' },
  { number: '03', title: 'Share & relive', description: 'Invite your crew. Build the memory together, in real time.' },
];

export default function HowItWorksSection() {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.25 }}
        >
          <h2 className={styles.title}>How it works</h2>
          <p className={styles.subtitle}>Three steps to your first shared memory.</p>
        </motion.div>

        <motion.div
          className={styles.steps}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              className={styles.step}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
              }}
            >
              <span className={styles.number}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
