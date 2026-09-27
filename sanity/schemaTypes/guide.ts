import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { CATEGORIES } from '../../lib/content/schema'

export const guide = defineType({
  name: 'guide',
  title: 'Guide',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    { name: 'content', title: 'Contenu', default: true },
    { name: 'threads', title: 'Threads' },
    { name: 'settings', title: 'Réglages' },
  ],
  fields: [
    defineField({ name: 'question', title: 'Question de départ', type: 'text', rows: 2, group: 'content', description: 'La question d’un propriétaire. Laisse le reste vide et clique sur « ✨ Aide IA » → « Rédiger le guide ».' }),
    defineField({ name: 'title', title: 'Titre', type: 'string', group: 'content', validation: (r) => r.required() }),
    defineField({ name: 'excerpt', title: 'Chapeau', type: 'text', rows: 3, group: 'content', description: 'Une ou deux phrases, affichées sur les cartes et dans Google.', validation: (r) => r.required().max(300) }),
    defineField({
      name: 'body',
      title: 'Texte',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Paragraphe', value: 'normal' },
            { title: 'Titre de section', value: 'h2' },
            { title: 'Sous-titre', value: 'h3' },
            { title: 'Citation', value: 'blockquote' },
          ],
          lists: [
            { title: 'Puces', value: 'bullet' },
            { title: 'Numéros', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Gras', value: 'strong' },
              { title: 'Italique', value: 'em' },
            ],
            annotations: [{ name: 'link', type: 'object', title: 'Lien', fields: [{ name: 'href', type: 'url', title: 'URL' }] }],
          },
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({ name: 'vetNote', title: 'Quand consulter un vétérinaire', type: 'text', rows: 3, group: 'content' }),
    defineField({
      name: 'thread',
      title: 'Fil Threads',
      type: 'array',
      group: 'threads',
      description: 'Un post par élément, 450 caractères max. Le lien du guide est ajouté automatiquement au dernier post.',
      readOnly: ({ document }) => Boolean(document?.threadPostedAt),
      of: [
        defineArrayMember({
          name: 'threadPost',
          type: 'object',
          fields: [
            defineField({ name: 'text', title: 'Texte', type: 'text', rows: 4, validation: (r) => r.required().max(450) }),
            defineField({ name: 'postId', title: 'ID Threads', type: 'string', readOnly: true, hidden: ({ value }) => !value }),
          ],
          preview: { select: { title: 'text', postId: 'postId' }, prepare: ({ title, postId }) => ({ title, subtitle: postId ? '✓ publié' : 'pas encore publié' }) },
        }),
      ],
    }),
    defineField({ name: 'threadPostedAt', title: 'Fil publié le', type: 'datetime', group: 'threads', readOnly: true }),
    defineField({ name: 'slug', title: 'Adresse (slug)', type: 'slug', group: 'settings', options: { source: 'title', maxLength: 60 }, validation: (r) => r.required() }),
    defineField({ name: 'category', title: 'Catégorie', type: 'string', group: 'settings', options: { list: [...CATEGORIES] }, validation: (r) => r.required() }),
    defineField({ name: 'readMinutes', title: 'Temps de lecture (min)', type: 'number', group: 'settings', initialValue: 5 }),
    defineField({ name: 'source', title: 'Origine', type: 'string', group: 'settings', readOnly: true, options: { list: [{ title: 'IA (automatique)', value: 'ai' }, { title: 'Studio', value: 'studio' }] }, initialValue: 'studio' }),
  ],
  preview: {
    select: { title: 'title', category: 'category', posted: 'threadPostedAt' },
    prepare: ({ title, category, posted }) => ({ title: title || 'Sans titre', subtitle: `${category ?? '—'}${posted ? ' · 🧵 posté' : ''}` }),
  },
  orderings: [{ title: 'Plus récents', name: 'newest', by: [{ field: '_createdAt', direction: 'desc' }] }],
})
