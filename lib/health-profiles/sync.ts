import { writeClient } from '../sanity/client'
import { createAdminClient } from '../supabase/admin'

// ---- Studio shape (what editors fill in) ----
type Text = { en?: string; fr?: string }
type StudioRule = {
  _key: string; type: string; source?: string; field?: string; withinDays?: number; graceDays?: number
  reviewSource?: string; match?: string; optional?: boolean; weight?: number; advice?: Text; ruleId?: { current?: string }
}
type StudioProfile = {
  _id: string; species: string; ageGroup: string; label?: Text; minAgeMonths?: number; maxAgeMonths?: number | null; minCoverage?: number
  categories?: { _key: string; key: string; label?: Text; weightPercent?: number; rules?: StudioRule[] }[]
  status?: 'provisional' | 'validated'; validatedBy?: string; validatedAt?: string
}

// ---- App shape (GRRR Care scoring engine, table public.health_profiles) ----
type EngineRule = Record<string, unknown> & { id: string; type: string; advice: { en: string; fr: string } }
type EngineProfile = {
  id: string; species: string; age_group: string; label: { en: string; fr: string }; min_age_months: number; max_age_months: number | null
  min_coverage: number; status: 'provisional' | 'validated'; validated_by: string | null; validated_at: string | null
  categories: { key: string; label: { en: string; fr: string }; weight: number; rules: EngineRule[] }[]
}

const bi = (t?: Text) => ({ en: t?.en ?? t?.fr ?? '', fr: t?.fr ?? t?.en ?? '' })
const compact = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as T
const profileId = (species: string, ageGroup: string) => `${species}-${ageGroup}`

export function toEngineProfile(p: StudioProfile): EngineProfile {
  return {
    id: profileId(p.species, p.ageGroup),
    species: p.species,
    age_group: p.ageGroup,
    label: bi(p.label),
    min_age_months: p.minAgeMonths ?? 0,
    max_age_months: p.maxAgeMonths ?? null,
    min_coverage: (p.minCoverage ?? 50) / 100,
    status: p.status ?? 'provisional',
    validated_by: p.validatedBy ?? null,
    validated_at: p.validatedAt ?? null,
    categories: (p.categories ?? []).map((c) => ({
      key: c.key,
      label: bi(c.label),
      weight: (c.weightPercent ?? 0) / 100,
      rules: (c.rules ?? []).map((r) => compact({
        id: r.ruleId?.current || r._key,
        type: r.type,
        source: r.type === 'pet_field' ? undefined : r.source,
        field: r.type === 'pet_field' ? r.field : undefined,
        within_days: r.withinDays,
        grace_days: r.graceDays,
        review_source: r.type === 'review_when_active' ? r.reviewSource ?? 'vet_visits' : undefined,
        match: r.match?.trim() || undefined,
        optional: r.optional || undefined,
        weight: r.weight != null && r.weight !== 1 ? r.weight : undefined,
        advice: bi(r.advice),
      }) as EngineRule),
    })),
  }
}

/** Refuses anything the app's engine could not score correctly. */
function assertValid(p: EngineProfile) {
  const total = p.categories.reduce((s, c) => s + c.weight, 0)
  if (Math.abs(total - 1) > 0.001) throw new Error(`${p.id}: category weights add up to ${Math.round(total * 100)}%, not 100%.`)
  for (const c of p.categories) {
    if (c.rules.length === 0) throw new Error(`${p.id}: category "${c.key}" has no rules.`)
    for (const r of c.rules) if (typeof r.match === 'string') new RegExp(r.match, 'i') // throws on an invalid filter
  }
}

const PROFILE_QUERY = `*[_type == "healthProfile" && _id == $id][0]`

/** Published → upserted in Supabase (the app picks it up); unpublished or deleted → removed. */
export async function syncHealthProfile(documentId: string) {
  const id = documentId.replace(/^drafts\./, '')
  const doc = await writeClient().fetch<StudioProfile | null>(PROFILE_QUERY, { id })
  const supabase = createAdminClient()
  if (!doc) {
    const { error } = await supabase.from('health_profiles').delete().eq('sanity_id', id)
    if (error) throw new Error(error.message)
    return { id, action: 'removed' as const }
  }
  const row = toEngineProfile(doc)
  assertValid(row)
  // A profile renamed in the Studio (species/age group changed) must not leave its old row behind.
  await supabase.from('health_profiles').delete().eq('sanity_id', id).neq('id', row.id)
  const { error } = await supabase.from('health_profiles').upsert({ ...row, sanity_id: id, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  return { id, action: 'upserted' as const, profile: row.id, status: row.status }
}

export async function syncAllHealthProfiles() {
  const ids = await writeClient().fetch<string[]>(`*[_type == "healthProfile" && !(_id in path("drafts.**"))]._id`)
  const results = []
  for (const id of ids) results.push(await syncHealthProfile(id))
  return { synced: results.length }
}

/** One-off: copies the profiles already in Supabase (seeded by the app's migration) into the Studio, as published documents. */
export async function importHealthProfilesFromSupabase() {
  const { data, error } = await createAdminClient().from('health_profiles').select('*')
  if (error) throw new Error(`${error.message} — did you run the app's migration 013_health_profiles.sql?`)
  const tx = writeClient().transaction()
  let created = 0
  for (const p of (data ?? []) as EngineProfile[]) {
    const _id = `healthProfile-${p.id}`
    tx.createIfNotExists({
      _id,
      _type: 'healthProfile',
      species: p.species,
      ageGroup: p.age_group,
      label: p.label,
      minAgeMonths: p.min_age_months,
      maxAgeMonths: p.max_age_months ?? undefined,
      minCoverage: Math.round(Number(p.min_coverage ?? 0.5) * 100),
      status: p.status,
      validatedBy: p.validated_by ?? undefined,
      validatedAt: p.validated_at ?? undefined,
      categories: p.categories.map((c, i) => ({
        _key: `${c.key}-${i}`,
        _type: 'healthCategory',
        key: c.key,
        label: c.label,
        weightPercent: Math.round(c.weight * 1000) / 10,
        rules: c.rules.map((r, j) => ({
          _key: `${r.id}-${j}`.replace(/[^a-zA-Z0-9_-]/g, ''),
          _type: 'healthRule',
          ruleId: { _type: 'slug', current: r.id },
          type: r.type,
          source: r.source,
          field: r.field,
          withinDays: r.within_days,
          graceDays: r.grace_days,
          reviewSource: r.review_source,
          match: r.match,
          optional: r.optional,
          weight: r.weight ?? 1,
          advice: r.advice,
        })),
      })),
    })
    created++
  }
  await tx.commit()
  // Link the existing rows to their Studio documents.
  for (const p of (data ?? []) as EngineProfile[]) {
    await createAdminClient().from('health_profiles').update({ sanity_id: `healthProfile-${p.id}` }).eq('id', p.id).is('sanity_id', null)
  }
  return { imported: created }
}
