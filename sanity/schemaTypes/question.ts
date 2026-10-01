import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineField, defineType } from 'sanity'

export const question = defineType({
  name: 'question',
  title: 'Question (file d’attente)',
  type: 'document',
  icon: HelpCircleIcon,
  description: 'Le mode automatique prend chaque lundi la question en attente la plus demandée (à égalité, la plus ancienne) et en fait un guide. La question quitte alors cette liste.',
  fields: [
    defineField({ name: 'text', title: 'Question', type: 'string', validation: (r) => r.required() }),
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
    select: { title: 'text', source: 'source', asks: 'asks' },
    prepare: ({ title, source, asks }) => ({ title, subtitle: `en attente${source === 'app' ? ' · 📱 app' : ''}${(asks ?? 1) > 1 ? ` · demandée ×${asks}` : ''}` }),
  },
})
