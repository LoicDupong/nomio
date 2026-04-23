import styles from './page.module.scss';
import FAQClient from './FAQClient';

export const metadata = { title: 'FAQ — Nomio' };

export default function FAQPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.pageTitle}>Frequently asked questions</h1>
        <p className={styles.pageSubtitle}>
          {"Can't find what you're looking for? "}
          <a href="mailto:loic@dupong.be">Email us.</a>
        </p>
        <FAQClient />
      </div>
    </div>
  );
}
