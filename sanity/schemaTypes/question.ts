import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineField, defineType } from 'sanity'

export const question = defineType({
  name: 'question',
  title: 'Question (file d’attente)',
  type: 'document',
  icon: HelpCircleIcon,
  description: 'Le mode automatique prend chaque jour la plus ancienne question non utilisée et en fait un guide.',
  fields: [
    defineField({ name: 'text', title: 'Question', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'used', title: 'Déjà utilisée', type: 'boolean', initialValue: false }),
    defineField({ name: 'guide', title: 'Guide généré', type: 'reference', to: [{ type: 'guide' }], weak: true, readOnly: true }),
  ],
  preview: { select: { title: 'text', used: 'used' }, prepare: ({ title, used }) => ({ title, subtitle: used ? '✓ utilisée' : 'en attente' }) },
})
