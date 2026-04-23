# Nomio Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full website layer around Nomio — landing page, legal pages, FAQ, contact — making it credible as a V1 public beta.

**Architecture:** Next.js route group `app/(website)/` with its own layout (WebsiteNav + WebsiteFooter, no FeedbackWidget). Middleware redirects desktop `/` → `/landing`. Landing page is fully modular: each section is its own component under `components/Website/`. Framer Motion handles scroll-triggered animations.

**Tech Stack:** Next.js App Router, SCSS Modules, Framer Motion, FontAwesome (already installed), Next.js middleware

---

## File Map

**Create:**
- `middleware.ts` (root)
- `app/(website)/layout.tsx`
- `app/(website)/landing/page.tsx` + `page.module.scss`
- `app/(website)/faq/page.tsx` + `page.module.scss`
- `app/(website)/privacy/page.tsx` + `page.module.scss`
- `app/(website)/terms/page.tsx` + `page.module.scss`
- `app/(website)/contact/page.tsx` + `page.module.scss`
- `components/Website/WebsiteNav.tsx` + `.module.scss`
- `components/Website/WebsiteFooter.tsx` + `.module.scss`
- `components/Website/HeroSection.tsx` + `.module.scss`
- `components/Website/ProblemSolutionSection.tsx` + `.module.scss`
- `components/Website/HowItWorksSection.tsx` + `.module.scss`
- `components/Website/FeaturesSection.tsx` + `.module.scss`
- `components/Website/BetaSection.tsx` + `.module.scss`
- `components/Website/FAQTeaser.tsx` + `.module.scss`

**Modify:**
- `app/page.tsx` — add mobile "About Nomio" link
- `app/page.module.scss` — add `.aboutLink` style

---

## Task 1: Install framer-motion

**Files:** `package.json`

- [ ] **Step 1: Install**

```bash
npm install framer-motion
```

Expected: framer-motion added to `dependencies` in `package.json`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(website): install framer-motion"
```

---

## Task 2: WebsiteNav

**Files:**
- Create: `components/Website/WebsiteNav.tsx`
- Create: `components/Website/WebsiteNav.module.scss`

- [ ] **Step 1: Create `components/Website/WebsiteNav.tsx`**

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './WebsiteNav.module.scss';

export default function WebsiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={styles.inner}>
        <Link href="/landing" className={styles.brand}>
          <img src="/logo/nomio-circles-lockup.svg" alt="Nomio" width={108} height={26} />
        </Link>

        <div className={styles.center}>
          <a href="/landing#how-it-works" className={styles.navLink}>How it works</a>
          <Link href="/faq" className={styles.navLink}>FAQ</Link>
          <Link href="/contact" className={styles.navLink}>Contact</Link>
        </div>

        <div className={styles.right}>
          <span className={styles.betaPill}>Beta</span>
          <Link href="/auth/login" className={styles.signIn}>Sign in</Link>
          <Link href="/" className={styles.ctaBtn}>Try Nomio →</Link>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.drawer}>
          <a href="/landing#how-it-works" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>How it works</a>
          <Link href="/faq" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>FAQ</Link>
          <Link href="/contact" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>Contact</Link>
          <Link href="/privacy" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>Privacy</Link>
          <Link href="/terms" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>Terms</Link>
          <Link href="/" className={styles.drawerCta}>Open Nomio →</Link>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Create `components/Website/WebsiteNav.module.scss`**

```scss
@use '@/styles/variables' as *;

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba($color-cream, 0.85);
  border-bottom: 1px solid transparent;
  transition: border-color $transition-base, background $transition-base;
}

.navScrolled {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom-color: $color-border;
  background: rgba($color-cream, 0.92);
}

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 64px;
}

.brand {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.center {
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: $tablet) {
    display: none;
  }
}

.navLink {
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-text-muted;
  transition: color $transition-fast;

  &:hover {
    color: $color-teal;
  }
}

.right {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: $tablet) {
    display: none;
  }
}

