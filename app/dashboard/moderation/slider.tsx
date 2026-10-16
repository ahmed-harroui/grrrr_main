'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../dashboard.module.css'
import { approvePet, banPet, checkHidden, unbanPet, type BanReason } from './actions'

export type QueuePet = {
  id: string
  name: string | null
  species: string | null
  breed: string | null
  gender: string | null
  age: number | null
  city: string | null
  bio: string | null
  photo: string | null
  photos: string[] | null
  tags: string[] | null
  createdAt: string
  ownerSince: string | null
  ownerPets: number
  adopterOnly: boolean
  bannedAt: string | null
  bannedReason: string | null
  reviewRequestedAt: string | null
  flagged: boolean
  reasons: string[]
  score: number
  words: string[]
  suggested: BanReason | null
}

// What happened to each profile during this visit (the list itself does not reload)
type Status =
  | { kind: 'working'; text: string }
  | { kind: 'banned'; reason: BanReason; check?: { visible: boolean; mine: boolean } }
  | { kind: 'shown' }
  | { kind: 'approved' }
  | { kind: 'error'; text: string }

const REASONS: { key: BanReason; label: string }[] = [
  { key: 'person_name', label: 'Nom d’une personne' },
  { key: 'insult', label: 'Mot insultant ou déplacé' },
  { key: 'photo', label: 'Photo inappropriée' },
  { key: 'other', label: 'Autre règle' },
]
const REASON_LABEL: Record<string, string> = Object.fromEntries(REASONS.map((r) => [r.key, r.label]))

// What the automatic check found (GRRRR migration 031): the strong ones put the profile in "À revoir"
const DETECTED: Record<string, { label: string; strong: boolean }> = {
  insult: { label: 'Insulte ou mot déplacé', strong: true },
  person_name: { label: 'Prénom d’une personne', strong: true },
  owner_name: { label: 'Porte le nom de son propriétaire', strong: true },
  contact: { label: 'Coordonnées ou lien dans le texte', strong: true },
  fake_name: { label: 'Faux nom (test, clavier)', strong: true },
  example_photo: { label: 'Photo d’exemple de l’app', strong: false },
  no_photo: { label: 'Sans photo', strong: false },
  no_bio: { label: 'Sans description', strong: false },
}

