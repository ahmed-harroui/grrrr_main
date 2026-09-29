// Safe for the Studio (browser). Values must match the GRRR Care scoring engine (src/lib/health-score/types.ts).
export const RULE_TYPES = [
  { title: 'Enregistrement récent (ex. visite il y a moins de 365 jours)', value: 'recent' },
  { title: 'Échéance pas dépassée (rappel de vaccin, document)', value: 'not_overdue' },
  { title: 'Existe au moins une fois', value: 'exists' },
  { title: 'Champ du profil rempli (puce, poids…)', value: 'pet_field' },
  { title: 'Traitement en cours revu par un vétérinaire', value: 'review_when_active' },
]

export const RECORD_SOURCES = [
  { title: 'Vaccins', value: 'vaccinations' },
  { title: 'Visites vétérinaires', value: 'vet_visits' },
  { title: 'Traitements', value: 'medications' },
  { title: 'Documents', value: 'documents' },
]

export const PET_FIELDS = [
  { title: 'Numéro de puce', value: 'microchip' },
  { title: 'Poids', value: 'weight' },
  { title: 'Stérilisé (oui/non renseigné)', value: 'sterilized' },
  { title: 'Date de naissance', value: 'birthday' },
]

export const CATEGORY_KEYS = [
  { title: 'Vaccination', value: 'vaccination' },
  { title: 'Suivi vétérinaire', value: 'veterinary' },
  { title: 'Identification / prévention', value: 'preventive' },
  { title: 'Traitements', value: 'medication' },
  { title: 'Documents', value: 'documents' },
  { title: 'Mode de vie / poids', value: 'lifestyle' },
  { title: 'Dentaire', value: 'dental' },
  { title: 'Nutrition', value: 'nutrition' },
  { title: 'Autre', value: 'other' },
]
