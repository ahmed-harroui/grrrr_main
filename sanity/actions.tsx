import { useState } from 'react'
import { ShareIcon } from '@sanity/icons/Share'
import { SparklesIcon } from '@sanity/icons/Sparkles'
import { Box, Button, Card, Flex, Grid, Heading, Spinner, Stack, Text, TextArea } from '@sanity/ui'
import { useDocumentOperation, type DocumentActionComponent, type SanityDocument } from 'sanity'
import { REWRITE_MODES, type RewriteMode } from '../lib/content/modes'
import type { Critique } from '../lib/content/schema'

type Task = { task: 'draft' } | { task: 'rewrite'; mode: RewriteMode; instruction?: string } | { task: 'critique' } | { task: 'thread' }
type Result = { patch?: Record<string, unknown>; critique?: Critique; error?: string }

async function callAi(task: Task, doc: SanityDocument | null): Promise<Result> {
  const res = await fetch('/api/studio/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...task, doc }) })
  const json = (await res.json().catch(() => ({}))) as Result
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`)
  return json
}

function wordCount(body: unknown) {
  if (!Array.isArray(body)) return 0
  return body.flatMap((b: { children?: { text?: string }[] }) => b.children ?? []).map((s) => s.text ?? '').join(' ').split(/\s+/).filter(Boolean).length
}

function AiPanel({ doc, apply, close }: { doc: SanityDocument | null; apply: (patch: Record<string, unknown>) => void; close: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')
  const [pending, setPending] = useState<{ label: string; patch: Record<string, unknown> } | null>(null)
  const [critique, setCritique] = useState<Critique | null>(null)
  const hasBody = wordCount(doc?.body) > 0
  const posted = Boolean(doc?.threadPostedAt)

  async function run(label: string, task: Task) {
    setBusy(label); setError(null); setPending(null); setCritique(null)
    try {
      const result = await callAi(task, doc)
      if (result.critique) setCritique(result.critique)
      if (result.patch) setPending({ label, patch: result.patch })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  if (busy) {
    return <Flex direction="column" align="center" gap={4} padding={5}><Spinner muted /><Text muted>{busy}… (30 s à 1 min)</Text></Flex>
  }

  if (pending) {
    const p = pending.patch
    return (
      <Stack gap={4} padding={4}>
        <Heading size={1}>Aperçu : {pending.label}</Heading>
        {typeof p.title === 'string' && <Text><strong>Titre :</strong> {p.title}</Text>}
        {typeof p.excerpt === 'string' && <Text muted>{p.excerpt}</Text>}
        {p.body !== undefined && <Text size={1} muted>Texte : {wordCount(doc?.body)} → {wordCount(p.body)} mots</Text>}
        {Array.isArray(p.thread) && (
          <Stack gap={2}>{(p.thread as { text: string }[]).map((post, i) => <Card key={i} padding={3} radius={2} tone="transparent" border><Text size={1}>{post.text}</Text></Card>)}</Stack>
        )}
        <Text size={1} muted>Tu pourras toujours revenir en arrière via l’historique du document.</Text>
        <Flex gap={2} justify="flex-end">
          <Button mode="ghost" text="Ignorer" onClick={() => setPending(null)} />
          <Button tone="primary" text="Appliquer" onClick={() => { apply(p); close() }} />
        </Flex>
      </Stack>
    )
  }

  return (
    <Stack gap={5} padding={4}>
      {error && <Card padding={3} radius={2} tone="critical"><Text size={1}>{error}</Text></Card>}

      {critique && (
        <Card padding={4} radius={2} tone="primary" border>
          <Stack gap={3}>
            <Heading size={1}>Note : {critique.score}/10</Heading>
            <Text size={1}>{critique.summary}</Text>
            {critique.tips.map((tip, i) => (
              <Stack key={i} gap={2}><Text size={1} weight="semibold">• {tip.issue}</Text><Text size={1} muted>→ {tip.suggestion}</Text></Stack>
            ))}
          </Stack>
        </Card>
      )}

      <Stack gap={3}>
        <Heading size={0}>Écrire</Heading>
        <Button icon={SparklesIcon} tone="primary" text={hasBody ? 'Réécrire tout depuis la question' : 'Rédiger le guide depuis la question'} disabled={!doc?.question} onClick={() => run('Rédaction du guide', { task: 'draft' })} />
        {!doc?.question && <Text size={1} muted>Remplis d’abord le champ « Question de départ ».</Text>}
      </Stack>

      <Stack gap={3}>
        <Heading size={0}>Améliorer le style</Heading>
        <Grid gridTemplateColumns={[1, 2]} gap={2}>
          {(Object.entries(REWRITE_MODES) as [keyof typeof REWRITE_MODES, (typeof REWRITE_MODES)[keyof typeof REWRITE_MODES]][]).map(([mode, m]) => (
            <Button key={mode} mode="ghost" disabled={!hasBody} onClick={() => run(m.label, { task: 'rewrite', mode })} padding={3}>
              <Stack gap={2}><Text size={1} weight="semibold">{m.label}</Text><Text size={0} muted>{m.hint}</Text></Stack>
            </Button>
          ))}
        </Grid>
      </Stack>

      <Stack gap={3}>
        <Heading size={0}>Instruction libre</Heading>
        <TextArea rows={2} value={instruction} placeholder="Ex. : ajoute une section pour les chiots, plus d’humour, cite un exemple de promenade…" onChange={(e) => setInstruction(e.currentTarget.value)} />
        <Box><Button mode="ghost" text="Appliquer l’instruction" disabled={!hasBody || !instruction.trim()} onClick={() => run('Instruction libre', { task: 'rewrite', mode: 'custom', instruction })} /></Box>
      </Stack>

      <Stack gap={3}>
        <Heading size={0}>Relire et diffuser</Heading>
        <Flex gap={2} wrap="wrap">
          <Button mode="ghost" text="Conseils de l’éditeur (note /10)" disabled={!hasBody} onClick={() => run('Relecture', { task: 'critique' })} />
          <Button mode="ghost" text="Générer le fil Threads" disabled={!hasBody || posted} onClick={() => run('Écriture du fil Threads', { task: 'thread' })} />
        </Flex>
      </Stack>
    </Stack>
  )
}

export const AiAssistAction: DocumentActionComponent = (props) => {
  const { patch } = useDocumentOperation(props.id, props.type)
  const [open, setOpen] = useState(false)
  const doc = props.draft ?? props.published
  return {
    label: 'Aide IA',
    icon: SparklesIcon,
    onHandle: () => setOpen(true),
    dialog: open && {
      type: 'dialog',
      header: '✨ Aide à l’écriture',
      width: 'medium',
      onClose: () => setOpen(false),
      content: <AiPanel doc={doc} apply={(set) => patch.execute([{ set }])} close={() => setOpen(false)} />,
    },
  }
}

export const PostThreadAction: DocumentActionComponent = (props) => {
  const [state, setState] = useState<'idle' | 'confirm' | 'posting' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const published = props.published
  const thread = (published?.thread as unknown[] | undefined) ?? []
  const disabled = !published || thread.length === 0 || Boolean(published.threadPostedAt)
  const title = !published ? 'Publie d’abord le guide' : published.threadPostedAt ? 'Fil déjà publié' : thread.length === 0 ? 'Aucun post dans le fil' : undefined

  async function post() {
    setState('posting')
    try {
      const res = await fetch('/api/studio/threads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: props.id }) })
      const json = (await res.json().catch(() => ({}))) as { error?: string; posted?: number }
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`)
      setMessage(`${json.posted} posts publiés sur Threads.`)
      setState('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
      setState('error')
    }
  }

  return {
    label: 'Publier sur Threads',
    icon: ShareIcon,
    disabled,
    title,
    onHandle: () => setState('confirm'),
    dialog:
      state === 'confirm'
        ? {
            type: 'confirm',
            tone: 'primary',
            message: `Publier les ${thread.length} posts du fil sur ton compte Threads ? ${props.draft ? '⚠️ Ce guide a des modifications non publiées : c’est la version publiée qui sera utilisée.' : ''}`,
            onConfirm: post,
            onCancel: () => setState('idle'),
          }
        : state !== 'idle' && {
            type: 'dialog',
            header: 'Threads',
            onClose: () => setState('idle'),
            content: <Box padding={4}>{state === 'posting' ? <Flex gap={3} align="center"><Spinner muted /><Text>Publication en cours…</Text></Flex> : <Text>{state === 'done' ? '✓ ' : '✗ '}{message}</Text>}</Box>,
          },
  }
}
