export interface XmpMetadata {
  title: string | null
  caption: string | null
  rating: string | null
  instructions: string | null
}

// ── Reading ───────────────────────────────────────────────────────────────────

export function extractXmpMetadata(content: string): XmpMetadata {
  return {
    title: extractRdfAlt(content, 'dc:title'),
    caption: extractRdfAlt(content, 'dc:description'),
    rating: extractField(content, 'xmp:Rating'),
    instructions: extractField(content, 'photoshop:Instructions'),
  }
}

function extractRdfAlt(content: string, tag: string): string | null {
  // Matches: <dc:title><rdf:Alt><rdf:li xml:lang="x-default">VALUE</rdf:li></rdf:Alt></dc:title>
  const re = new RegExp(`<${tag}>[\\s\\S]*?<rdf:li[^>]*>([\\s\\S]*?)<\\/rdf:li>`)
  return content.match(re)?.[1]?.trim() ?? null
}

function extractField(content: string, tag: string): string | null {
  // Attribute form: tag="value"
  const attrMatch = content.match(new RegExp(`${tag}="([^"]*)"`) )
  if (attrMatch) return attrMatch[1] || null
  // Element form: <tag>value</tag>
  const elemMatch = content.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))
  return elemMatch?.[1]?.trim() || null
}

export function hasAnyMetadata(meta: XmpMetadata): boolean {
  return meta.title !== null || meta.caption !== null ||
    meta.rating !== null || meta.instructions !== null
}

// ── Stripping (for cleaning raw XMP of metadata fields) ──────────────────────

export function stripXmpMetadata(content: string): string {
  let r = content
  r = r.replace(/<dc:title>[\s\S]*?<\/dc:title>\s*/g, '')
  r = r.replace(/<dc:description>[\s\S]*?<\/dc:description>\s*/g, '')
  r = r.replace(/<xmp:Rating>[^<]*<\/xmp:Rating>\s*/g, '')
  r = r.replace(/<photoshop:Instructions>[^<]*<\/photoshop:Instructions>\s*/g, '')
  r = r.replace(/\s*xmp:Rating="[^"]*"/g, '')
  r = r.replace(/\s*photoshop:Instructions="[^"]*"/g, '')
  return r
}

// ── Building ──────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function extractCrsAttributes(content: string): string[] {
  const attrs: string[] = []
  const re = /\bcrs:(\w+)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    attrs.push(`crs:${m[1]}="${m[2]}"`)
  }
  return attrs
}

// Builds a clean merged XMP from raw editing fields + metadata.
// crs:* and photoshop:Instructions are written as attributes on rdf:Description.
// dc:title, dc:description, xmp:Rating are written as child elements.
export function buildMergedXmp(rawXmpContent: string | null, meta: XmpMetadata): string {
  const crsAttrs = rawXmpContent ? extractCrsAttributes(rawXmpContent) : []
  const hasElements = meta.title !== null || meta.caption !== null || meta.rating !== null

  if (crsAttrs.length === 0 && !hasAnyMetadata(meta)) return ''

  // Namespace declarations
  const ns: string[] = []
  if (crsAttrs.length > 0) ns.push(`    xmlns:crs='http://ns.adobe.com/camera-raw-settings/1.0/'`)
  if (meta.title !== null || meta.caption !== null) ns.push(`    xmlns:dc='http://purl.org/dc/elements/1.1/'`)
  if (meta.rating !== null) ns.push(`    xmlns:xmp='http://ns.adobe.com/xap/1.0/'`)
  if (meta.instructions !== null) ns.push(`    xmlns:photoshop='http://ns.adobe.com/photoshop/1.0/'`)

  // Attribute-form properties
  const attrLines: string[] = crsAttrs.map(a => `    ${a}`)
  if (meta.instructions !== null) attrLines.push(`    photoshop:Instructions="${escapeXml(meta.instructions)}"`)

  // Element-form properties
  const elemLines: string[] = []
  if (meta.title !== null) {
    elemLines.push(
      `   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(meta.title)}</rdf:li></rdf:Alt></dc:title>`
    )
  }
  if (meta.caption !== null) {
    elemLines.push(
      `   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(meta.caption)}</rdf:li></rdf:Alt></dc:description>`
    )
  }
  if (meta.rating !== null) {
    elemLines.push(`   <xmp:Rating>${escapeXml(meta.rating)}</xmp:Rating>`)
  }

  const descLines = [
    `  <rdf:Description rdf:about=''`,
    ...ns,
    ...attrLines,
    hasElements ? `  >` : `  />`,
  ]

  const lines = [
    `<?xpacket begin='' id='W5M0MpCehiHzreSzNTczkc9d'?>`,
    `<x:xmpmeta xmlns:x='adobe:ns:meta/'>`,
    ` <rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>`,
    ...descLines,
    ...elemLines,
    ...(hasElements ? [`  </rdf:Description>`] : []),
    ` </rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end='w'?>`,
  ]

  return lines.join('\n')
}

// Creates a minimal XMP file containing only metadata (no editing fields).
// Used when migrating metadata from the raw XMP to the Saved Photos folder.
export function createMetadataOnlyXmp(meta: XmpMetadata): string {
  return buildMergedXmp(null, meta)
}