.betaPill {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.55rem;
  border-radius: $radius-full;
  background: $color-ochre;
  color: $color-ink;
}

.signIn {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-teal;
  padding: 0.35rem 0.75rem;
  border: 1.5px solid $color-teal;
  border-radius: $radius-sm;
  transition: background $transition-fast, color $transition-fast;

  &:hover {
    background: $color-teal;
    color: $color-cream;
  }
}

.ctaBtn {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-cream;
  background: $color-coral;
  padding: 0.4rem 0.875rem;
  border-radius: $radius-sm;
  transition: opacity $transition-fast, transform $transition-fast;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
}

.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 4px;
  min-height: unset;

  @media (max-width: $tablet) {
    display: flex;
  }

  span {
    display: block;
    width: 22px;
    height: 2px;
    background: $color-ink;
    border-radius: 2px;
  }
}

.drawer {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1.5rem 1.5rem;
  border-top: 1px solid $color-border;
  background: $color-cream;
  gap: 0.1rem;
}

.drawerLink {
  font-size: 0.9375rem;
  font-weight: 500;
  color: $color-text-muted;
  padding: 0.65rem 0;
  border-bottom: 1px solid rgba($color-border-warm, 0.5);

  &:hover {
    color: $color-teal;
  }
}

.drawerCta {
  margin-top: 0.75rem;
  text-align: center;
  font-size: 0.9375rem;
  font-weight: 600;
  color: $color-cream;
  background: $color-coral;
  padding: 0.75rem;
  border-radius: $radius-md;

  &:hover {
    opacity: 0.9;
  }
}
```

- [ ] **Step 3: Type check**

```bash
cd /path/to/travel-memory-map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to WebsiteNav.

- [ ] **Step 4: Commit**

```bash
git add components/Website/WebsiteNav.tsx components/Website/WebsiteNav.module.scss
git commit -m "feat(website): add WebsiteNav component"
```

---

## Task 3: WebsiteFooter

**Files:**
- Create: `components/Website/WebsiteFooter.tsx`
- Create: `components/Website/WebsiteFooter.module.scss`

- [ ] **Step 1: Create `components/Website/WebsiteFooter.tsx`**

```tsx
import Link from 'next/link';
import styles from './WebsiteFooter.module.scss';

export default function WebsiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.col}>
          <img src="/logo/nomio-circles-lockup.svg" alt="Nomio" width={96} height={23} />
          <p className={styles.tagline}>Plan and relive your trips together.</p>
          <span className={styles.betaPill}>Beta</span>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>Product</p>
          <Link href="/landing" className={styles.footerLink}>Home</Link>
          <a href="/landing#how-it-works" className={styles.footerLink}>How it works</a>
          <Link href="/faq" className={styles.footerLink}>FAQ</Link>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>Legal</p>
          <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
          <Link href="/terms" className={styles.footerLink}>Terms</Link>
          <Link href="/contact" className={styles.footerLink}>Contact</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© 2026 Nomio · Built in Belgium · All rights reserved</span>
        <a href="mailto:loic@dupong.be" className={styles.email}>loic@dupong.be</a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Create `components/Website/WebsiteFooter.module.scss`**

```scss
@use '@/styles/variables' as *;

