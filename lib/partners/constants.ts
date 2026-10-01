// Safe for the Studio (browser). Values must match the Grr Care `partners` table.
export const PARTNER_CATEGORIES = [
  { title: 'Clinique vétérinaire', value: 'clinic' },
  { title: 'Pharmacie', value: 'pharmacy' },
  { title: 'Fournitures / animalerie', value: 'supplies' },
  { title: 'Assurance', value: 'insurance' },
  { title: 'Alimentation', value: 'food' },
  { title: 'Toilettage', value: 'grooming' },
]

export const DAYS = [
  { value: 'monday', title: 'Lundi' },
  { value: 'tuesday', title: 'Mardi' },
  { value: 'wednesday', title: 'Mercredi' },
  { value: 'thursday', title: 'Jeudi' },
  { value: 'friday', title: 'Vendredi' },
  { value: 'saturday', title: 'Samedi' },
  { value: 'sunday', title: 'Dimanche' },
] as const
export type Day = (typeof DAYS)[number]['value']

/** Where establishments apply to appear on the map (GRRR Care repo, public/partenaires.html). */
export const PARTNER_FORM_URL = 'https://care.greatrascals.com/partenaires'

export type PendingPartner = {
  id: string
  name: string
  category: string
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  located: boolean
  created_at: string
}
