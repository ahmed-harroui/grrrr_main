import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { LEGAL_UPDATED, PUBLISHER } from '@/lib/legal'

export const metadata: Metadata = { title: 'Terms — Grr', description: 'The rules for using Grr, GRRRR and Grr Care.' }

export default function TermsPage() {
  const mail = <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
  const details = [PUBLISHER.legalForm, PUBLISHER.address, PUBLISHER.registration, PUBLISHER.director && `Publishing director: ${PUBLISHER.director}`].filter(Boolean)
  return (
    <main className="site-shell">
      <SiteHeader />
      <article className="guide container legal">
        <div className="eyebrow guide-eyebrow"><span className="eyebrow-line" /> Terms of use</div>
        <h1>The rules,<br /><em>kept short.</em></h1>
        <p className="guide-lede">These terms apply to this website and to the GRRRR and Grr Care apps. Using them means you accept these terms. Last updated: {LEGAL_UPDATED}.</p>

        <div className="guide-body">
          <h2>Who we are</h2>
          <p>Grr is published by {PUBLISHER.name}. {details.length > 0 && <>{details.join(' · ')}. </>}Contact: {mail}. The site is hosted by Vercel Inc.; the data by Supabase.</p>

          <h2>Your account</h2>
          <ul>
            <li>One account works on the site and in both apps. You must be 15 or older (or have a parent’s agreement).</li>
            <li>Give true information and keep your password to yourself. You are responsible for what is done with your account.</li>
            <li>You can delete your account at any time, from the apps’ settings or from <Link href="/account">Your account</Link>.</li>
          </ul>

          <h2>What you post</h2>
          <p>Pet profiles, photos, messages, threads, comments and listings stay yours. You let us show them in Grr so the service can work. Only post what you have the right to post.</p>
          <p>Not allowed: anything illegal, hateful, violent or sexual; harassment; spam and scams; someone else’s personal details; cruelty to animals. We can remove content and close accounts that break these rules. You can report a thread from its page.</p>

          <h2>Meeting other members</h2>
          <p>GRRRR helps pets and their owners meet. We do not check who members are. Meet in a public place the first time, and keep your pet under control: each owner is responsible for their own animal.</p>

          <h2>Adoption, buying and giving</h2>
          <ul>
            <li>Grr only puts people in touch. We are not a party to any adoption, sale or gift, we take no payment for them, and we do not check the animals, their health or the people involved.</li>
            <li>Whoever gives, sells or adopts an animal must follow the law that applies to them. In France this includes identifying the animal (chip or tattoo), a veterinary certificate, the certificate of commitment and knowledge for a first adoption, the minimum age of eight weeks for puppies and kittens, and the rules reserved for breeders when animals are sold.</li>
            <li>Listings for species that cannot legally be kept or traded are forbidden.</li>
            <li>See the animal and its papers before any decision, and never pay in advance to someone you have not met.</li>
          </ul>

          <h2>Health information and the assistant</h2>
          <p>The guides, the health score and GRRR, the AI assistant, give general information. They do not replace a veterinarian and are not a diagnosis. The assistant can be wrong. If your animal seems unwell or in an emergency, contact a vet.</p>

          <h2>Partners</h2>
          <p>Vets, shops and other partners shown in the apps are independent businesses. We are not responsible for their services.</p>

          <h2>Care+ and purchases</h2>
          <p>Care+ is not on sale yet. The free month given by the daily gifts adds no charge and renews nothing. When paid offers open, their price and conditions will be shown before any purchase.</p>

          <h2>Availability and liability</h2>
          <p>We do our best to keep Grr working and safe, but it is provided as it is, without a guarantee that it will never stop or be free of errors. As far as the law allows, we are not liable for dealings between members, or for decisions taken from the information in Grr.</p>

          <h2>Law</h2>
          <p>These terms are governed by French law. If you are a consumer, the mandatory protections of the country where you live still apply. Write to us first: most things are settled by an e-mail.</p>
        </div>
      </article>
      <SiteFooter />
    </main>
  )
}
