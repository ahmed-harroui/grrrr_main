// Shared by the Studio (labels) and the server (instructions) — keep it free of server-only imports.
export const REWRITE_MODES = {
  vivid: { label: 'Plus vivant', hint: 'Scènes concrètes, rythme, meilleure entrée en matière', instruction: 'Make it more vivid and engaging: concrete scenes a pet owner will recognise, sensory detail, varied sentence rhythm, a stronger opening line. Remove clichés and filler. Keep every fact and piece of advice.' },
  punchy: { label: 'Plus court et percutant', hint: '−30 % de longueur, zéro remplissage', instruction: 'Cut the length by about 30% without losing any useful advice. Tighten every sentence, remove repetition and throat-clearing, keep the strongest lines.' },
  simple: { label: 'Plus simple', hint: 'Phrases courtes, mots de tous les jours', instruction: 'Make it easier to read: short sentences, everyday words, one idea per paragraph, explain any jargon. Keep the warmth and every piece of advice.' },
  brand: { label: 'Ton Grr', hint: 'Chaleureux, malin, un peu joueur', instruction: 'Rewrite it so it sounds unmistakably like the Grr voice described above, without changing the substance.' },
  hook: { label: 'Meilleure accroche', hint: 'Titre, chapeau et intro seulement', instruction: 'Improve only the title, the excerpt and the first two paragraphs so they hook the reader with curiosity (no clickbait). Return every other block exactly as it is.' },
  structure: { label: 'Mieux structurer', hint: 'Intertitres clairs, ordre logique, listes utiles', instruction: 'Improve the structure: clear, specific h2 headings that promise something, logical order, a practical "what to do" section, lists only where they help scanning. Keep the wording where it already works.' },
  proofread: { label: 'Corriger les fautes', hint: 'Orthographe et grammaire uniquement', instruction: 'Only fix spelling, grammar, punctuation and awkward phrasing (British English). Do not change style, structure or content otherwise.' },
} as const

export type RewriteMode = keyof typeof REWRITE_MODES | 'custom'
