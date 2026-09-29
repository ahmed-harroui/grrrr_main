import { useState } from 'react'
import { Box, Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { set, useFormValue, type ObjectInputProps } from 'sanity'

type Location = { lat?: number; lng?: number }

/** "📍 Localiser l'adresse" button + map preview on top of the plain lat/lng fields. */
export function LocationInput(props: ObjectInputProps<Location>) {
  const address = useFormValue(['address']) as string | undefined
  const [state, setState] = useState<{ busy?: boolean; error?: string; label?: string }>({})
  const { lat, lng } = props.value ?? {}

  async function locate() {
    setState({ busy: true })
    try {
      const res = await fetch('/api/studio/partners', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'geocode', address }) })
      const json = (await res.json()) as { lat?: number; lng?: number; label?: string; error?: string }
      if (!res.ok || json.lat == null) throw new Error(json.error ?? `Erreur ${res.status}`)
      props.onChange(set({ lat: json.lat, lng: json.lng }))
      setState({ label: json.label })
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : String(err) })
    }
  }

  const d = 0.004
  const mapUrl = lat != null && lng != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`
    : null

  return (
    <Stack gap={3}>
      <Flex gap={3} align="center" wrap="wrap">
        <Button text={state.busy ? 'Recherche…' : '📍 Localiser l’adresse'} tone="primary" mode="ghost" disabled={state.busy || !address?.trim()} onClick={locate} />
        {!address?.trim() && <Text size={1} muted>Remplis d’abord l’adresse.</Text>}
      </Flex>
      {state.error && <Card padding={3} radius={2} tone="critical"><Text size={1}>{state.error}</Text></Card>}
      {state.label && <Text size={1} muted>Trouvé : {state.label}</Text>}
      {mapUrl && (
        <Card radius={2} overflow="hidden" border>
          <iframe title="Aperçu de la carte" src={mapUrl} style={{ width: '100%', height: 240, border: 0, display: 'block' }} loading="lazy" />
        </Card>
      )}
      <Box>{props.renderDefault(props)}</Box>
      <Text size={0} muted>Vérifie que le repère tombe au bon endroit. Tu peux corriger la latitude et la longitude à la main.</Text>
    </Stack>
  )
}
