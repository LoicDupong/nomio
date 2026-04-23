'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './FAQTeaser.module.scss';

const faqs = [
  { q: 'Is Nomio free?', a: 'Yes, fully free during beta.' },
  { q: 'Do I need an account?', a: 'To create a trip, yes. Joining as a guest with an invite code is possible.' },
  { q: 'Where are my photos stored?', a: "Securely on Cloudflare R2. We don't sell or share your data." },
];

export default function FAQTeaser() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <motion.h2
          className={styles.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          viewport={{ once: true }}
        >
          Common questions
        </motion.h2>

        <motion.div
          className={styles.list}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {faqs.map((faq) => (
            <motion.div
              key={faq.q}
              className={styles.item}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
              }}
            >
              <p className={styles.question}>{faq.q}</p>
              <p className={styles.answer}>{faq.a}</p>
            </motion.div>
          ))}
        </motion.div>

        <Link href="/faq" className={styles.allFaqs}>See all FAQs →</Link>
      </div>
    </section>
  );
}
