'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { AiAssistAction, PostThreadAction } from './sanity/actions'
import { schemaTypes } from './sanity/schemaTypes'
import { dataset, projectId } from './lib/sanity/env'

export default defineConfig({
  name: 'grr',
  title: 'Grr — Journal',
  basePath: '/studio',
  projectId,
  dataset,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Contenu')
          .items([
            S.documentTypeListItem('guide').title('Guides'),
            S.documentTypeListItem('question').title('Questions en attente'),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
  document: {
    actions: (prev, context) => (context.schemaType === 'guide' ? [...prev, AiAssistAction, PostThreadAction] : prev),
  },
})
