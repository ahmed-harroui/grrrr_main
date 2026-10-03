// Safe to import from client components (no server-only code).

export const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', rabbit: '🐰', hamster: '🐹', guinea_pig: '🐹', mouse: '🐭', rat: '🐀', ferret: '🦦', bird: '🐦', parrot: '🦜',
  fish: '🐟', turtle: '🐢', lizard: '🦎', snake: '🐍', horse: '🐴', donkey: '🫏', chicken: '🐔', duck: '🦆', goat: '🐐', sheep: '🐑', pig: '🐷',
}

export const speciesEmoji = (species: string) => SPECIES_EMOJI[species?.toLowerCase()] ?? '🐾'

/** The species owners can pick when posting a pet to give. */
export const GIVE_SPECIES = [
  ['dog', 'Dog'], ['cat', 'Cat'], ['rabbit', 'Rabbit'], ['guinea_pig', 'Guinea pig'], ['hamster', 'Hamster'], ['rat', 'Rat'], ['ferret', 'Ferret'],
  ['bird', 'Bird'], ['parrot', 'Parrot'], ['fish', 'Fish'], ['turtle', 'Tortoise / turtle'], ['lizard', 'Lizard'], ['horse', 'Horse'], ['chicken', 'Hen'], ['goat', 'Goat'], ['other', 'Other'],
] as const
