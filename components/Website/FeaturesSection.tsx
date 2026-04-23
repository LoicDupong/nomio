'use client';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faImages, faBolt, faKey } from '@fortawesome/free-solid-svg-icons';
import styles from './FeaturesSection.module.scss';

const features = [
  { icon: faLocationDot, title: 'Collaborative map', description: 'Everyone adds pins in real time. See where each crew member has been.' },
  { icon: faImages, title: 'Photo gallery', description: 'Upload photos per trip. Stored securely on Cloudflare R2.' },
  { icon: faBolt, title: 'Real-time sync', description: 'Changes appear instantly for all members — no refresh needed.' },
  { icon: faKey, title: 'Invite by code', description: 'Share a 6-character code to add anyone to your trip instantly.' },
];

export default function FeaturesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          viewport={{ once: true }}
        >
          <h2 className={styles.title}>Everything your crew needs</h2>
          <p className={styles.subtitle}>Built for real trips, not hypothetical ones.</p>
        </motion.div>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className={styles.card}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
              }}
            >
              <span className={styles.icon}>
                <FontAwesomeIcon icon={feature.icon} />
              </span>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDesc}>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
