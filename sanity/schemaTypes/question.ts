import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineField, defineType } from 'sanity'

export const question = defineType({
  name: 'question',
  title: 'Question (file d’attente)',
  type: 'document',
  icon: HelpCircleIcon,
  description: 'Le mode automatique prend chaque lundi la question en attente la plus demandée (à égalité, la plus ancienne) et en fait un guide.',
  fields: [
    defineField({ name: 'text', title: 'Question', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'used', title: 'Déjà utilisée', type: 'boolean', initialValue: false }),
    defineField({ name: 'guide', title: 'Guide généré', type: 'reference', to: [{ type: 'guide' }], weak: true, readOnly: true }),
    defineField({ name: 'asks', title: 'Nombre de demandes', type: 'number', readOnly: true, description: 'Combien de fois cette question a été posée dans l’app GRRR Care. Les plus demandées deviennent des guides en premier.' }),
    defineField({
      name: 'source',
      title: 'Origine',
      type: 'string',
      description: 'Posée par un utilisateur de l’app GRRR Care (anonymisée), ou ajoutée ici / par l’IA.',
      options: { list: [{ title: 'App GRRR Care', value: 'app' }] },
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: 'text', used: 'used', source: 'source', asks: 'asks' },
    prepare: ({ title, used, source, asks }) => ({ title, subtitle: `${used ? '✓ utilisée' : 'en attente'}${source === 'app' ? ' · 📱 app' : ''}${(asks ?? 1) > 1 ? ` · demandée ×${asks}` : ''}` }),
  },
})
