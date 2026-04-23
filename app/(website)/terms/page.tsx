import styles from './page.module.scss';

export const metadata = { title: 'Terms of Use — Nomio' };

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.prose}>
        <h1>Terms of Use</h1>
        <p className={styles.lead}>Last updated: April 2026 · Nomio is in public beta. These terms may evolve.</p>

        <h2>What Nomio is</h2>
        <p>Nomio is a collaborative travel memory app currently in public beta. It lets groups of people share a map, drop pins, upload photos, and build trip journals together.</p>

        <h2>Using Nomio</h2>
        <p>You must be at least 13 years old to use Nomio. You agree not to use the service for spam, illegal content, scraping, or anything that would harm other users or the platform.</p>

        <h2>Your content</h2>
        <p>You own your photos and content. By uploading to Nomio, you grant us a limited license to store and display your content to the members of your trip. We don&apos;t claim ownership of your work.</p>

        <h2>Beta disclaimer</h2>
        <p>Nomio is in beta. We provide no uptime guarantee. Data may be reset during this phase. We&apos;ll do our best to communicate any changes in advance, but we can&apos;t make promises about continuity at this stage.</p>

        <h2>Limitation of liability</h2>
        <p>Nomio is provided as-is. We are not liable for data loss, service interruptions, or other issues that arise during the beta period.</p>

        <h2>Changes to these terms</h2>
        <p>We may update these terms as the product evolves. Continued use of Nomio after changes means you accept the updated terms.</p>

        <h2>Contact</h2>
        <p>Questions? Write to <a href="mailto:loic@dupong.be">loic@dupong.be</a>.</p>
      </div>
    </div>
  );
}
