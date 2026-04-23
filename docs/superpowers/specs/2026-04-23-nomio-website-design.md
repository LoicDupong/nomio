# Nomio Website — Design Spec
**Date:** 2026-04-23  
**Scope:** Full website section (landing, legal, FAQ, contact) — outside existing app UI  
**Status:** Approved

---

## 1. Context

Nomio is a collaborative travel memory map app (Next.js + Express + PostgreSQL). The app itself is functional (trips, pins, gallery, feedback). This spec covers the surrounding "website" layer: marketing landing page, legal pages, and support pages — everything needed to make Nomio credible as a real V1 public beta.

Existing app pages (unchanged by this work):
- `/` — app entry point (create trip, join, my trips)
- `/trip/[id]` — map view
- `/auth/login`, `/auth/register`
- `/join/[code]`
- `/admin/feedbacks`

---

## 2. Routing & Architecture

### Route Group

All website pages live under `app/(website)/` — a Next.js route group with its own layout. This cleanly separates the website universe from the app universe.

```
app/
  (website)/
    layout.tsx               ← WebsiteLayout: WebsiteNav + WebsiteFooter, no FeedbackWidget
    landing/
      page.tsx
      page.module.scss
    faq/
      page.tsx
      page.module.scss
    privacy/
      page.tsx
      page.module.scss
    terms/
      page.tsx
      page.module.scss
    contact/
      page.tsx
      page.module.scss
  page.tsx                   ← App entry (unchanged except small "About" link on mobile)
  layout.tsx                 ← Root layout (FeedbackWidget, fonts, analytics — unchanged)
middleware.ts                ← Desktop redirect logic
components/
  Website/
    WebsiteNav.tsx + .scss
    WebsiteFooter.tsx + .scss
    HeroSection.tsx + .scss
    ProblemSolutionSection.tsx + .scss
    HowItWorksSection.tsx + .scss
    FeaturesSection.tsx + .scss
    BetaSection.tsx + .scss
    FAQTeaser.tsx + .scss
```

### URL Map

| URL | Page | Notes |
|-----|------|-------|
| `/landing` | Marketing landing page | Desktop full, mobile compact |
| `/faq` | FAQ accordion | ~10–12 questions, 3 categories |
| `/privacy` | Privacy policy | RGPD-aware, V1 beta scope |
| `/terms` | Terms of use | Short, readable, beta disclaimer |
| `/contact` | Contact page | Email + feedback link, no form |

---

## 3. Desktop/Mobile Routing Logic

### Middleware (`middleware.ts`)

Server-side redirect: reads the `User-Agent` header. If the request is to `/` and the UA is **not** a mobile device, redirect to `/landing`.

- Matcher: `'/'` only
- Detection: regex on UA string for mobile keywords (`Android`, `iPhone`, `iPad`, `Mobile`)
- Non-mobile UA → `NextResponse.redirect('/landing')`
- Mobile UA → pass through to app entry (`/`)

### Mobile at `/landing`

When a mobile user navigates to `/landing` (via the "About" button or direct link), the page renders a **compact mobile layout**:
- Short hero headline + one-line subtext
- Single CTA: `Open Nomio →` (links to `/`)
- Beta notice
- Footer links (FAQ, Privacy, Terms, Contact)
- All full marketing sections hidden

Detection: client-side `useEffect` + `window.innerWidth < 768` sets a `isMobile` state that conditionally renders the compact layout.

### App Entry Mobile Addition (`app/page.tsx`)

A small `"About Nomio →"` link is added to the app entry page, visible **only on mobile** (`@media (max-width: $tablet)`). Links to `/landing`. Placed discreetly below the main card — does not disrupt the app UX.

---

## 4. Website Layout (`app/(website)/layout.tsx`)

Wraps all website pages with:
- `WebsiteNav` (sticky top)
- `{children}`
- `WebsiteFooter`

