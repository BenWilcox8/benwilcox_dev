/**
 * sync-photos.ts
 *
 * Run after exporting JPGs from Lightroom (and optionally editing metadata on
 * the exported JPGs in Lightroom from the Saved Photos folder):
 *
 *   npm run sync
 *
 * For each JPG in SAVED_PHOTOS_DIR it:
 *   1. Copies the JPG → public/photos/  (skipped if already present)
 *   2. Reads editing fields from the raw folder XMP (.../Pictures/…/DSC*.xmp)
 *   3. Reads metadata from the Saved Photos XMP (.../Saved Photos/DSC*.xmp),
 *      created by Lightroom when you edit the exported JPG's metadata there.
 *      Saved Photos metadata takes priority over raw folder metadata.
 *   4. If the raw XMP contains metadata (title/caption/rating/instructions) but
 *      no Saved Photos XMP exists, migrates that metadata to a new Saved Photos
 *      XMP and strips it from the raw XMP (keeps raw XMP as edits-only).
 *   5. Expands any size abbreviation (sl/sm/ss/…) to canonical form ("size: large").
 *   6. Writes a single merged XMP → public/photos/  (always overwritten so
 *      metadata edits propagate on subsequent runs).
 *   7. Uploads the ARW to Firebase Storage  (skipped if already in overrides).
 *   8. Runs npm run generate.
 *
 * Deduplication guarantees:
 *   - JPG is never copied more than once (file-existence check).
 *   - ARW is never uploaded more than once (overrides.json rawUrl check).
 *   - One XMP per photo in public/photos/ (overwrite, not append).
 *   - One entry per slug in photos.overrides.json (keyed dict, not array).
 */

import { execSync } from 'child_process'
import {
  copyFileSync, existsSync, mkdirSync,
  readFileSync, readdirSync, statSync, writeFileSync,
} from 'fs'
import { join, basename, extname, resolve } from 'path'
import { randomUUID } from 'crypto'
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { parseSizeHint, toCanonicalSizeLabel, expandInstructionsInXmp } from './generate-photos'
import {
  extractXmpMetadata, hasAnyMetadata, stripXmpMetadata,
  buildMergedXmp, createMetadataOnlyXmp, type XmpMetadata,
} from './xmp-utils'

// ── Configuration ─────────────────────────────────────────────────────────────

const SAVED_PHOTOS_DIR = '/Users/benwilcox/Desktop/Everything/Pictures/Saved Photos'
const RAW_SEARCH_DIR   = '/Users/benwilcox/Desktop/Everything/Pictures'
const PROJECT_ROOT     = join(import.meta.dirname, '..')
const PUBLIC_PHOTOS_DIR = join(PROJECT_ROOT, 'public/photos')
const OVERRIDES_FILE   = join(PROJECT_ROOT, 'photos.overrides.json')

// ── Firebase init ──────────────────────────────────────────────────────────────

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!serviceAccountPath) {
  console.error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env')
  process.exit(1)
}

const serviceAccount = JSON.parse(
  readFileSync(resolve(serviceAccountPath.replace(/^~/, process.env.HOME ?? '')), 'utf-8')
)

const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET
if (!storageBucket) {
  console.error('VITE_FIREBASE_STORAGE_BUCKET is not set in .env')
  process.exit(1)
}

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
  storageBucket,
})

const bucket = getStorage().bucket()

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveSlug(filename: string): string {
  return basename(filename, extname(filename))
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function walkDir(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) results.push(...walkDir(full))
    else results.push(full)
  }
  return results
}

function findByBasename(searchDir: string, stem: string, ext: string): string | null {
  const target = stem.toLowerCase() + ext.toLowerCase()
  return walkDir(searchDir).find(f => basename(f).toLowerCase() === target) ?? null
}

