import { useCallback, useEffect, useState } from 'react'
import { DashboardIcon } from '@sanity/icons/Dashboard'
import { Badge, Box, Button, Card, Container, Flex, Grid, Heading, Select, Spinner, Stack, Switch, Text, TextInput } from '@sanity/ui'
import { definePlugin, useClient } from 'sanity'
import { IntentLink } from 'sanity/router'

type Stats = {
  published: number
  drafts: { _id: string; title?: string; _updatedAt: string; isNew: boolean }[]
  latest: { _id: string; title: string; slug: string; _createdAt: string; posted: boolean }[]
  queue: { _id: string; text: string }[]
  threadsPosted: number
  threadsPending: number
  settings: { paused?: boolean; autoPublish?: boolean; guidesPerRun?: number } | null
}

const STATS_QUERY = `{
  "published": count(*[_type == "guide" && !(_id in path("drafts.**"))]),
  "drafts": *[_type == "guide" && _id in path("drafts.**")] | order(_updatedAt desc) {
    _id, title, _updatedAt, "isNew": !defined(*[_id == string::split(^._id, "drafts.")[1]][0]._id)
  },
  "latest": *[_type == "guide" && !(_id in path("drafts.**"))] | order(_createdAt desc)[0...5] {
    _id, title, "slug": slug.current, _createdAt, "posted": defined(threadPostedAt)
  },
  "queue": *[_type == "question" && !(_id in path("drafts.**")) && used != true] | order(_createdAt asc) { _id, text },
  "threadsPosted": count(*[_type == "guide" && !(_id in path("drafts.**")) && defined(threadPostedAt)]),
  "threadsPending": count(*[_type == "guide" && !(_id in path("drafts.**")) && count(thread) > 0 && !defined(threadPostedAt)]),
  "settings": *[_id == "engineSettings"][0]
}`

/** Next Monday 08:00 UTC — must match the cron in .github/workflows/content.yml. */
function nextRun(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8))
  const days = (1 - d.getUTCDay() + 7) % 7
  d.setUTCDate(d.getUTCDate() + days)
  if (d <= now) d.setUTCDate(d.getUTCDate() + 7)
  return d
}

const fmt = (iso: string | Date) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

function StatCard({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'caution' | 'positive' }) {
  return (
    <Card padding={4} radius={3} border tone={tone}>
      <Stack gap={3}>
        <Text size={1} muted>{label}</Text>
        <Heading size={4}>{value}</Heading>
      </Stack>
    </Card>
  )
}

