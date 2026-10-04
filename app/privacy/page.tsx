import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { LEGAL_UPDATED, PUBLISHER } from '@/lib/legal'

export const metadata: Metadata = { title: 'Privacy — Grr', description: 'What Grr, GRRRR and Grr Care collect, why, and how to get it deleted.' }

export default function PrivacyPage() {
  const mail = <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
  return (
    <main className="site-shell">
      <SiteHeader />
      <article className="guide container legal">
        <div className="eyebrow guide-eyebrow"><span className="eyebrow-line" /> Privacy</div>
        <h1>Your data,<br /><em>plainly.</em></h1>
        <p className="guide-lede">This page covers this website and the GRRRR and Grr Care apps. They share one account, so they share one policy. Last updated: {LEGAL_UPDATED}.</p>

        <div className="guide-body">
          <h2>Who is responsible</h2>
          <p>
            {[PUBLISHER.name, PUBLISHER.legalForm, PUBLISHER.address].filter(Boolean).join(', ')}{PUBLISHER.registration && ` (${PUBLISHER.registration})`} publishes Grr and decides how your data is used. For anything on this page, write to {mail}.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Your account</strong>: e-mail address, password (stored encrypted, we never see it), display name and photo. With “Continue with Google”, Google gives us your e-mail, name and picture, nothing else.</li>
            <li><strong>Your pets</strong>: name, species, breed, age, sex, city, description, photos, and what you choose to add.</li>
            <li><strong>In GRRRR</strong>: likes and passes, matches, messages, outings you propose (place and time), relationships and adoption requests.</li>
            <li><strong>In Grr Care</strong>: the health record you keep (vaccines, treatments, vet visits, weight, documents you upload) and the questions you ask the assistant.</li>
            <li><strong>On this site</strong>: threads, comments, upvotes, pets you post to give, and the requests you send or receive (your message and the contact you choose to share).</li>
            <li><strong>Your device</strong>: a notification token if you allow notifications, and your location only when you allow it, to show places and pets near you. Location is not stored as a history.</li>
          </ul>
          <p>We do not sell your data, and there is no advertising tracking in the apps or on this site.</p>

          <h2>Why we use it</h2>
          <ul>
            <li>To run the service you asked for: your account, your pets’ profiles, matches, chats, health records, adoption (performance of our contract with you).</li>
            <li>To send the notifications you allowed: messages, matches, reminders (your consent, which you can withdraw in your phone’s settings or in the app).</li>
            <li>To keep the community safe: reports, moderation, limits against spam (our legitimate interest).</li>
          </ul>

          <h2>Who sees what</h2>
          <ul>
            <li><strong>Other members</strong> see your pets’ public profiles, your threads and comments. Messages are seen only by the two people talking. A request for a pet to give is seen only by you and the pet’s owner.</li>
            <li><strong>Your health records in Grr Care are private</strong>: only you see them.</li>
            <li><strong>The assistant</strong>: questions you ask in Grr Care are sent, with the profile of the pet they are about, to Anthropic, which provides the AI model, to write the answer. Questions may also be kept, without your name, to decide which guides to write next.</li>
          </ul>

          <h2>Who helps us run Grr</h2>
          <p>We rely on these providers, each bound by contract to protect your data: Supabase (database, sign-in, file storage), Vercel (this website), Expo and Google Firebase (notifications), Google (sign-in and maps), Anthropic (AI assistant and guides), Sanity (guides and partners). Some of them process data outside the European Union, under the European Commission’s standard contractual clauses.</p>

          <h2>How long we keep it</h2>
          <p>As long as your account exists. When you delete your account, your pets, matches, messages, health records, documents, photos, threads and listings are deleted with it, immediately. Backups are overwritten within a few weeks.</p>

          <h2>Your rights</h2>
          <p>Under the GDPR you can access your data, correct it, delete it, take it with you, and object to or limit how it is used.</p>
          <ul>
            <li><strong>Delete your account yourself</strong>, at any time: in GRRRR, <em>Settings → Delete my account</em>; in Grr Care, <em>Settings → Delete my account</em>; on this site, <Link href="/account">Your account</Link>.</li>
            <li>For anything else, write to {mail}. We answer within one month.</li>
            <li>If you think we got it wrong, you can complain to your data protection authority (in France, the CNIL: cnil.fr).</li>
          </ul>

          <h2>Children</h2>
          <p>Grr is for people aged 15 and over. Younger people need a parent’s agreement.</p>

          <h2>Cookies</h2>
          <p>This site only uses the cookies needed to keep you signed in, and anonymous audience measurement without advertising cookies.</p>

          <h2>Changes</h2>
          <p>If this policy changes in a way that matters, we tell you in the apps or by e-mail before it applies.</p>
        </div>
      </article>
      <SiteFooter />
    </main>
  )
}
