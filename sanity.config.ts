'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { AiAssistAction, PostThreadAction, SyncHealthProfileAction, SyncPartnerAction } from './sanity/actions'
import { dashboardPlugin } from './sanity/dashboard'
import { schemaTypes } from './sanity/schemaTypes'
import { dataset, projectId } from './lib/sanity/env'

export default defineConfig({
  name: 'grr',
  title: 'Grr — Journal',
  basePath: '/studio',
  projectId,
  dataset,
  plugins: [
    dashboardPlugin, // first plugin = the tool that opens by default
    structureTool({
      structure: (S) =>
        S.list()
          .title('Contenu')
          .items([
            S.documentTypeListItem('guide').title('Guides'),
            S.documentTypeListItem('question').title('Questions en attente'),
            S.divider(),
            S.documentTypeListItem('partner').title('Partenaires (carte Grr Care)'),
            S.documentTypeListItem('healthProfile').title('Profils santé (score de suivi)'),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'guide') return [...prev, AiAssistAction, PostThreadAction]
      if (context.schemaType === 'partner') return [...prev, SyncPartnerAction]
      if (context.schemaType === 'healthProfile') return [...prev, SyncHealthProfileAction]
      return prev
    },
  },
})
