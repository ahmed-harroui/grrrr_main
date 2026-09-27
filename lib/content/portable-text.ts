import type { AiBlock, PortableBlock, PortableSpan } from './schema'

export function key() {
  return Math.random().toString(36).slice(2, 12)
}

/** "**bold** and *italic*" → Portable Text spans. */
function toSpans(text: string): PortableSpan[] {
  const spans: PortableSpan[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0
  for (let m; (m = re.exec(text)); last = re.lastIndex) {
    if (m.index > last) spans.push({ _type: 'span', _key: key(), text: text.slice(last, m.index), marks: [] })
    spans.push({ _type: 'span', _key: key(), text: m[1] ?? m[2], marks: [m[1] ? 'strong' : 'em'] })
  }
  if (last < text.length || spans.length === 0) spans.push({ _type: 'span', _key: key(), text: text.slice(last), marks: [] })
  return spans
}

export function aiBlocksToPortable(blocks: AiBlock[]): PortableBlock[] {
  return blocks.map(({ style, text }) => {
    const list = style === 'bullet' || style === 'number'
    return {
      _type: 'block',
      _key: key(),
      style: list ? 'normal' : style,
      ...(list ? { listItem: style, level: 1 } : {}),
      markDefs: [],
      children: toSpans(text),
    }
  })
}

export function portableToAiBlocks(blocks: PortableBlock[] = []): AiBlock[] {
  return blocks
    .filter((b) => b._type === 'block')
    .map((b) => ({
      style: (b.listItem ?? b.style ?? 'normal') as AiBlock['style'],
      text: (b.children ?? [])
        .map((s) => (s.marks?.includes('strong') ? `**${s.text}**` : s.marks?.includes('em') ? `*${s.text}*` : s.text))
        .join(''),
    }))
}

export function portableToPlainText(blocks: PortableBlock[] = []) {
  return portableToAiBlocks(blocks).map((b) => b.text).join('\n\n')
}
