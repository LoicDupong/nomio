import styles from './page.module.scss';

export const metadata = { title: 'Privacy Policy — Nomio' };

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.prose}>
        <h1>Privacy Policy</h1>
        <p className={styles.lead}>Last updated: April 2026 · Nomio is in public beta. This policy may evolve as the product does.</p>

        <h2>Who we are</h2>
        <p>Nomio is a collaborative travel memory app operated by Loïc Dupong, based in Belgium. Contact: <a href="mailto:loic@dupong.be">loic@dupong.be</a></p>

        <h2>What we collect</h2>
        <p>We collect only what&apos;s needed to run the service:</p>
        <ul>
          <li><strong>Account data:</strong> email address, display name, hashed password.</li>
          <li><strong>Trip data:</strong> trip names, invite codes, member relationships.</li>
          <li><strong>Pins:</strong> location coordinates, title, notes, star rating.</li>
          <li><strong>Photos:</strong> images you upload to pins or the gallery, stored on Cloudflare R2.</li>
          <li><strong>Feedback:</strong> message content, feedback type, and optionally your email.</li>
          <li><strong>Analytics:</strong> anonymous page view data via Vercel Analytics. No personal data is collected.</li>
        </ul>

        <h2>How we use it</h2>
        <p>Your data is used solely to operate Nomio. We do not sell data, share it with advertisers, or use it for any purpose outside of the service itself.</p>

        <h2>Storage &amp; retention</h2>
        <p>Account and trip data is stored in a PostgreSQL database on secure infrastructure. Photos are stored on Cloudflare R2. Data is retained until you request deletion.</p>

        <h2>Your rights (RGPD)</h2>
        <p>You have the right to access, correct, export, or delete your data at any time. To exercise these rights, contact us at <a href="mailto:loic@dupong.be">loic@dupong.be</a>. We&apos;ll respond promptly.</p>

        <h2>Cookies</h2>
        <p>We use session cookies for authentication only. No tracking cookies. No third-party ad cookies.</p>

        <h2>Beta notice</h2>
        <p>Nomio is in beta. Data practices may evolve. We will communicate any significant changes clearly.</p>

        <h2>Contact</h2>
        <p>Questions about this policy? Write to <a href="mailto:loic@dupong.be">loic@dupong.be</a>.</p>
      </div>
    </div>
  );
}
