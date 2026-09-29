import { Heart, Stethoscope, Store, type LucideIcon } from 'lucide-react'

export type Product = {
  id: 'dating' | 'care' | 'store'
  name: string
  url: string
  host: string
  icon: LucideIcon
  color: 'coral' | 'sage' | 'yellow'
  tagline: string
  description: string
  features: string[]
  cta: string
}

/** The three Grr apps, in ecosystem order. */
export const PRODUCTS: Product[] = [
  {
    id: 'dating',
    name: 'Grr Dating',
    url: 'https://app.greatrascals.com/',
    host: 'app.greatrascals.com',
    icon: Heart,
    color: 'coral',
    tagline: 'Find their people.',
    description: 'Swipe through the pets around you, say whether you’re after a friend or something more, then match and chat. Playdates, walking buddies, first loves.',
    features: ['Swipe nearby pets', 'Friend ↔ Hot slider', 'Match and chat', 'Your pet’s own profile'],
    cta: 'Open Grr Dating',
  },
  {
    id: 'care',
    name: 'Grr Care',
    url: 'https://care.greatrascals.com/',
    host: 'care.greatrascals.com',
    icon: Stethoscope,
    color: 'sage',
    tagline: 'Their health, in one place.',
    description: 'Vaccines, treatments, vet visits and papers in your pocket, and GRRR, an assistant that knows your pet and answers from vet-checked guides.',
    features: ['Health record and documents', 'Vaccine and treatment dates', 'Health score by age and breed', 'GRRR, the AI assistant', 'Vets and partners nearby'],
    cta: 'Open Grr Care',
  },
  {
    id: 'store',
    name: 'Grr Store',
    url: 'https://store.greatrascals.com/',
    host: 'store.greatrascals.com',
    icon: Store,
    color: 'yellow',
    tagline: 'Made for them. And for you.',
    description: 'Collars and ID tags personalised with their name, toys and treats, and a few good things for their humans too. Made in France.',
    features: ['Personalised collars and ID tags', 'Toys and treats', 'Gifts for pet people', 'Free delivery from €60'],
    cta: 'Visit the store',
  },
]
