import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/supabase/server'
import { Analyst } from './analyst'
import styles from './dashboard.module.css'

// The admins' view of the whole ecosystem: what people do in GRRRR, GRRR Care, the store and with
// the partners. Every number comes from what the apps already store (Care migration 027,
// admin_dashboard): nothing is tracked for it.

export const dynamic = 'force-dynamic' // depends on who is signed in, and always fresh
export const metadata: Metadata = { title: 'Tableau de bord — Grr', robots: { index: false, follow: false } }

type Alert = { level: 'critical' | 'warning' | 'info'; key: string; title: string; detail: string }
const ALERT_LABEL = { critical: 'À réparer', warning: 'À regarder', info: 'Bon à savoir' } as const

type Series = number[]
type Labelled = { label: string; value: number }
type Dashboard = {
  generatedAt: string
  days: number
  accounts: { total: number; new: Series; signIns: Series; active7: number; active30: number; cameBack: number; google: number; phones: { grrrr: number; care: number }; funnel: Labelled[] }
  pets: { total: number; new: Series; species: Labelled[] }
  grrrr: { likes: Series; matches: Series; messages: Series; outings: Series; totals: Record<string, number> }
  care: { records: { vaccinations: Series; medications: Series; visits: Series; plan: Series }; assistant: Series; games: Series; totals: Record<string, number> }
  store: { orders: Series; revenue: Series; totals: Record<string, number>; top: Labelled[] }
  rewards: { claims: Series; given: Labelled[]; givenTotal: number; spentTotal: number; bought: number; bestStreak: number }
  partners: { places: number; partners: number; invites: Record<string, number>; applications: number; products: Record<string, number>; answers: Series }
  community: { threads: number; comments: number; members: number; newThreads: Series }
}

const PERIODS = [7, 30, 90] as const

const SPECIES: Record<string, string> = { dog: 'Chiens', cat: 'Chats', rabbit: 'Lapins', bird: 'Oiseaux', horse: 'Chevaux', hamster: 'Hamsters', rat: 'Rats', turtle: 'Tortues', fish: 'Poissons' }
const REASONS: Record<string, string> = { match: 'Matchs', daily: 'Cadeaux du jour', outing: 'Sorties' }
const INVITES: [string, string][] = [['sent', 'Envoyées'], ['pending', 'À envoyer'], ['accepted', 'Acceptées'], ['declined', 'Refusées'], ['skipped', 'Écartées']]
const PRODUCTS: [string, string][] = [['pending', 'À valider'], ['published', 'En ligne'], ['rejected', 'Refusés']]

const number = (value: number) => Math.round(value).toLocaleString('fr-FR')
const euros = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
/** "1 joueur", "3 joueurs" */
const count = (n: number, one: string, many: string) => <><strong>{number(n)}</strong> {n > 1 ? many : one}</>
const sum = (series: Series) => series.reduce((a, b) => a + b, 0)
const add = (...all: Series[]) => all[0].map((_, i) => all.reduce((total, series) => total + (series[i] ?? 0), 0))

/** The last 7 days against the 7 before: "+3" or "−2", null when both are empty */
function trend(series: Series) {
  const last = sum(series.slice(-7))
  const before = sum(series.slice(-14, -7))
  if (last === 0 && before === 0) return null
  return { last, change: last - before }
}

/** A small area chart of a daily series, drawn to scale (0 at the bottom, the highest day at the top) */
function Spark({ series, color }: { series: Series; color: string }) {
  const max = Math.max(1, ...series)
  const w = 120
  const h = 34
  const step = series.length > 1 ? w / (series.length - 1) : w
  const points = series.map((value, i) => [i * step, h - 2 - (value / max) * (h - 6)] as const)
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [lx, ly] = points[points.length - 1] ?? [0, h]
  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={color} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.2" fill={color} />
    </svg>
  )
}

