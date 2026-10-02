// Safe to import from client components (no server-only code). Must match supabase/schema.sql.
export const THREAD_CATEGORIES = {
  fact: 'Fun fact',
  history: 'History',
  culture: 'Culture',
  science: 'Science',
  story: 'Story',
  tip: 'Tip',
} as const
export type ThreadCategory = keyof typeof THREAD_CATEGORIES

/** The animal families threads and guides are about (supabase/animals.sql). */
export const ANIMALS = {
  all: 'All pets',
  dog: 'Dogs',
  cat: 'Cats',
  rabbit: 'Rabbits',
  rodent: 'Small rodents',
  bird: 'Birds',
  fish: 'Fish',
  reptile: 'Reptiles',
  horse: 'Horses',
  ferret: 'Ferrets',
  farm: 'Farm animals',
} as const
export type Animal = keyof typeof ANIMALS
export const ANIMAL_KEYS = Object.keys(ANIMALS) as [Animal, ...Animal[]]

/** What each family covers, for the AI prompts. */
export const ANIMAL_DETAILS: Record<Animal, string> = {
  all: 'pets in general',
  dog: 'dogs and puppies',
  cat: 'cats and kittens',
  rabbit: 'pet rabbits',
  rodent: 'guinea pigs, hamsters, rats, mice, gerbils and chinchillas',
  bird: 'pet birds: budgies, canaries, cockatiels, parrots',
  fish: 'aquarium and pond fish',
  reptile: 'pet reptiles and amphibians: tortoises, turtles, geckos, bearded dragons, snakes, frogs',
  horse: 'horses, ponies and donkeys',
  ferret: 'pet ferrets',
  farm: 'backyard and smallholding animals: hens, ducks, goats, sheep, pigs',
}

/** The species names the GRRRR apps use for pets (the GRRR Care assistant's knowledge is filtered by them). */
export const ANIMAL_SPECIES: Record<Animal, string[]> = {
  all: [],
  dog: ['dog'],
  cat: ['cat'],
  rabbit: ['rabbit'],
  rodent: ['guinea_pig', 'hamster', 'rat', 'mouse'],
  bird: ['bird', 'parrot'],
  fish: ['fish'],
  reptile: ['turtle', 'lizard', 'snake', 'frog', 'salamander'],
  horse: ['horse', 'donkey'],
  ferret: ['ferret'],
  farm: ['chicken', 'duck', 'goat', 'sheep', 'pig', 'cow'],
}

export const LIMITS = { title: 120, body: 1500, comment: 600 }
