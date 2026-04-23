import styles from './page.module.scss';

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Get in touch</h1>
        <p className={styles.lead}>Got a question, found a bug, or just want to say hi?</p>

        <div className={styles.block}>
          <p className={styles.blockLabel}>Email</p>
          <a href="mailto:loic@dupong.be" className={styles.emailLink}>loic@dupong.be</a>
        </div>

        <div className={styles.block}>
          <p className={styles.blockLabel}>In-app feedback</p>
          <p className={styles.blockBody}>Use the feedback button inside the app to report bugs or share ideas directly. We read every submission.</p>
        </div>

        <p className={styles.note}>{"We're in beta — response time is best effort. But we read everything."}</p>
      </div>
    </div>
  );
}