No `FeedbackWidget` floating button (that's app-only). Does not import root layout's feedback widget.

---

## 5. Landing Page (`/landing`)

### Desktop Layout — Full Marketing Page

Sections in order, each animated with Framer Motion (`fadeInUp` on scroll, `once: true`):

#### 5.1 HeroSection
- Large headline: serif italic accent via Fraunces (e.g., *"Pin memories, share the journey."*)
- Subline: "A collaborative map journal for your travel crew."
- Two CTAs: `Start for free →` (coral, primary) + `See how it works ↓` (ghost/teal)
- Background: `$color-sand` with subtle teal blob/gradient decoration
- `Beta` pill badge visible in this section

#### 5.2 ProblemSolutionSection
- Two-column layout (desktop)
- Left: the problem — "Group chats, shared albums, Google Docs... scattered everywhere."
- Right: the solution — "One shared map. Every memory, in its place."
- Clean text, no icon overload
- Stacked on mobile

#### 5.3 HowItWorksSection
- 3 numbered steps in a row:
  1. **Create a trip** — Give it a name, get an invite code.
  2. **Drop pins on the map** — Add notes, photos, and ratings to each place.
  3. **Share & relive** — Invite your crew. Build the memory together.
- Step number in `$color-ochre`, large and prominent
- Animated: steps stagger in with `delay` offsets

#### 5.4 FeaturesSection
- 2×2 grid of feature cards
- Cards: `$color-cream` bg, teal icon, short title, one-line description
  1. **Collaborative map** — Everyone adds pins in real time.
  2. **Photo gallery** — Upload photos per trip, stored securely.
  3. **Real-time sync** — Changes appear instantly for all members.
  4. **Invite by code** — Share a 6-character code to add anyone.
- Grid collapses to 1 col on mobile

#### 5.5 BetaSection
- Centered, honest tone
- "Nomio is in beta. We're building this in the open."
- "Your feedback shapes what comes next."
- Link to in-app feedback or `/contact`
- Subtle ochre/sand background treatment

#### 5.6 FAQTeaser
- 3 most common questions rendered statically (no accordion needed here):
  1. Is Nomio free? → Yes, fully free during beta.
  2. Do I need an account? → To create a trip, yes. Joining as a guest is possible.
  3. Where are my photos stored? → Securely on Cloudflare R2.
- `See all FAQs →` link to `/faq`

### Mobile Layout — Compact Only

When `isMobile` is true, renders:
- Short hero: headline + subline + `Open Nomio →` CTA
- Beta notice: one line
- Footer links: FAQ · Privacy · Terms · Contact
- Nothing else — no problem/solution, no features, no how-it-works

---

## 6. WebsiteNav

**Desktop:**
- Left: Nomio logo SVG (`/logo/nomio-circles-lockup.svg`)
- Center: `How it works` (anchor `/landing#how-it-works`), `FAQ` (`/faq`), `Contact` (`/contact`) links
- Right: `Beta` pill (ochre) + `Sign in` (teal ghost) + `Try Nomio →` (coral filled)
- Sticky, `backdrop-filter: blur(12px)` on scroll

**Mobile:**
- Logo left + hamburger icon right
- Hamburger opens a drawer/dropdown with: How it works, FAQ, Contact, Privacy, Terms + `Open Nomio →` CTA
- Drawer closes on link click or outside tap

**Beta pill:** Small `Beta` label, `background: $color-ochre`, `color: $color-ink`, `border-radius: $radius-full`, `font-size: 0.65rem`, `font-weight: 700`.

---

## 7. WebsiteFooter

**Desktop — 3-column grid:**
- Col 1: Nomio logo + tagline ("Plan and relive your trips together.") + Beta notice
- Col 2: Product — Landing (`/landing`), How it works (`/landing#how-it-works`), FAQ (`/faq`)
- Col 3: Legal — Privacy, Terms, Contact

**Bottom bar:**
- `© 2026 Nomio · Built in Belgium · All rights reserved`
- Contact: `loic@dupong.be`

**Mobile:** Columns stack vertically. Same links. Compact.

---

## 8. FAQ Page (`/faq`)

Accordion-style, animated open/close via Framer Motion.

**Categories and questions:**

**Getting Started**
- What is Nomio? — A collaborative map journal for travel groups.
- Is it free? — Yes, completely free during beta.
- Do I need an account to use it? — You need one to create a trip. Joining as a guest with an invite code is possible.
- How do I invite someone? — Share your 6-character invite code or link.

**Using Nomio**
- Can multiple people add pins at the same time? — Yes, changes sync in real time.
- Can I add photos to a pin? — Yes, each pin supports notes, a rating, and a photo gallery.
- Is there a limit to how many trips or pins I can create? — No limit during beta.
- What happens if I lose my invite code? — You can find it in your trip settings.

**Privacy & Data**
- Where is my data stored? — On secure servers. Photos are stored on Cloudflare R2.
- Can I delete my account and data? — Yes. Contact us at loic@dupong.be and we'll handle it.
- Do you share data with third parties? — No. We use Vercel Analytics (anonymous) and nothing else.
- Is Nomio RGPD compliant? — We follow RGPD principles. See our Privacy Policy for details.

---

## 9. Privacy Policy (`/privacy`)

Structured prose, max-width 680px, readable line-height.

**Sections:**
1. **Who we are** — Nomio, a collaborative travel memory app, operated by Loïc Dupong (loic@dupong.be), Belgium.
2. **What we collect**
   - Account: email, display name, hashed password
   - Trip data: trip names, invite codes, member relationships
   - Pins: location, title, notes, rating, photos
   - Gallery: uploaded images (stored on Cloudflare R2)
   - Feedback: message, type, email (optional)
   - Analytics: anonymous page views via Vercel Analytics (no personal data)
3. **How we use it** — To operate the service. We do not sell or share data with third parties.
4. **Storage & retention** — Data stored on PostgreSQL (Railway/Supabase). Photos on Cloudflare R2. Retained until account deletion is requested.
5. **Your rights (RGPD)** — Right to access, correct, export, or delete your data. Contact: loic@dupong.be.
6. **Cookies** — Session cookies only (authentication). No tracking cookies.
7. **Beta notice** — Nomio is in beta. Data practices may evolve. We will communicate any significant changes.
8. **Contact** — loic@dupong.be

---

## 10. Terms of Use (`/terms`)

Short, readable, non-lawyerly.

**Sections:**
1. **What Nomio is** — A collaborative travel memory app in public beta.
2. **Using Nomio** — Must be 13+. Don't abuse the service (spam, illegal content, scraping).
3. **Your content** — You own your photos and content. You grant Nomio a license to store and display it to your trip members.
4. **Beta disclaimer** — No uptime SLA. Data may be reset during beta. We'll do our best to communicate in advance.
5. **Limitation of liability** — Nomio is provided as-is. We are not liable for data loss during beta.
6. **Changes** — Terms may evolve. Continued use = acceptance.
7. **Contact** — loic@dupong.be

---

## 11. Contact Page (`/contact`)

Simple, honest.

- Short intro: "Got a question, found a bug, or just want to say hi?"
- Primary: Email `loic@dupong.be` (mailto link)
- Secondary: Link to in-app feedback widget ("Or use the feedback button inside the app")
- Beta context: "We read everything. Response time: best effort."
- No form for MVP.

---

## 12. Animations (Framer Motion)

**Dependency:** `framer-motion` (install if not present)

**Standard reveal:**
```ts
initial={{ opacity: 0, y: 24 }}
whileInView={{ opacity: 1, y: 0 }}
transition={{ duration: 0.45, ease: 'easeOut' }}
viewport={{ once: true }}
```

**Staggered grids** (FeaturesSection, HowItWorks steps):
```ts
// Parent
variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
// Child
variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
```

**Nav blur on scroll:** `window.scrollY` in a `useEffect` scroll listener. Adds `backdrop-filter: blur(12px)` + subtle border when scrolled > 10px. No framer-motion dependency needed for this.

Applied: one `motion.div` per section. Not applied to legal pages (prose, no animation needed).

---

## 13. Existing App Changes

Minimal. Only `app/page.tsx` is touched:
- Add a discreet `"About Nomio →"` link visible only on mobile (`@media (max-width: $tablet)`)
- Placed below the main card, before the trip list
- Links to `/landing`

Everything else (feedback widget, admin, auth, trip pages) is untouched.

---

## 14. Design Tokens

All from existing `styles/_variables.scss`. No new tokens needed:
- Primary CTA: `$color-coral`
- Secondary/nav: `$color-teal`
- Beta badge: `$color-ochre` bg, `$color-ink` text
- Backgrounds: `$color-sand` (page), `$color-cream` (cards)
- Text: `$color-ink`, `$color-text-muted`
- Borders: `$color-border`

---

## 15. Out of Scope

- Feedback widget (already done)
- Backend feedback routes (already done)
- Admin feedback page (already done)
- Any app page (trips, pins, gallery, auth)
- Payment, subscriptions, user settings
- Blog, changelog, docs