.footer {
  background: $color-ink;
  color: rgba($color-cream, 0.7);
  padding: 3rem 2rem 1.5rem;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgba($color-cream, 0.1);

  @media (max-width: $tablet) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tagline {
  font-size: 0.875rem;
  color: rgba($color-cream, 0.5);
  margin-top: 0.25rem;
}

.betaPill {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.55rem;
  border-radius: $radius-full;
  background: $color-ochre;
  color: $color-ink;
  width: fit-content;
  margin-top: 0.25rem;
}

.colTitle {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba($color-cream, 0.4);
  margin-bottom: 0.25rem;
}

.footerLink {
  font-size: 0.875rem;
  color: rgba($color-cream, 0.65);
  transition: color $transition-fast;

  &:hover {
    color: $color-cream;
  }
}

.bottom {
  max-width: 1200px;
  margin: 1.5rem auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: rgba($color-cream, 0.35);

  @media (max-width: $tablet) {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}

.email {
  color: rgba($color-cream, 0.35);
  transition: color $transition-fast;

  &:hover {
    color: rgba($color-cream, 0.65);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Website/WebsiteFooter.tsx components/Website/WebsiteFooter.module.scss
git commit -m "feat(website): add WebsiteFooter component"
```

---

## Task 4: Website Layout

**Files:**
- Create: `app/(website)/layout.tsx`

- [ ] **Step 1: Create `app/(website)/layout.tsx`**

```tsx
import WebsiteNav from '@/components/Website/WebsiteNav';
import WebsiteFooter from '@/components/Website/WebsiteFooter';

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebsiteNav />
      <main>{children}</main>
      <WebsiteFooter />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(website)/layout.tsx"
git commit -m "feat(website): add (website) route group layout"
```

---

## Task 5: HeroSection

**Files:**
- Create: `components/Website/HeroSection.tsx`
- Create: `components/Website/HeroSection.module.scss`

- [ ] **Step 1: Create `components/Website/HeroSection.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './HeroSection.module.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <motion.div
          className={styles.content}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.span className={styles.betaBadge} variants={fadeUp}>Beta</motion.span>
          <motion.h1 className={styles.headline} variants={fadeUp}>
            Pin memories,<br />share the <em>journey</em>.
          </motion.h1>
          <motion.p className={styles.subline} variants={fadeUp}>
            A collaborative map journal for your travel crew.
          </motion.p>
          <motion.div className={styles.ctas} variants={fadeUp}>
            <Link href="/auth/register" className={styles.ctaPrimary}>Start for free →</Link>
            <a href="#how-it-works" className={styles.ctaSecondary}>See how it works ↓</a>
          </motion.div>
        </motion.div>
        <div className={styles.blob} aria-hidden="true" />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/Website/HeroSection.module.scss`**

```scss
@use '@/styles/variables' as *;

.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: $color-sand;
  overflow: hidden;
  padding-top: 64px;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 2rem;
  position: relative;
  z-index: 1;
  width: 100%;
}

.content {
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.betaBadge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.65rem;
  border-radius: $radius-full;
  background: $color-ochre;
  color: $color-ink;
  width: fit-content;
}

.headline {
  font-size: clamp(2.8rem, 6vw, 4.5rem);
  font-weight: 800;
  color: $color-ink;
  line-height: 1.08;
  letter-spacing: -0.04em;

  em {
    font-style: italic;
    font-family: var(--font-fraunces, #{$font-serif});
    font-weight: 400;
    color: $color-teal;
  }
}

.subline {
  font-size: 1.125rem;
  color: $color-text-muted;
  line-height: 1.6;
  max-width: 480px;
}

.ctas {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.ctaPrimary {
  display: inline-flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: $color-cream;
  background: $color-coral;
  padding: 0.875rem 1.75rem;
  border-radius: $radius-md;
  transition: transform $transition-fast, box-shadow $transition-fast;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($color-coral, 0.3);
  }
}

.ctaSecondary {
  font-size: 0.9375rem;
  font-weight: 600;
  color: $color-teal;
  padding: 0.875rem 1.25rem;
  border: 1.5px solid $color-teal;
  border-radius: $radius-md;
  transition: background $transition-fast, color $transition-fast;

  &:hover {
    background: $color-teal;
    color: $color-cream;
  }
}

.blob {
  position: absolute;
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba($color-teal, 0.12) 0%, rgba($color-teal, 0) 70%);
  pointer-events: none;

  @media (max-width: $tablet) {
    display: none;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Website/HeroSection.tsx components/Website/HeroSection.module.scss
git commit -m "feat(website): add HeroSection component"
```

---

## Task 6: ProblemSolutionSection

**Files:**
- Create: `components/Website/ProblemSolutionSection.tsx`
- Create: `components/Website/ProblemSolutionSection.module.scss`

- [ ] **Step 1: Create `components/Website/ProblemSolutionSection.tsx`**

```tsx
'use client';
import { motion } from 'framer-motion';
import styles from './ProblemSolutionSection.module.scss';

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut', delay } },
});

export default function ProblemSolutionSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <motion.div
          className={styles.problem}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
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
          viewport={{ once: true }}
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
```

- [ ] **Step 2: Create `components/Website/ProblemSolutionSection.module.scss`**

```scss
@use '@/styles/variables' as *;

.section {
  background: $color-cream;
  padding: 6rem 2rem;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;

  @media (max-width: $tablet) {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
}

.problem {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-right: 2rem;
  border-right: 1px solid $color-border;

  @media (max-width: $tablet) {
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid $color-border;
    padding-bottom: 3rem;
  }
}

.solution {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: $color-text-muted;
}

.title {
  font-size: 1.625rem;
  font-weight: 700;
  color: $color-ink;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.body {
  font-size: 1rem;
  color: $color-text-muted;
  line-height: 1.7;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Website/ProblemSolutionSection.tsx components/Website/ProblemSolutionSection.module.scss
git commit -m "feat(website): add ProblemSolutionSection component"
```

---

## Task 7: HowItWorksSection

**Files:**
- Create: `components/Website/HowItWorksSection.tsx`
- Create: `components/Website/HowItWorksSection.module.scss`

- [ ] **Step 1: Create `components/Website/HowItWorksSection.tsx`**

```tsx
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
          viewport={{ once: true }}
        >
          <h2 className={styles.title}>How it works</h2>
          <p className={styles.subtitle}>Three steps to your first shared memory.</p>
        </motion.div>

        <motion.div
          className={styles.steps}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
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
```

- [ ] **Step 2: Create `components/Website/HowItWorksSection.module.scss`**

```scss
@use '@/styles/variables' as *;

.section {
  background: $color-sand;
  padding: 6rem 2rem;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
}

.header {
  text-align: center;
}

.title {
  font-size: 2.25rem;
  font-weight: 800;
  color: $color-ink;
  letter-spacing: -0.03em;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: $color-text-muted;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;

  @media (max-width: $tablet) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
}

.step {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.number {
  font-size: 3rem;
  font-weight: 800;
  color: $color-ochre;
  line-height: 1;
  letter-spacing: -0.04em;
}

.stepTitle {
  font-size: 1.125rem;
  font-weight: 700;
  color: $color-ink;
}

.stepDesc {
  font-size: 0.9375rem;
  color: $color-text-muted;
  line-height: 1.65;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Website/HowItWorksSection.tsx components/Website/HowItWorksSection.module.scss
git commit -m "feat(website): add HowItWorksSection component"
```

---

## Task 8: FeaturesSection

**Files:**
- Create: `components/Website/FeaturesSection.tsx`
- Create: `components/Website/FeaturesSection.module.scss`

- [ ] **Step 1: Create `components/Website/FeaturesSection.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `components/Website/FeaturesSection.module.scss`**

```scss
@use '@/styles/variables' as *;

.section {
  background: $color-cream;
  padding: 6rem 2rem;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
}

.header {
  text-align: center;
}

.title {
  font-size: 2.25rem;
  font-weight: 800;
  color: $color-ink;
  letter-spacing: -0.03em;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: $color-text-muted;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: $tablet) {
    grid-template-columns: 1fr;
  }
}

.card {
  background: $color-sand;
  border: 1px solid $color-border;
  border-radius: $radius-xl;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.icon {
  font-size: 1.25rem;
  color: $color-teal;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($color-teal, 0.08);
  border-radius: $radius-md;
}

.cardTitle {
  font-size: 1.0625rem;
  font-weight: 700;
  color: $color-ink;
}

.cardDesc {
  font-size: 0.9375rem;
  color: $color-text-muted;
  line-height: 1.65;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Website/FeaturesSection.tsx components/Website/FeaturesSection.module.scss
git commit -m "feat(website): add FeaturesSection component"
```

---

## Task 9: BetaSection

**Files:**
- Create: `components/Website/BetaSection.tsx`
- Create: `components/Website/BetaSection.module.scss`

- [ ] **Step 1: Create `components/Website/BetaSection.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `components/Website/BetaSection.module.scss`**

```scss
@use '@/styles/variables' as *;

.section {
  background: $color-ochre-soft;
  padding: 5rem 2rem;
}

.inner {
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.betaPill {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.65rem;
  border-radius: $radius-full;
  background: $color-ochre;
  color: $color-ink;
}

.title {
  font-size: 2rem;
  font-weight: 800;
  color: $color-ink;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.body {
  font-size: 1rem;
  color: $color-text-muted;
  line-height: 1.7;
}

.cta {
  font-size: 0.9375rem;
  font-weight: 600;
  color: $color-cream;
  background: $color-teal;
  padding: 0.75rem 1.5rem;
  border-radius: $radius-md;
  transition: opacity $transition-fast, transform $transition-fast;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Website/BetaSection.tsx components/Website/BetaSection.module.scss
git commit -m "feat(website): add BetaSection component"
```

---

## Task 10: FAQTeaser

**Files:**
- Create: `components/Website/FAQTeaser.tsx`
- Create: `components/Website/FAQTeaser.module.scss`

- [ ] **Step 1: Create `components/Website/FAQTeaser.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `components/Website/FAQTeaser.module.scss`**

```scss
@use '@/styles/variables' as *;

.section {
  background: $color-sand;
  padding: 5rem 2rem;
}

.inner {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: 800;
  color: $color-ink;
  letter-spacing: -0.03em;
  text-align: center;
}

.list {
  display: flex;
  flex-direction: column;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1.25rem 0;
  border-bottom: 1px solid $color-border;

  &:first-child {
    border-top: 1px solid $color-border;
  }
}

.question {
  font-size: 0.9375rem;
  font-weight: 700;
  color: $color-ink;
}

.answer {
  font-size: 0.9375rem;
  color: $color-text-muted;
  line-height: 1.6;
}

.allFaqs {
  font-size: 0.9375rem;
  font-weight: 600;
  color: $color-teal;
  text-align: center;
  transition: opacity $transition-fast;

  &:hover {
    opacity: 0.75;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Website/FAQTeaser.tsx components/Website/FAQTeaser.module.scss
git commit -m "feat(website): add FAQTeaser component"
```

---

## Task 11: Landing Page

**Files:**
- Create: `app/(website)/landing/page.tsx`
- Create: `app/(website)/landing/page.module.scss`

- [ ] **Step 1: Create `app/(website)/landing/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import HeroSection from '@/components/Website/HeroSection';
import ProblemSolutionSection from '@/components/Website/ProblemSolutionSection';
import HowItWorksSection from '@/components/Website/HowItWorksSection';
import FeaturesSection from '@/components/Website/FeaturesSection';
import BetaSection from '@/components/Website/BetaSection';
import FAQTeaser from '@/components/Website/FAQTeaser';
import styles from './page.module.scss';

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setReady(true);
  }, []);

  if (!ready) return null;

  if (isMobile) {
    return (
      <div className={styles.mobileWrap}>
        <div className={styles.mobileHero}>
          <h1 className={styles.mobileHeadline}>
            Pin memories,<br />share the <em>journey</em>.
          </h1>
          <p className={styles.mobileSubline}>A collaborative map journal for your travel crew.</p>
          <Link href="/" className={styles.mobileCta}>Open Nomio →</Link>
        </div>
        <p className={styles.mobileBeta}>
          Nomio is currently in beta.{' '}
          <Link href="/contact">Feedback welcome.</Link>
        </p>
        <nav className={styles.mobileLinks}>
          <Link href="/faq">FAQ</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    );
  }

  return (
    <>
      <HeroSection />
      <ProblemSolutionSection />
      <HowItWorksSection />
      <FeaturesSection />
      <BetaSection />
      <FAQTeaser />
    </>
  );
}
```

- [ ] **Step 2: Create `app/(website)/landing/page.module.scss`**

```scss
@use '@/styles/variables' as *;

.mobileWrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 1.5rem 3rem;
  background: $color-sand;
  gap: 2rem;
  text-align: center;
}

.mobileHero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mobileHeadline {
  font-size: 2.25rem;
  font-weight: 800;
  color: $color-ink;
  letter-spacing: -0.035em;
  line-height: 1.1;

  em {
    font-style: italic;
    font-family: var(--font-fraunces, #{$font-serif});
    font-weight: 400;
    color: $color-teal;
  }
}

.mobileSubline {
  font-size: 0.9375rem;
  color: $color-text-muted;
  line-height: 1.6;
}

.mobileCta {
  display: inline-block;
  font-size: 1rem;
  font-weight: 600;
  color: $color-cream;
  background: $color-coral;
  padding: 0.875rem 2rem;
  border-radius: $radius-md;
  margin-top: 0.5rem;
  transition: opacity $transition-fast;

  &:hover {
    opacity: 0.9;
  }
}

.mobileBeta {
  font-size: 0.875rem;
  color: $color-text-muted;

  a {
    color: $color-teal;
    font-weight: 600;
  }
}

.mobileLinks {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;

  a {
    font-size: 0.875rem;
    color: $color-text-subtle;
    transition: color $transition-fast;

    &:hover {
      color: $color-teal;
    }
  }
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from landing page or section components.

- [ ] **Step 4: Commit**

```bash
git add "app/(website)/landing/page.tsx" "app/(website)/landing/page.module.scss"
git commit -m "feat(website): add landing page with desktop/mobile layouts"
```

---

## Task 12: Middleware

**Files:**
- Create: `middleware.ts` (project root, same level as `app/`)

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile/i;

export function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  if (!MOBILE_UA.test(ua)) {
    return NextResponse.redirect(new URL('/landing', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(website): add middleware to redirect desktop / to /landing"
```

---

## Task 13: FAQ Page

**Files:**
- Create: `app/(website)/faq/page.tsx`
- Create: `app/(website)/faq/page.module.scss`

- [ ] **Step 1: Create `app/(website)/faq/page.tsx`**

```tsx
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
      <button className={styles.question} onClick={() => setOpen(!open)}>
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

export default function FAQPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.pageTitle}>Frequently asked questions</h1>
        <p className={styles.pageSubtitle}>
          {"Can't find what you're looking for? "}
          <a href="mailto:loic@dupong.be">Email us.</a>
        </p>

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
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(website)/faq/page.module.scss`**

```scss
@use '@/styles/variables' as *;

.page {
  min-height: 100vh;
  background: $color-sand;
  padding: 7rem 2rem 5rem;
}

.inner {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.pageTitle {
  font-size: 2.5rem;
  font-weight: 800;
  color: $color-ink;
  letter-spacing: -0.035em;
}

.pageSubtitle {
  font-size: 1rem;
  color: $color-text-muted;
  margin-top: -1.5rem;

  a {
    color: $color-teal;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
}

.category {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.categoryTitle {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: $color-text-muted;
  margin-bottom: 0.75rem;
}

.list {
  border-top: 1px solid $color-border;
}

.item {
  border-bottom: 1px solid $color-border;
}

.question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1.125rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: $color-ink;
  text-align: left;
  min-height: unset;
  gap: 1rem;
  transition: color $transition-fast;

  &:hover {
    color: $color-teal;
  }
}

.chevron {
  font-size: 1.25rem;
  color: $color-text-subtle;
  transition: transform $transition-fast;
  flex-shrink: 0;
  transform: rotate(90deg);
  display: inline-block;
}

.chevronOpen {
  transform: rotate(-90deg);
}

.answer {
  overflow: hidden;
}

.answerText {
  font-size: 0.9375rem;
  color: $color-text-muted;
  line-height: 1.7;
  padding-bottom: 1.125rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(website)/faq/page.tsx" "app/(website)/faq/page.module.scss"
git commit -m "feat(website): add FAQ page with animated accordion"
```

---

## Task 14: Privacy Page

**Files:**
- Create: `app/(website)/privacy/page.tsx`
- Create: `app/(website)/privacy/page.module.scss`

- [ ] **Step 1: Create `app/(website)/privacy/page.tsx`**

```tsx
import styles from './page.module.scss';

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.prose}>
        <h1>Privacy Policy</h1>
        <p className={styles.lead}>Last updated: April 2026 · Nomio is in public beta. This policy may evolve as the product does.</p>

        <h2>Who we are</h2>
        <p>Nomio is a collaborative travel memory app operated by Loïc Dupong, based in Belgium. Contact: <a href="mailto:loic@dupong.be">loic@dupong.be</a></p>

        <h2>What we collect</h2>
        <p>We collect only what's needed to run the service:</p>
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

        <h2>Storage & retention</h2>
        <p>Account and trip data is stored in a PostgreSQL database on secure infrastructure. Photos are stored on Cloudflare R2. Data is retained until you request deletion.</p>

        <h2>Your rights (RGPD)</h2>
        <p>You have the right to access, correct, export, or delete your data at any time. To exercise these rights, contact us at <a href="mailto:loic@dupong.be">loic@dupong.be</a>. We'll respond promptly.</p>

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
```

- [ ] **Step 2: Create `app/(website)/privacy/page.module.scss`**

```scss
@use '@/styles/variables' as *;

.page {
  min-height: 100vh;
  background: $color-sand;
  padding: 7rem 2rem 5rem;
}

.prose {
  max-width: 680px;
  margin: 0 auto;

  h1 {
    font-size: 2.25rem;
    font-weight: 800;
    color: $color-ink;
    letter-spacing: -0.035em;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 1.125rem;
    font-weight: 700;
    color: $color-ink;
    margin-top: 2.5rem;
    margin-bottom: 0.625rem;
  }

  p {
    font-size: 0.9375rem;
    color: $color-text-muted;
    line-height: 1.75;
    margin-bottom: 0.75rem;
  }

  ul {
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.75rem;

    li {
      font-size: 0.9375rem;
      color: $color-text-muted;
      line-height: 1.65;
    }
  }

  a {
    color: $color-teal;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }

  strong {
    color: $color-ink;
    font-weight: 600;
  }
}

.lead {
  font-size: 0.875rem !important;
  color: $color-text-subtle !important;
  border-left: 3px solid $color-ochre;
  padding-left: 1rem;
  margin-bottom: 2rem !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(website)/privacy/page.tsx" "app/(website)/privacy/page.module.scss"
git commit -m "feat(website): add Privacy Policy page"
```

---

## Task 15: Terms Page

**Files:**
- Create: `app/(website)/terms/page.tsx`
- Create: `app/(website)/terms/page.module.scss`

- [ ] **Step 1: Create `app/(website)/terms/page.tsx`**

```tsx
import styles from './page.module.scss';

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
        <p>You own your photos and content. By uploading to Nomio, you grant us a limited license to store and display your content to the members of your trip. We don't claim ownership of your work.</p>

        <h2>Beta disclaimer</h2>
        <p>Nomio is in beta. We provide no uptime guarantee. Data may be reset during this phase. We'll do our best to communicate any changes in advance, but we can't make promises about continuity at this stage.</p>

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
```

- [ ] **Step 2: Create `app/(website)/terms/page.module.scss`**

Same styles as privacy — copy the file exactly:

```scss
@use '@/styles/variables' as *;

.page {
  min-height: 100vh;
  background: $color-sand;
  padding: 7rem 2rem 5rem;
}

.prose {
  max-width: 680px;
  margin: 0 auto;

  h1 {
    font-size: 2.25rem;
    font-weight: 800;
    color: $color-ink;
    letter-spacing: -0.035em;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 1.125rem;
    font-weight: 700;
    color: $color-ink;
    margin-top: 2.5rem;
    margin-bottom: 0.625rem;
  }

  p {
    font-size: 0.9375rem;
    color: $color-text-muted;
    line-height: 1.75;
    margin-bottom: 0.75rem;
  }

  a {
    color: $color-teal;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
}

.lead {
  font-size: 0.875rem !important;
  color: $color-text-subtle !important;
  border-left: 3px solid $color-ochre;
  padding-left: 1rem;
  margin-bottom: 2rem !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(website)/terms/page.tsx" "app/(website)/terms/page.module.scss"
git commit -m "feat(website): add Terms of Use page"
```

---

## Task 16: Contact Page

**Files:**
- Create: `app/(website)/contact/page.tsx`
- Create: `app/(website)/contact/page.module.scss`

- [ ] **Step 1: Create `app/(website)/contact/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `app/(website)/contact/page.module.scss`**

```scss
@use '@/styles/variables' as *;

.page {
  min-height: 100vh;
  background: $color-sand;
  padding: 7rem 2rem 5rem;
  display: flex;
  justify-content: center;
}

.inner {
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.title {
  font-size: 2.25rem;
  font-weight: 800;
  color: $color-ink;
  letter-spacing: -0.035em;
}

.lead {
  font-size: 1rem;
  color: $color-text-muted;
  margin-top: -0.75rem;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1.5rem;
  background: $color-cream;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
}

.blockLabel {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: $color-text-subtle;
}

.emailLink {
  font-size: 1.125rem;
  font-weight: 700;
  color: $color-teal;

  &:hover {
    text-decoration: underline;
  }
}

.blockBody {
  font-size: 0.9375rem;
  color: $color-text-muted;
  line-height: 1.65;
}

.note {
  font-size: 0.875rem;
  color: $color-text-subtle;
  font-style: italic;
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(website)/contact/page.tsx" "app/(website)/contact/page.module.scss"
git commit -m "feat(website): add Contact page"
```

---

## Task 17: App Entry — Mobile "About" Link

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.module.scss`

- [ ] **Step 1: Add import in `app/page.tsx`**

`Link` is already imported. No change needed there.

- [ ] **Step 2: Add "About Nomio" link in `app/page.tsx`**

Find this block (after the closing `</div>` of `.card` and before `{user && (`):

```tsx
      </div>

      {user && (
```

Replace with:

```tsx
      </div>

      <Link href="/landing" className={styles.aboutLink}>About Nomio →</Link>

      {user && (
```

- [ ] **Step 3: Add `.aboutLink` style in `app/page.module.scss`**

Append at the end of the file:

```scss
/* ─── About link (mobile only) ──────────────────────────── */

.aboutLink {
  display: none;
  font-size: 0.8rem;
  color: $color-text-subtle;
  text-align: center;
  transition: color $transition-fast;

  &:hover {
    color: $color-teal;
  }

  @media (max-width: $tablet) {
    display: block;
  }
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/page.module.scss
git commit -m "feat(website): add mobile About Nomio link on app entry"
```

---

## Manual Test Checklist

After all tasks are complete, verify in the browser:

- [ ] Desktop: visiting `/` redirects to `/landing`
- [ ] `/landing` desktop: all 6 sections render, Framer Motion animations trigger on scroll
- [ ] `/landing` mobile (or DevTools mobile UA): compact layout shown (headline + CTA + links only)
- [ ] WebsiteNav: links work, blur effect on scroll, hamburger opens/closes on mobile
- [ ] WebsiteFooter: all links correct, dark background, beta pill visible
- [ ] `/faq`: accordion opens/closes with animation, all 12 questions present
- [ ] `/privacy`: full prose, RGPD sections, ochre left-border on lead
- [ ] `/terms`: full prose, beta disclaimer present
- [ ] `/contact`: two blocks (email + in-app), mailto link works
- [ ] App entry `/` on mobile: "About Nomio →" link visible below the card
- [ ] App entry `/` on mobile: "About Nomio →" link hidden on desktop
- [ ] FeedbackWidget floating button does NOT appear on any `/landing`, `/faq`, `/privacy`, `/terms`, `/contact` page
