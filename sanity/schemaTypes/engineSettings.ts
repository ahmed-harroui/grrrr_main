import { defineField, defineType } from 'sanity'

/** Singleton edited from the dashboard tool; read by the weekly job. */
export const engineSettings = defineType({
  name: 'engineSettings',
  title: 'Réglages du mode automatique',
  type: 'document',
  fields: [
    defineField({ name: 'paused', title: 'En pause', type: 'boolean', initialValue: false }),
    defineField({ name: 'autoPublish', title: 'Publier directement (sans relecture)', type: 'boolean', initialValue: false }),
    defineField({ name: 'guidesPerRun', title: 'Guides par semaine', type: 'number', initialValue: 1, validation: (r) => r.min(1).max(5) }),
  ],
})