const SPECIES: Record<string, string> = {
  dog: '🐶 Chien', cat: '🐱 Chat', rabbit: '🐰 Lapin', bird: '🐦 Oiseau', hamster: '🐹 Hamster', horse: '🐴 Cheval',
  turtle: '🐢 Tortue', fish: '🐟 Poisson', rat: '🐀 Rat', other: '🐾 Autre',
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export function Slider({ pets, mode }: { pets: QueuePet[]; mode: string }) {
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [choosing, setChoosing] = useState(false)
  const [photo, setPhoto] = useState(0)

  const go = useCallback((step: number) => {
    setIndex((i) => Math.min(Math.max(i + step, 0), Math.max(pets.length - 1, 0)))
    setChoosing(false)
    setPhoto(0)
  }, [pets.length])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'Escape') setChoosing(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (pets.length === 0) {
    return (
      <p className={styles.allGood}>
        {mode === 'banned' ? 'Aucun profil masqué.' : mode === 'review' ? '✓ Rien à revoir : aucun profil modifié ni signalé.' : 'Aucun compagnon pour le moment.'}
      </p>
    )
  }

  const pet = pets[index]
  const state = status[pet.id]
  const set = (s: Status) => setStatus((all) => ({ ...all, [pet.id]: s }))
  const banned = state?.kind === 'banned' || (Boolean(pet.bannedAt) && state?.kind !== 'shown')
  const pictures = [pet.photo, ...(pet.photos ?? [])].filter((p, i, all): p is string => Boolean(p) && all.indexOf(p) === i)
  const picture = pictures[Math.min(photo, pictures.length - 1)]

  const ban = async (reason: BanReason) => {
    setChoosing(false)
    set({ kind: 'working', text: 'Masquage et envoi du message…' })
    try {
      await banPet(pet.id, reason)
      set({ kind: 'banned', reason })
      // The proof: read the profile again the way any signed-in account of the apps does
      const check = await checkHidden(pet.id)
      set({ kind: 'banned', reason, check })
    } catch (error) {
      set({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }
  const show = async () => {
    set({ kind: 'working', text: 'Rétablissement…' })
    try {
      await unbanPet(pet.id)
      set({ kind: 'shown' })
    } catch (error) {
      set({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }
  const approve = async () => {
    set({ kind: 'working', text: 'Validation…' })
    try {
      await approvePet(pet.id)
      set({ kind: 'approved' })
      go(1)
    } catch (error) {
      set({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }

  const done = Object.values(status).filter((s) => s.kind === 'banned' || s.kind === 'approved').length

  return (
    <div className={styles.modWrap}>
      <div className={styles.modBar}>
        <button type="button" className={styles.clear} onClick={() => go(-1)} disabled={index === 0} aria-label="Profil précédent">←</button>
        <span className={styles.modCount}>{index + 1} / {pets.length}{done > 0 && <em> · {done} traité{done > 1 ? 's' : ''}</em>}</span>
        <button type="button" className={styles.clear} onClick={() => go(1)} disabled={index === pets.length - 1} aria-label="Profil suivant">→</button>
      </div>

      <article className={`${styles.modCard} ${banned ? styles.modCardBanned : ''}`}>
        <div className={styles.modPhoto}>
          {picture ? <img src={picture} alt={`Photo de ${pet.name ?? 'ce compagnon'}`} /> : <span className={styles.modNoPhoto}>Pas de photo</span>}
          {pictures.length > 1 && (
            <div className={styles.modDots}>
              {pictures.map((p, i) => (
                <button key={p} type="button" aria-label={`Photo ${i + 1}`} aria-pressed={i === photo} onClick={() => setPhoto(i)} />
              ))}
            </div>
          )}
          {banned && <span className={styles.modStamp}>Masqué</span>}
        </div>

        <div className={styles.modBody}>
          <div className={styles.modBadges}>
            {(pet.reasons ?? []).map((r) => (
              <span key={r} className={DETECTED[r]?.strong ? styles.modFlag : styles.modInfo}>{DETECTED[r]?.label ?? r}</span>
            ))}
            {pet.reviewRequestedAt && <span className={styles.modReview}>Modifié après masquage · {day(pet.reviewRequestedAt)}</span>}
            {pet.bannedAt && state?.kind !== 'shown' && <span className={styles.modBan}>Masqué le {day(pet.bannedAt)} · {REASON_LABEL[pet.bannedReason ?? ''] ?? pet.bannedReason}</span>}
            {pet.adopterOnly && <span className={styles.modInfo}>Profil adoptant</span>}
          </div>
          <h2 className={styles.modName}>{pet.name || <em>Sans nom</em>}</h2>
          <p className={styles.modMeta}>
            {[SPECIES[pet.species ?? ''] ?? pet.species, pet.breed, pet.age != null ? (pet.age < 1 ? 'moins d’un an' : `${pet.age} an${pet.age > 1 ? 's' : ''}`) : null, pet.gender === 'M' ? 'Mâle' : pet.gender === 'F' ? 'Femelle' : null, pet.city]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {pet.words?.length > 0 && <p className={styles.modWords}>Mots trouvés : {pet.words.map((w) => <mark key={w}>{w}</mark>)}</p>}
          <p className={styles.modBio}>{pet.bio?.trim() || <em>Pas de description.</em>}</p>
          {pet.tags && pet.tags.length > 0 && (
            <div className={styles.facts}>{pet.tags.map((t) => <span key={t}>{t}</span>)}</div>
          )}
          <p className={styles.modOwner}>
            Profil créé le {day(pet.createdAt)} · compte depuis le {day(pet.ownerSince)} · {pet.ownerPets} compagnon{pet.ownerPets > 1 ? 's' : ''} sur ce compte
          </p>

          <div className={styles.modActions}>
            {banned ? (
              <button type="button" className={styles.clear} onClick={show} disabled={state?.kind === 'working'}>Rétablir dans Découvrir</button>
            ) : (
              <>
                <button type="button" className={styles.askButton} onClick={approve} disabled={state?.kind === 'working'}>✓ OK, suivant</button>
                <button type="button" className={styles.modBanButton} onClick={() => setChoosing((c) => !c)} disabled={state?.kind === 'working'} aria-expanded={choosing}>
                  🚫 Masquer de Découvrir
                </button>
              </>
            )}
          </div>

          {choosing && !banned && (
            <div className={styles.modReasons} role="group" aria-label="Raison">
              <span className={styles.subhead}>Pourquoi ? Le propriétaire reçoit ce motif dans son message.</span>
              <div className={styles.ideas}>
                {REASONS.map((r) => (
                  <button key={r.key} type="button" onClick={() => void ban(r.key)} className={r.key === pet.suggested ? styles.modSuggested : undefined}>
                    {r.label}{r.key === pet.suggested && ' · suggéré'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state?.kind === 'working' && <p className={styles.thinking}>{state.text}</p>}
          {state?.kind === 'error' && <p className={styles.problem}>{state.text}</p>}
          {state?.kind === 'shown' && <p className={styles.modOk}>✓ Rétabli : il réapparaît dans Découvrir.</p>}
          {state?.kind === 'approved' && <p className={styles.modOk}>✓ Validé.</p>}
          {state?.kind === 'banned' && (
            <div className={styles.modResult}>
              <p className={styles.modOk}>✓ Masqué ({REASON_LABEL[state.reason]}) : message envoyé à son propriétaire.</p>
              {!state.check ? (
                <p className={styles.thinking}>Vérification de l’affichage…</p>
              ) : state.check.mine ? (
                <p className={styles.empty}>C’est un de tes compagnons : tu le vois toujours, comme tout propriétaire voit le sien.</p>
              ) : state.check.visible ? (
                <p className={styles.problem}>⚠️ Il est encore visible pour un compte connecté. Préviens-moi.</p>
              ) : (
                <p className={styles.modOk}>✓ Vérifié : un compte connecté ne le voit plus (Découvrir, likes, matchs, carte).</p>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
