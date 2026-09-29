import { HeartIcon } from '@sanity/icons/Heart'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { CATEGORY_KEYS, PET_FIELDS, RECORD_SOURCES, RULE_TYPES } from '../../lib/health-profiles/constants'

type RuleParent = { type?: string } | undefined
const bilingual = (name: string, title: string, rows = 1, group?: string) =>
  defineField({
    name,
    title,
    ...(group ? { group } : {}),
    type: 'object',
    options: { columns: 2 },
    fields: [
      defineField({ name: 'fr', title: 'Français', type: rows > 1 ? 'text' : 'string', ...(rows > 1 ? { rows } : {}), validation: (r) => r.required() }),
      defineField({ name: 'en', title: 'English', type: rows > 1 ? 'text' : 'string', ...(rows > 1 ? { rows } : {}), validation: (r) => r.required() }),
    ],
  })

const rule = defineArrayMember({
  name: 'healthRule',
  title: 'Règle',
  type: 'object',
  fields: [
    defineField({ name: 'type', title: 'Type de règle', type: 'string', options: { list: RULE_TYPES, layout: 'radio' }, validation: (r) => r.required() }),
    defineField({ name: 'source', title: 'Données regardées', type: 'string', options: { list: RECORD_SOURCES },
      hidden: ({ parent }) => (parent as RuleParent)?.type === 'pet_field',
      validation: (r) => r.custom((v, ctx) => (ctx.parent as RuleParent)?.type === 'pet_field' || Boolean(v) || 'Choisis les données regardées.') }),
    defineField({ name: 'field', title: 'Champ du profil', type: 'string', options: { list: PET_FIELDS },
      hidden: ({ parent }) => (parent as RuleParent)?.type !== 'pet_field',
      validation: (r) => r.custom((v, ctx) => (ctx.parent as RuleParent)?.type !== 'pet_field' || Boolean(v) || 'Choisis le champ.') }),
    defineField({ name: 'withinDays', title: 'Délai (jours)', type: 'number', description: 'Ex. 365 = au moins une fois par an.',
      hidden: ({ parent }) => !['recent', 'review_when_active'].includes((parent as RuleParent)?.type ?? ''),
      validation: (r) => r.min(1).integer() }),
    defineField({ name: 'graceDays', title: 'Tolérance (jours)', type: 'number', description: 'Au-delà du délai, les points diminuent progressivement pendant ce nombre de jours (0 = tout ou rien).',
      hidden: ({ parent }) => !['recent', 'not_overdue'].includes((parent as RuleParent)?.type ?? ''),
      validation: (r) => r.min(0).integer() }),
    defineField({ name: 'reviewSource', title: 'Revu grâce à', type: 'string', options: { list: RECORD_SOURCES }, initialValue: 'vet_visits',
      hidden: ({ parent }) => (parent as RuleParent)?.type !== 'review_when_active' }),
    defineField({ name: 'match', title: 'Filtre (optionnel)', type: 'string', description: 'Ne regarder que certains enregistrements, ex. « rage|rabies » pour le vaccin antirabique. Laisse vide pour tout prendre.',
      hidden: ({ parent }) => (parent as RuleParent)?.type === 'pet_field' }),
    defineField({ name: 'optional', title: 'Ignorer si rien à évaluer', type: 'boolean', initialValue: false,
      description: 'Coché : s’il n’y a aucune donnée, la règle est ignorée au lieu de compter 0.' }),
    defineField({ name: 'weight', title: 'Importance dans la catégorie', type: 'number', initialValue: 1, validation: (r) => r.min(0.1) }),
    bilingual('advice', 'Conseil affiché au propriétaire quand la règle n’est pas remplie', 2),
    defineField({ name: 'ruleId', title: 'Identifiant technique', type: 'slug', description: 'Généré automatiquement ; ne le change pas une fois publié.', options: { source: (_doc, { parent }) => (parent as { advice?: { en?: string } })?.advice?.en ?? 'rule', maxLength: 40 } }),
  ],
  preview: {
    select: { type: 'type', source: 'source', field: 'field', days: 'withinDays', advice: 'advice.fr' },
    prepare: ({ type, source, field, days, advice }) => ({
      title: advice ?? 'Règle',
      subtitle: [RULE_TYPES.find((t) => t.value === type)?.title.split(' (')[0], RECORD_SOURCES.find((s) => s.value === source)?.title ?? PET_FIELDS.find((f) => f.value === field)?.title, days ? `${days} j` : null].filter(Boolean).join(' · '),
    }),
  },
})