/** One number: its total, what the period added, its curve and the week's change */
function Metric({ label, total, series, color, hint }: { label: string; total: number | string; series?: Series; color: string; hint?: string }) {
  const t = series ? trend(series) : null
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{typeof total === 'number' ? number(total) : total}</strong>
      {series && <Spark series={series} color={color} />}
      <span className={styles.metricFoot}>
        {series ? <>{number(sum(series))} sur la période</> : hint}
        {t && <em className={t.change > 0 ? styles.up : t.change < 0 ? styles.down : styles.flat}>{t.change > 0 ? '▲' : t.change < 0 ? '▼' : '='} {t.change > 0 ? '+' : ''}{number(t.change)} vs sem. préc.</em>}
      </span>
    </div>
  )
}

/** A ranked list with bars to scale */
function Bars({ items, color, format = number }: { items: Labelled[]; color: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((item) => item.value))
  if (!items.length) return <p className={styles.empty}>Rien pour l’instant.</p>
  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}><span style={{ width: `${(item.value / max) * 100}%`, background: color }} /></span>
          <span className={styles.barValue}>{format(item.value)}</span>
        </li>
      ))}
    </ul>
  )
}

function Section({ logo, title, subtitle, color, children, wide }: { logo: string; title: string; subtitle: string; color: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`${styles.section} ${wide ? styles.wide : ''}`} style={{ ['--accent' as string]: color }}>
      <header className={styles.sectionHead}>
        <img src={logo} alt="" width={40} height={40} className={styles.logo} />
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ jours?: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login?next=/dashboard')
  if (profile.role !== 'admin') notFound()

  const { jours } = await searchParams
  const days = PERIODS.find((p) => String(p) === jours) ?? 30

  if (!adminConfigured()) {
    return <main className={styles.page}><p className={styles.empty}>Le serveur n’a pas encore sa clé Supabase (SUPABASE_SECRET_KEY) : le tableau de bord ne peut pas lire les chiffres.</p></main>
  }
  const db = createAdminClient()
  const [{ data, error }, { data: alertData }, { data: reviewData }] = await Promise.all([
    db.rpc('admin_dashboard', { p_days: days }),
    db.rpc('admin_alerts'),
    db.rpc('admin_pet_queue', { p_mode: 'review', p_limit: 300 }),
  ])
  const toReview = Array.isArray(reviewData) ? reviewData.length : 0
  const order = { critical: 0, warning: 1, info: 2 }
  const alerts = ((alertData ?? []) as Alert[]).sort((a, b) => order[a.level] - order[b.level])
  if (error || !data) {
    return <main className={styles.page}><p className={styles.empty}>Les chiffres n’ont pas pu être lus : {error?.message ?? 'réponse vide'}.</p></main>
  }
  const d = data as Dashboard

  const funnelTop = Math.max(1, d.accounts.funnel[0]?.value ?? 1)
  const careRecords = add(d.care.records.vaccinations, d.care.records.medications, d.care.records.visits, d.care.records.plan)
  const updated = new Date(d.generatedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.top}>
          <div>
            <Link href="/" className={styles.brand}><img src="/dashboard/grr.png" alt="" width={28} height={28} /> Grr</Link>
            <h1>Tableau de bord</h1>
            <p className={styles.lede}>GRRRR, GRRR Care, la boutique et les partenaires, d’après ce que les apps enregistrent. Mis à jour le {updated}.</p>
          </div>
          <Link href="/dashboard/moderation" className={styles.modLink}>🛡️ Modération des profils{toReview > 0 && <strong>{toReview} à revoir</strong>}</Link>
          <nav className={styles.periods} aria-label="Période">
            {PERIODS.map((p) => (
              <Link key={p} href={`/dashboard?jours=${p}`} className={p === days ? styles.periodOn : styles.period} aria-current={p === days ? 'page' : undefined}>{p} jours</Link>
            ))}
          </nav>
        </header>

        {/* What needs attention, found in the data (Care migration 028); also emailed each morning */}
        <section className={styles.alerts} aria-label="Alertes">
          {alerts.length === 0 ? (
            <p className={styles.allGood}>✓ Rien à signaler : aucune alerte dans les données.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.key} className={`${styles.alert} ${styles[alert.level]}`}>
                <span className={styles.alertLevel}>{ALERT_LABEL[alert.level]}</span>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </div>
            ))
          )}
        </section>

        {/* What matters first */}
        <div className={styles.kpis}>
          <Metric label="Comptes" total={d.accounts.total} series={d.accounts.new} color="#5B6472" />
          <Metric label="Actifs cette semaine" total={d.accounts.active7} series={d.accounts.signIns} color="#5B6472" />
          <Metric label="Compagnons" total={d.pets.total} series={d.pets.new} color="#5B6472" />
          <Metric label="Revenus (croquettes achetées)" total={euros(d.store.totals.revenueCents ?? 0)} series={d.store.revenue.map((c) => c / 100)} color="#5B6472" />
        </div>

        <div className={styles.grid}>
          <Section logo="/dashboard/grr.png" title="Analyste" subtitle="Pose une question sur tes données : Claude interroge la base (sans données personnelles) et te répond chiffres à l’appui" color="#1C2027" wide>
            <Analyst />
          </Section>

          <Section logo="/dashboard/grr.png" title="Du compte à la conversation" subtitle="Combien passent chaque étape" color="#5B6472" wide>
            <ol className={styles.funnel}>
              {d.accounts.funnel.map((step, i) => (
                <li key={step.label}>
                  <span className={styles.funnelBar} style={{ width: `${Math.max(4, (step.value / funnelTop) * 100)}%` }} />
                  <span className={styles.funnelText}><strong>{number(step.value)}</strong> {step.label}{i > 0 && <em>{Math.round((step.value / funnelTop) * 100)} %</em>}</span>
                </li>
              ))}
            </ol>
            <div className={styles.facts}>
              <span>{count(d.accounts.cameBack, "est revenu", "sont revenus")} après leur 1er jour</span>
              <span>{count(d.accounts.google, "compte Google", "comptes Google")}</span>
              <span>{count(d.accounts.phones.grrrr, "téléphone", "téléphones")} avec GRRRR · <strong>{number(d.accounts.phones.care)}</strong> avec Care</span>
            </div>
          </Section>

          <Section logo="/dashboard/grrrr.png" title="GRRRR" subtitle="Rencontres entre compagnons" color="#FF5D73">
            <div className={styles.metrics}>
              <Metric label="Likes" total={d.grrrr.totals.likes} series={d.grrrr.likes} color="#FF5D73" />
              <Metric label="Matchs" total={d.grrrr.totals.matches} series={d.grrrr.matches} color="#FF5D73" />
              <Metric label="Messages" total={d.grrrr.totals.messages} series={d.grrrr.messages} color="#FF5D73" />
              <Metric label="Sorties proposées" total={d.grrrr.totals.outingsProposed} series={d.grrrr.outings} color="#FF5D73" />
            </div>
            <div className={styles.facts}>
              <span>{count(d.grrrr.totals.outingsAccepted, "sortie acceptée", "sorties acceptées")}</span>
              <span>{count(d.grrrr.totals.onMap, "compagnon", "compagnons")} sur la carte (7 j)</span>
              <span>{count(d.grrrr.totals.adoptionRequests, "demande d’adoption", "demandes d’adoption")}</span>
            </div>
          </Section>

          <Section logo="/dashboard/care.png" title="GRRR Care" subtitle="Santé et assistant" color="#2563EB">
            <div className={styles.metrics}>
              <Metric label="Ajouts au carnet" total={d.care.totals.vaccinations + d.care.totals.medications + d.care.totals.visits} series={careRecords} color="#2563EB" />
              <Metric label="Questions à l’assistant" total={d.care.totals.questions} series={d.care.assistant} color="#2563EB" />
              <Metric label="Parties du jeu" total={d.care.totals.games} series={d.care.games} color="#2563EB" />
              <Metric label="Rappels envoyés" total={d.care.totals.remindersSent} color="#2563EB" hint="vaccins, soins, anniversaires…" />
            </div>
            <div className={styles.facts}>
              <span>{count(d.care.totals.petsFollowed, "compagnon", "compagnons")} avec un carnet</span>
              <span>{count(d.care.totals.wandPets, "a utilisé", "ont utilisé")} la baguette</span>
              <span>{count(d.care.totals.documents, "document", "documents")}</span>
              <span>{count(d.care.totals.players, "joueur", "joueurs")}</span>
              <span>{count(d.care.totals.reports, "réponse signalée", "réponses signalées")}</span>
            </div>
          </Section>

          <Section logo="/dashboard/store.png" title="Boutique" subtitle="Commandes en croquettes" color="#E8457A">
            <div className={styles.metrics}>
              <Metric label="Commandes" total={d.store.totals.orders} series={d.store.orders} color="#E8457A" />
              <Metric label="Croquettes dépensées" total={d.store.totals.croquettesSpent} color="#E8457A" hint="dans la boutique" />
              <Metric label="Achats de croquettes" total={d.store.totals.purchases} color="#E8457A" hint={euros(d.store.totals.revenueCents ?? 0)} />
            </div>
            <h3 className={styles.subhead}>Les plus commandés</h3>
            <Bars items={d.store.top} color="#E8457A" />
          </Section>

          <Section logo="/dashboard/croquette.png" title="Croquettes" subtitle="Ce qui est donné, acheté et dépensé" color="#D9822B">
            <Bars
              items={[{ label: 'Données gratuitement', value: d.rewards.givenTotal }, { label: 'Achetées', value: d.rewards.bought }, { label: 'Dépensées', value: d.rewards.spentTotal }]}
              color="#D9822B"
            />
            <h3 className={styles.subhead}>Données par…</h3>
            <Bars items={d.rewards.given.map((g) => ({ label: REASONS[g.label] ?? g.label, value: g.value }))} color="#E9B07A" />
            <div className={styles.metrics}>
              <Metric label="Cadeaux du jour récupérés" total={sum(d.rewards.claims)} series={d.rewards.claims} color="#D9822B" />
              <Metric label="Meilleure série" total={`${d.rewards.bestStreak} j`} color="#D9822B" hint="jours d’affilée" />
            </div>
          </Section>

          <Section logo="/dashboard/care.png" title="Partenaires" subtitle="Lieux, invitations, produits" color="#0F9F8F">
            <div className={styles.metrics}>
              <Metric label="Lieux sur la carte" total={d.partners.places} color="#0F9F8F" hint="France et Maroc" />
              <Metric label="Partenaires" total={d.partners.partners} color="#0F9F8F" hint={`${d.partners.applications} candidatures`} />
            </div>
            <h3 className={styles.subhead}>Invitations</h3>
            <Bars items={INVITES.filter(([k]) => d.partners.invites[k]).map(([k, l]) => ({ label: l, value: d.partners.invites[k] }))} color="#0F9F8F" />
            <h3 className={styles.subhead}>Produits proposés</h3>
            <Bars items={PRODUCTS.filter(([k]) => d.partners.products[k]).map(([k, l]) => ({ label: l, value: d.partners.products[k] }))} color="#5CC8BC" />
          </Section>

          <Section logo="/dashboard/grr.png" title="Compagnons" subtitle="Les espèces des comptes" color="#5B6472">
            <Bars items={d.pets.species.map((s) => ({ label: SPECIES[s.label] ?? s.label, value: s.value }))} color="#8A93A1" />
          </Section>

          <Section logo="/dashboard/grr.png" title="Communauté" subtitle="Le site greatrascals.com" color="#E86F52">
            <div className={styles.metrics}>
              <Metric label="Fils de discussion" total={d.community.threads} series={d.community.newThreads} color="#E86F52" />
              <Metric label="Commentaires" total={d.community.comments} color="#E86F52" hint={`${number(d.community.members)} membres`} />
            </div>
          </Section>
        </div>

        <footer className={styles.footer}>
          Les défis relevés sur l’accueil de Care restent sur les téléphones : ils n’apparaissent pas ici. Les profils de démonstration (bots) sont écartés des likes et des messages.
        </footer>
      </div>
    </main>
  )
}
