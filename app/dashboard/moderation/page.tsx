import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/supabase/server'
import styles from '../dashboard.module.css'
import { Slider, type QueuePet } from './slider'

// Pet moderation (GRRRR migration 030): the profiles one by one, like Discover in the app.
// A hidden pet leaves Discover, likes, matches, the map and adoptions; its owner gets a message.

export const metadata: Metadata = { title: 'Modération', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const MODES = [
  { key: 'review', label: 'À revoir' },
  { key: 'all', label: 'Tous' },
  { key: 'banned', label: 'Masqués' },
] as const
type Mode = (typeof MODES)[number]['key']

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login?next=/dashboard/moderation')
  if (profile.role !== 'admin') notFound()

  const { vue } = await searchParams
  const mode: Mode = MODES.find((m) => m.key === vue)?.key ?? 'review'

  if (!adminConfigured()) {
    return <main className={styles.page}><p className={styles.empty}>Le serveur n’a pas encore sa clé Supabase (SUPABASE_SECRET_KEY).</p></main>
  }
  const db = createAdminClient()
  const results = await Promise.all(MODES.map((m) => db.rpc('admin_pet_queue', { p_mode: m.key, p_limit: 300 })))
  const lists = Object.fromEntries(MODES.map((m, i) => [m.key, (results[i].data ?? []) as QueuePet[]])) as Record<Mode, QueuePet[]>
  const error = results.find((r) => r.error)?.error

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.top}>
          <div>
            <Link href="/dashboard" className={styles.brand}><img src="/dashboard/grrrr.png" alt="" width={28} height={28} /> ← Tableau de bord</Link>
            <h1>Modération des profils</h1>
            <p className={styles.lede}>
              Les compagnons un par un. Masquer un profil le retire de Découvrir, des likes, des matchs, de la carte et des adoptions ;
              le compte reste actif et son propriétaire reçoit un message lui demandant de changer le nom, la photo ou la description,
              ou de créer un nouveau compagnon. Dès qu’il modifie le profil, celui-ci réapparaît ici, dans « À revoir ».
            </p>
          </div>
          <nav className={styles.periods} aria-label="Vue">
            {MODES.map((m) => (
              <Link key={m.key} href={`/dashboard/moderation?vue=${m.key}`} className={m.key === mode ? styles.periodOn : styles.period} aria-current={m.key === mode ? 'page' : undefined}>
                {m.label} · {lists[m.key].length}
              </Link>
            ))}
          </nav>
        </header>

        {error ? (
          <p className={styles.problem}>La liste n’a pas pu être lue : {error.message}.</p>
        ) : (
          <Slider key={mode} pets={lists[mode]} mode={mode} />
        )}

        <p className={styles.footer}>
          Détection automatique : insultes (français, anglais, darija), prénoms de personnes, nom du propriétaire, coordonnées ou liens,
          faux noms (test, lettres répétées), photo d’exemple, profil vide. « À revoir » : les profils suspects et ceux modifiés après un
          masquage ; « Tous » : tous les profils, du plus suspect au moins suspect. Mots modifiables dans la table moderation_words.
          Raccourcis : ← → pour passer d’un profil à l’autre.
        </p>
      </div>
    </main>
  )
}