/** Rules of the GRRR Care health follow-up score for one species and age group. Publishing syncs it to Supabase. */
export const healthProfile = defineType({
  name: 'healthProfile',
  title: 'Profil santé (score de suivi)',
  type: 'document',
  icon: HeartIcon,
  groups: [
    { name: 'who', title: 'Espèce & âge', default: true },
    { name: 'rules', title: 'Catégories & règles' },
    { name: 'validation', title: 'Validation vétérinaire' },
  ],
  fields: [
    defineField({ name: 'species', title: 'Espèce', type: 'string', group: 'who', description: 'En anglais et en minuscules, comme dans l’app : dog, cat, rabbit, bird, horse…',
      validation: (r) => r.required().regex(/^[a-z]+$/, { name: 'minuscules sans espace' }) }),
    defineField({ name: 'ageGroup', title: 'Tranche d’âge', type: 'string', group: 'who', description: 'Identifiant court : puppy, kitten, young, adult, senior…',
      validation: (r) => r.required().regex(/^[a-z_]+$/, { name: 'minuscules' }) }),
    bilingual('label', 'Nom affiché', 1, 'who'),
    defineField({ name: 'minAgeMonths', title: 'Âge minimum (mois, inclus)', type: 'number', group: 'who', initialValue: 0, validation: (r) => r.required().min(0).integer() }),
    defineField({ name: 'maxAgeMonths', title: 'Âge maximum (mois, exclu)', type: 'number', group: 'who', description: 'Vide = pas de limite (dernière tranche).',
      validation: (r) => r.integer().custom((max, ctx) => max == null || max > ((ctx.document?.minAgeMonths as number) ?? 0) || 'Doit être supérieur à l’âge minimum.') }),
    defineField({ name: 'minCoverage', title: 'Données minimum pour afficher un score (%)', type: 'number', group: 'who', initialValue: 50, validation: (r) => r.min(0).max(100) }),

    defineField({
      name: 'categories',
      title: 'Catégories',
      type: 'array',
      group: 'rules',
      description: 'Les poids doivent faire 100 % au total.',
      of: [defineArrayMember({
        name: 'healthCategory',
        type: 'object',
        fields: [
          defineField({ name: 'key', title: 'Catégorie', type: 'string', options: { list: CATEGORY_KEYS }, validation: (r) => r.required() }),
          bilingual('label', 'Nom affiché'),
          defineField({ name: 'weightPercent', title: 'Poids (%)', type: 'number', validation: (r) => r.required().min(1).max(100) }),
          defineField({ name: 'rules', title: 'Règles', type: 'array', of: [rule], validation: (r) => r.required().min(1) }),
        ],
        preview: { select: { title: 'label.fr', weight: 'weightPercent', rules: 'rules' }, prepare: ({ title, weight, rules }) => ({ title: `${title ?? 'Catégorie'} — ${weight ?? '?'} %`, subtitle: `${rules?.length ?? 0} règle(s)` }) },
      })],
      validation: (r) => r.required().min(1).custom((cats: { weightPercent?: number }[] | undefined) => {
        const total = (cats ?? []).reduce((s, c) => s + (c.weightPercent ?? 0), 0)
        return Math.abs(total - 100) < 0.01 || `Les poids font ${total} % : ils doivent faire exactement 100 %.`
      }),
    }),

    defineField({ name: 'status', title: 'Statut', type: 'string', group: 'validation', initialValue: 'provisional',
      options: { list: [{ title: 'Provisoire (à valider)', value: 'provisional' }, { title: 'Validé par un vétérinaire', value: 'validated' }], layout: 'radio' },
      validation: (r) => r.required() }),
    defineField({ name: 'validatedBy', title: 'Validé par (Dr …)', type: 'string', group: 'validation',
      validation: (r) => r.custom((v, ctx) => ctx.document?.status !== 'validated' || Boolean(v) || 'Indique le vétérinaire qui a validé.') }),
    defineField({ name: 'validatedAt', title: 'Date de validation', type: 'date', group: 'validation',
      validation: (r) => r.custom((v, ctx) => ctx.document?.status !== 'validated' || Boolean(v) || 'Indique la date de validation.') }),
  ],
  preview: {
    select: { title: 'label.fr', species: 'species', min: 'minAgeMonths', max: 'maxAgeMonths', status: 'status' },
    prepare: ({ title, species, min, max, status }) => ({
      title: `${status === 'validated' ? '✓ ' : ''}${title ?? species}`,
      subtitle: `${species} · ${min ?? 0}–${max ?? '∞'} mois · ${status === 'validated' ? 'validé' : 'provisoire'}`,
    }),
  },
  orderings: [{ title: 'Espèce puis âge', name: 'speciesAge', by: [{ field: 'species', direction: 'asc' }, { field: 'minAgeMonths', direction: 'asc' }] }],
})
