import { PinIcon } from '@sanity/icons/Pin'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { DAYS, PARTNER_CATEGORIES } from '../../lib/partners/constants'
import { LocationInput } from '../location-input'

/** A partner shown on the Grr Care map. Publishing syncs it to the Supabase `partners` table. */
export const partner = defineType({
  name: 'partner',
  title: 'Partenaire (carte Grr Care)',
  type: 'document',
  icon: PinIcon,
  groups: [
    { name: 'main', title: 'Infos', default: true },
    { name: 'contact', title: 'Contact & horaires' },
    { name: 'media', title: 'Images' },
  ],
  fields: [
    defineField({ name: 'name', title: 'Nom', type: 'string', group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'category', title: 'Catégorie', type: 'string', group: 'main', options: { list: PARTNER_CATEGORIES, layout: 'radio' }, validation: (r) => r.required() }),
    defineField({ name: 'address', title: 'Adresse complète', type: 'string', group: 'main', description: 'Numéro, rue, code postal, ville — ex. « 12 cours de l’Intendance, 33000 Bordeaux ».', validation: (r) => r.required() }),
    defineField({
      name: 'location',
      title: 'Position sur la carte',
      type: 'object',
      group: 'main',
      components: { input: LocationInput },
      fields: [
        defineField({ name: 'lat', title: 'Latitude', type: 'number', validation: (r) => r.min(-90).max(90) }),
        defineField({ name: 'lng', title: 'Longitude', type: 'number', validation: (r) => r.min(-180).max(180) }),
      ],
      options: { columns: 2 },
      validation: (r) => r.custom((v: { lat?: number; lng?: number } | undefined) => (v?.lat != null && v?.lng != null) || 'Clique sur « 📍 Localiser l’adresse » pour placer le partenaire sur la carte.').warning(),
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3, group: 'main' }),
    defineField({ name: 'services', title: 'Services', type: 'array', group: 'main', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' }, description: 'Ex. : Urgences 24h/24, Vaccination, Chirurgie… (Entrée après chaque service)' }),
    defineField({ name: 'isFeatured', title: 'Mis en avant', type: 'boolean', group: 'main', initialValue: false, description: 'Affiché en premier / en vedette dans l’app.' }),
    defineField({ name: 'rating', title: 'Note (sur 5)', type: 'number', group: 'main', initialValue: 4.5, validation: (r) => r.min(0).max(5).precision(1) }),

    defineField({ name: 'phone', title: 'Téléphone', type: 'string', group: 'contact' }),
    defineField({ name: 'email', title: 'E-mail', type: 'string', group: 'contact', validation: (r) => r.email() }),
    defineField({ name: 'website', title: 'Site web', type: 'url', group: 'contact' }),
    defineField({
      name: 'hours',
      title: 'Horaires',
      type: 'object',
      group: 'contact',
      description: 'Ex. « 9h–19h », « Fermé », « 24h/24 ». Laisse vide si inconnu.',
      options: { columns: 2 },
      fields: DAYS.map((d) => defineField({ name: d.value, title: d.title, type: 'string' })),
    }),

    defineField({ name: 'logo', title: 'Logo', type: 'image', group: 'media' }),
    defineField({ name: 'coverImage', title: 'Photo de couverture', type: 'image', group: 'media', options: { hotspot: true } }),
  ],
  preview: {
    select: { title: 'name', category: 'category', address: 'address', media: 'logo', featured: 'isFeatured' },
    prepare: ({ title, category, address, media, featured }) => ({
      title: `${featured ? '★ ' : ''}${title ?? 'Sans nom'}`,
      subtitle: [PARTNER_CATEGORIES.find((c) => c.value === category)?.title, address].filter(Boolean).join(' · '),
      media,
    }),
  },
})