async function uploadRaw(localPath: string, destName: string): Promise<string> {
  const token = randomUUID()
  const destination = `raw/${destName}`
  await bucket.upload(localPath, {
    destination,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`
}

// Merges metadata from Saved Photos XMP (priority) and raw XMP into a single
// output XMP in public/photos/. Returns true if the output file changed.
function processXmps(opts: {
  stem: string
  rawXmpSrc: string | null
  savedXmpPath: string
  destXmp: string
}): boolean {
  const { stem: _stem, rawXmpSrc, savedXmpPath, destXmp } = opts

  const rawXmpContent    = rawXmpSrc && existsSync(rawXmpSrc) ? readFileSync(rawXmpSrc, 'utf-8') : null
  const savedXmpContent  = existsSync(savedXmpPath) ? readFileSync(savedXmpPath, 'utf-8') : null

  if (!rawXmpContent && !savedXmpContent) return false

  // Extract metadata from both sources
  const rawMeta   = rawXmpContent  ? extractXmpMetadata(rawXmpContent)  : null
  const savedMeta = savedXmpContent ? extractXmpMetadata(savedXmpContent) : null

  // Saved Photos takes priority for every metadata field
  let mergedMeta: XmpMetadata = {
    title:        savedMeta?.title        ?? rawMeta?.title        ?? null,
    caption:      savedMeta?.caption      ?? rawMeta?.caption      ?? null,
    rating:       savedMeta?.rating       ?? rawMeta?.rating       ?? null,
    instructions: savedMeta?.instructions ?? rawMeta?.instructions ?? null,
  }

  // Expand size abbreviation to canonical form and write it back to source XMP
  if (mergedMeta.instructions) {
    const parsed = parseSizeHint(mergedMeta.instructions)
    if (parsed) {
      const canonical = toCanonicalSizeLabel(parsed)
      if (mergedMeta.instructions !== canonical) {
        mergedMeta = { ...mergedMeta, instructions: canonical }
        // Write canonical back to whichever source has the Instructions field
        if (savedXmpContent) {
          writeFileSync(savedXmpPath, expandInstructionsInXmp(savedXmpContent, canonical), 'utf-8')
        } else if (rawXmpSrc && rawXmpContent) {
          writeFileSync(rawXmpSrc, expandInstructionsInXmp(rawXmpContent, canonical), 'utf-8')
        }
        console.log(`        instructions: expanded to "${canonical}"`)
      }
    }
  }

  // Migration: raw XMP has metadata but no Saved Photos XMP yet →
  //   create Saved Photos XMP (metadata only) and strip metadata from raw XMP.
  //   This only runs once per photo (Saved Photos XMP is never overwritten).
  if (!savedXmpContent && rawMeta && hasAnyMetadata(rawMeta)) {
    const metaOnlyXmp = createMetadataOnlyXmp(mergedMeta)
    if (metaOnlyXmp) {
      writeFileSync(savedXmpPath, metaOnlyXmp, 'utf-8')
      console.log(`        metadata migrated → saved photos xmp created`)
    }
    if (rawXmpSrc && rawXmpContent) {
      writeFileSync(rawXmpSrc, stripXmpMetadata(rawXmpContent), 'utf-8')
      console.log(`        metadata stripped from raw xmp`)
    }
  }

  // Build merged output and write only if content changed
  const merged = buildMergedXmp(rawXmpContent, mergedMeta)
  if (!merged) return false

  const existing = existsSync(destXmp) ? readFileSync(destXmp, 'utf-8') : null
  if (existing === merged) return false

  writeFileSync(destXmp, merged, 'utf-8')
  return true
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(PUBLIC_PHOTOS_DIR, { recursive: true })

  const overrides: Record<string, Record<string, unknown>> = existsSync(OVERRIDES_FILE)
    ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf-8'))
    : {}

  const savedFiles = readdirSync(SAVED_PHOTOS_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f))

  if (savedFiles.length === 0) {
    console.log(`No images found in ${SAVED_PHOTOS_DIR}`)
    return
  }

  let synced = 0
  let skipped = 0

  for (const file of savedFiles) {
    const stem = basename(file, extname(file))
    const slug = deriveSlug(file)
    const destJpg  = join(PUBLIC_PHOTOS_DIR, file)
    const destXmp  = join(PUBLIC_PHOTOS_DIR, stem + '.xmp')

    const alreadyCopied  = existsSync(destJpg)
    const alreadyHasRaw  = typeof overrides[slug]?.rawUrl === 'string'

    // Locate source files (raw folder)
    const rawXmpSrc  = findByBasename(RAW_SEARCH_DIR, stem, '.xmp')
    const arwSrc     = findByBasename(RAW_SEARCH_DIR, stem, '.arw')
    // Saved Photos XMP (written by Lightroom when user edits the exported JPG)
    const savedXmpPath = join(SAVED_PHOTOS_DIR, stem + '.xmp')

    const actions: string[] = []

    // ── 1. Copy JPG ───────────────────────────────────────────────────────────
    // Skipped if already present; never overwrites an existing file.
    if (!alreadyCopied) {
      copyFileSync(join(SAVED_PHOTOS_DIR, file), destJpg)
      actions.push('jpg')
    }

    // ── 2. Process + merge XMPs ───────────────────────────────────────────────
    // Always runs so metadata edits made after first sync are picked up.
    // Writing a file with identical content is a no-op (content-diff check).
    const xmpChanged = processXmps({ stem, rawXmpSrc, savedXmpPath, destXmp })
    if (xmpChanged) actions.push('xmp')

    // ── 3. Upload ARW to Firebase ─────────────────────────────────────────────
    // Skipped if rawUrl already recorded in overrides (idempotent).
    if (!alreadyHasRaw) {
      if (arwSrc) {
        console.log(`\n  check ${file}`)
        console.log(`        uploading arw… (this may take a moment)`)
        const rawUrl = await uploadRaw(arwSrc, basename(arwSrc))
        overrides[slug] = { ...(overrides[slug] ?? {}), rawUrl }
        actions.push('raw→firebase')
        console.log(`        uploaded → ${rawUrl.slice(0, 80)}…`)
      } else {
        console.log(`\n  check ${file}`)
        console.log(`        no arw found — download will fall back to jpg`)
      }
    }

    if (actions.length > 0) {
      if (!actions.includes('raw→firebase')) console.log(`\n  sync  ${file}`)
      for (const a of actions) {
        if (a === 'jpg')  console.log(`        jpg copied`)
        if (a === 'xmp')  console.log(`        xmp merged`)
      }
      synced++
    } else {
      console.log(`  skip  ${file}`)
      skipped++
    }
  }

  // ── 4. Save overrides ─────────────────────────────────────────────────────
  writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2) + '\n')
  console.log(`\nOverrides saved → photos.overrides.json`)

  // ── 5. Regenerate photos.ts ───────────────────────────────────────────────
  console.log('Regenerating photos.ts…')
  execSync('npm run generate', { cwd: PROJECT_ROOT, stdio: 'inherit' })

  console.log(`\nDone. ${synced} synced, ${skipped} skipped.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
