import { defineField, defineType } from 'sanity'

/** Singleton edited from the dashboard tool; read by the daily job. */
export const engineSettings = defineType({
  name: 'engineSettings',
  title: 'Réglages du mode automatique',
  type: 'document',
  fields: [
    defineField({ name: 'paused', title: 'En pause', type: 'boolean', initialValue: false }),
    defineField({ name: 'autoPublish', title: 'Publier directement (sans relecture)', type: 'boolean', initialValue: false }),
    defineField({ name: 'guidesPerRun', title: 'Guides par jour', type: 'number', initialValue: 1, validation: (r) => r.min(1).max(5) }),
    defineField({ name: 'threadsPerRun', title: 'Fils « Le savais-tu » par jour', type: 'number', initialValue: 2, validation: (r) => r.min(0).max(5) }),
  ],
})
