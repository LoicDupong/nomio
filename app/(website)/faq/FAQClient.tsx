'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.scss';

const categories = [
  {
    title: 'Getting Started',
    faqs: [
      { q: 'What is Nomio?', a: 'Nomio is a collaborative map journal for travel groups. Drop pins where things happened, add photos and notes, and build a shared memory with your crew.' },
      { q: 'Is it free?', a: 'Yes, completely free during beta.' },
      { q: 'Do I need an account to use it?', a: 'You need an account to create a trip. Joining as a guest with an invite code is possible without registering.' },
      { q: 'How do I invite someone?', a: 'Share your 6-character invite code or the direct invite link from your trip settings.' },
    ],
  },
  {
    title: 'Using Nomio',
    faqs: [
      { q: 'Can multiple people add pins at the same time?', a: "Yes, changes sync in real time. Everyone in the trip sees pins appear as they're added." },
      { q: 'Can I add photos to a pin?', a: 'Yes. Each pin supports notes, a star rating, and a full photo gallery.' },
      { q: 'Is there a limit to how many trips or pins I can create?', a: 'No limit during beta. Use it freely.' },
      { q: 'What happens if I lose my invite code?', a: 'You can find it at any time in your trip settings panel.' },
    ],
  },
  {
    title: 'Privacy & Data',
    faqs: [
      { q: 'Where is my data stored?', a: 'Trip and account data is stored in our secure database. Photos are stored on Cloudflare R2.' },
      { q: 'Can I delete my account and data?', a: "Yes. Send a request to loic@dupong.be and we'll handle it promptly." },
      { q: 'Do you share data with third parties?', a: 'No. We use Vercel Analytics for anonymous page views. No personal data is shared.' },
      { q: 'Is Nomio RGPD compliant?', a: 'We follow RGPD principles. See our Privacy Policy for full details.' },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.item}>
      <button className={styles.question} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.answer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            <p className={styles.answerText}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQClient() {
  return (
    <>
      {categories.map((cat) => (
        <div key={cat.title} className={styles.category}>
          <h2 className={styles.categoryTitle}>{cat.title}</h2>
          <div className={styles.list}>
            {cat.faqs.map((faq) => (
              <FAQItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