function Dashboard() {
  const client = useClient({ apiVersion: '2026-09-01' }).withConfig({ perspective: 'raw' })
  const [stats, setStats] = useState<Stats | null>(null)
  const [config, setConfig] = useState<{ threadsConfigured: boolean; aiConfigured: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<{ ok: boolean; lines: string[] } | null>(null)
  const [newQuestion, setNewQuestion] = useState('')

  const refresh = useCallback(() => client.fetch<Stats>(STATS_QUERY).then(setStats), [client])

  useEffect(() => {
    refresh()
    fetch('/api/studio/engine').then((r) => r.json()).then(setConfig).catch(() => setConfig(null))
  }, [refresh])

  async function saveSetting(patch: Record<string, unknown>) {
    await client.createIfNotExists({ _id: 'engineSettings', _type: 'engineSettings' })
    await client.patch('engineSettings').set(patch).commit()
    await refresh()
  }

  async function runAction(action: 'generate' | 'ideas' | 'post', label: string) {
    setBusy(label); setLog(null)
    try {
      const res = await fetch('/api/studio/engine', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; log?: string[]; error?: string }
      setLog({ ok: res.ok && json.ok !== false, lines: [...(json.log ?? []), ...(json.error ? [`✗ ${json.error}`] : [])] })
    } catch (err) {
      setLog({ ok: false, lines: [`✗ ${err instanceof Error ? err.message : String(err)}`] })
    } finally {
      setBusy(null)
      refresh()
    }
  }

  async function addQuestion() {
    if (!newQuestion.trim()) return
    await client.create({ _type: 'question', text: newQuestion.trim(), used: false })
    setNewQuestion('')
    refresh()
  }

  async function removeQuestion(id: string) {
    await client.delete(id)
    refresh()
  }

  if (!stats) return <Flex padding={6} justify="center"><Spinner muted /></Flex>

  const settings = { paused: false, autoPublish: false, guidesPerRun: 1, ...stats.settings }
  const toReview = stats.drafts.filter((d) => d.isNew)
  const edited = stats.drafts.filter((d) => !d.isNew)
  const weeksLeft = Math.floor(stats.queue.length / settings.guidesPerRun)

  return (
    <Box overflow="auto" height="fill">
      <Container width={3} padding={[3, 4, 5]}>
        <Stack gap={5}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Heading size={3}>Tableau de bord</Heading>
            <Button mode="ghost" text="Rafraîchir" onClick={refresh} />
          </Flex>

          <Grid gridTemplateColumns={[2, 2, 4]} gap={3}>
            <StatCard label="Guides publiés" value={stats.published} tone="positive" />
            <StatCard label="À relire" value={toReview.length} tone={toReview.length ? 'caution' : 'default'} />
            <StatCard label="Questions en attente" value={stats.queue.length} tone={stats.queue.length ? 'default' : 'caution'} />
            <StatCard label="Fils Threads postés" value={`${stats.threadsPosted}${stats.threadsPending ? ` (+${stats.threadsPending})` : ''}`} />
          </Grid>

          {/* ---------- automatic mode ---------- */}
          <Card padding={4} radius={3} border>
            <Stack gap={4}>
              <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Heading size={1}>Mode automatique</Heading>
                <Badge tone={settings.paused ? 'caution' : 'positive'}>{settings.paused ? 'En pause' : 'Actif'}</Badge>
              </Flex>
              <Text size={1} muted>
                {settings.paused
                  ? 'Aucun guide ne sera écrit automatiquement tant que le mode est en pause.'
                  : `Prochain passage : ${fmt(nextRun())} — ${settings.guidesPerRun} guide${settings.guidesPerRun > 1 ? 's' : ''}, ${settings.autoPublish ? 'publié directement' : 'en brouillon à relire'}.`}
              </Text>
              <Flex align="center" gap={3}>
                <Switch checked={!settings.paused} onChange={() => saveSetting({ paused: !settings.paused })} />
                <Text size={1}>Écrire des guides automatiquement chaque lundi</Text>
              </Flex>
              <Flex align="center" gap={3}>
                <Switch checked={settings.autoPublish} onChange={() => saveSetting({ autoPublish: !settings.autoPublish })} />
                <Text size={1}>Publier directement, sans relecture</Text>
              </Flex>
              <Flex align="center" gap={3}>
                <Box style={{ width: 90 }}>
                  <Select value={String(settings.guidesPerRun)} onChange={(e) => saveSetting({ guidesPerRun: Number(e.currentTarget.value) })}>
                    {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Box>
                <Text size={1}>guide(s) par semaine · environ {(settings.guidesPerRun * 0.1 * 4.3).toFixed(2)} $ / mois</Text>
              </Flex>
            </Stack>
          </Card>

          {/* ---------- actions ---------- */}
          <Card padding={4} radius={3} border>
            <Stack gap={4}>
              <Heading size={1}>Actions</Heading>
              {config && !config.aiConfigured && <Card padding={3} radius={2} tone="critical"><Text size={1}>ANTHROPIC_API_KEY manque sur le serveur : les actions IA ne marcheront pas.</Text></Card>}
              <Flex gap={2} wrap="wrap">
                <Button tone="primary" text="Écrire un guide maintenant" disabled={Boolean(busy)} onClick={() => runAction('generate', 'Écriture du guide')} />
                <Button mode="ghost" text="Ajouter 8 idées de questions" disabled={Boolean(busy)} onClick={() => runAction('ideas', 'Recherche d’idées')} />
                <Button mode="ghost" text={`Publier les fils en attente (${stats.threadsPending})`} disabled={Boolean(busy) || !config?.threadsConfigured || stats.threadsPending === 0} onClick={() => runAction('post', 'Publication sur Threads')} />
              </Flex>
              {config && !config.threadsConfigured && <Text size={1} muted>Threads n’est pas encore configuré : les fils sont gardés et pourront être publiés plus tard.</Text>}
              {busy && <Flex gap={3} align="center"><Spinner muted /><Text size={1}>{busy}… (jusqu’à 1 min)</Text></Flex>}
              {log && (
                <Card padding={3} radius={2} tone={log.ok ? 'positive' : 'critical'}>
                  <Stack gap={2}>{log.lines.map((line, i) => <Text key={i} size={1} style={{ whiteSpace: 'pre-wrap' }}>{line}</Text>)}</Stack>
                </Card>
              )}
            </Stack>
          </Card>

          {/* ---------- to review ---------- */}
          <Card padding={4} radius={3} border>
            <Stack gap={3}>
              <Heading size={1}>À relire et publier ({toReview.length})</Heading>
              {toReview.length === 0 && <Text size={1} muted>Rien à relire pour l’instant.</Text>}
              {toReview.map((d) => (
                <Card key={d._id} padding={3} radius={2} tone="caution" as={IntentLink} intent="edit" params={{ id: d._id.replace(/^drafts\./, ''), type: 'guide' }}>
                  <Flex justify="space-between" gap={3}><Text weight="semibold">{d.title || 'Sans titre'}</Text><Text size={1} muted>{fmt(d._updatedAt)}</Text></Flex>
                </Card>
              ))}
              {edited.length > 0 && <Text size={1} muted>+ {edited.length} guide(s) publié(s) avec des modifications non publiées.</Text>}
            </Stack>
          </Card>

          <Grid gridTemplateColumns={[1, 1, 2]} gap={4}>
            {/* ---------- queue ---------- */}
            <Card padding={4} radius={3} border>
              <Stack gap={3}>
                <Heading size={1}>Prochaines questions</Heading>
                <Text size={1} muted>
                  {stats.queue.length ? `Environ ${weeksLeft} semaine(s) de guides. Quand la liste est vide, l’IA ajoute 8 idées toute seule.` : 'Vide : l’IA ajoutera 8 idées au prochain passage.'}
                </Text>
                <Flex gap={2}>
                  <Box flex={1}><TextInput value={newQuestion} placeholder="Ajouter une question…" onChange={(e) => setNewQuestion(e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && addQuestion()} /></Box>
                  <Button text="Ajouter" disabled={!newQuestion.trim()} onClick={addQuestion} />
                </Flex>
                {stats.queue.map((q, i) => (
                  <Flex key={q._id} align="center" gap={2}>
                    <Text size={1} muted>{i + 1}.</Text>
                    <Box flex={1}><Text size={1}>{q.text}</Text></Box>
                    <Button mode="bleed" tone="critical" text="✕" padding={2} title="Supprimer" onClick={() => removeQuestion(q._id)} />
                  </Flex>
                ))}
              </Stack>
            </Card>

            {/* ---------- latest ---------- */}
            <Card padding={4} radius={3} border>
              <Stack gap={3}>
                <Heading size={1}>Derniers guides publiés</Heading>
                {stats.latest.length === 0 && <Text size={1} muted>Aucun guide publié.</Text>}
                {stats.latest.map((g) => (
                  <Flex key={g._id} align="center" justify="space-between" gap={2}>
                    <Box flex={1}>
                      <Card as={IntentLink} intent="edit" params={{ id: g._id, type: 'guide' }} padding={1} radius={2}>
                        <Text size={1} weight="semibold">{g.title}</Text>
                      </Card>
                    </Box>
                    <Badge tone={g.posted ? 'positive' : 'default'}>{g.posted ? 'Threads ✓' : 'site'}</Badge>
                    <Button as="a" href={`/guides/${g.slug}`} target="_blank" mode="bleed" text="Voir ↗" padding={2} />
                  </Flex>
                ))}
              </Stack>
            </Card>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}

export const dashboardPlugin = definePlugin({
  name: 'grr-dashboard',
  tools: [{ name: 'dashboard', title: 'Tableau de bord', icon: DashboardIcon, component: Dashboard }],
})
