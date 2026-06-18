/**
 * sync-photos.ts
 *
 * Run after exporting JPGs from Lightroom:
 *   npm run sync
 *
 * What it does for each JPG in SAVED_PHOTOS_DIR:
 *   1. Finds the matching .xmp and .arw by basename in RAW_SEARCH_DIR (recursive)
 *   2. Expands any size abbreviation in photoshop:Instructions and writes it back to the source XMP
 *      (In Lightroom: Metadata panel → IPTC → Instructions field)
 *      Accepted shortcuts: sl/s4 → size: large | sm/s3 → size: medium | ss/s2/s1 → size: small
 *   3. Copies the JPG → public/photos/
 *   4. Copies the XMP → public/photos/ (so the build script can parse edits and size hint)
 *   5. Uploads the ARW to Firebase Storage at raw/{basename}.ARW
 *   6. Records the Firebase download URL in photos.overrides.json
 *   7. Runs npm run generate to regenerate photos.ts
 */

import { execSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename, extname, resolve } from 'path'
import { randomUUID } from 'crypto'
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { expandInstructionsInXmp, parseSizeHint, toCanonicalSizeLabel } from './generate-photos'

// ── Configuration ─────────────────────────────────────────────────────────────

const SAVED_PHOTOS_DIR = '/Users/benwilcox/Desktop/Everything/Pictures/Saved Photos'
const RAW_SEARCH_DIR = '/Users/benwilcox/Desktop/Everything/Pictures'
const PROJECT_ROOT = join(import.meta.dirname, '..')
const PUBLIC_PHOTOS_DIR = join(PROJECT_ROOT, 'public/photos')
const OVERRIDES_FILE = join(PROJECT_ROOT, 'photos.overrides.json')

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

// Walks a directory recursively and returns all file paths.
function walkDir(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full))
    } else {
      results.push(full)
    }
  }
  return results
}

// Finds a file by basename (case-insensitive) and extension within a directory tree.
function findByBasename(searchDir: string, stem: string, ext: string): string | null {
  const target = stem.toLowerCase() + ext.toLowerCase()
  const allFiles = walkDir(searchDir)
  return allFiles.find(f => basename(f).toLowerCase() === target) ?? null
}

async function uploadRaw(localPath: string, destName: string): Promise<string> {
  const token = randomUUID()
  const destination = `raw/${destName}`

  await bucket.upload(localPath, {
    destination,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
    },
  })

  const encodedPath = encodeURIComponent(destination)
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`
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
    const destJpg = join(PUBLIC_PHOTOS_DIR, file)
    const destXmp = join(PUBLIC_PHOTOS_DIR, stem + '.xmp')

    const alreadyHasRaw = typeof overrides[slug]?.rawUrl === 'string'
    const alreadyCopied = existsSync(destJpg)

    if (alreadyCopied && alreadyHasRaw) {
      console.log(`  skip  ${file} (already synced)`)
      skipped++
      continue
    }

    console.log(`\n  sync  ${file}`)

    // 1. Find matching XMP and ARW in Pictures/
    const xmpSrc = findByBasename(RAW_SEARCH_DIR, stem, '.xmp')
    const arwSrc = findByBasename(RAW_SEARCH_DIR, stem, '.arw')

    // 2. Expand size abbreviation in source XMP and write back
    if (xmpSrc) {
      const xmpContent = readFileSync(xmpSrc, 'utf-8')
      const instructionsMatch = xmpContent.match(/photoshop:Instructions="([^"]*)"/)
      const rawInstructions = instructionsMatch ? instructionsMatch[1] : ''
      const parsed = parseSizeHint(rawInstructions)

      if (parsed !== null) {
        const canonical = toCanonicalSizeLabel(parsed)
        if (rawInstructions !== canonical) {
          const updated = expandInstructionsInXmp(xmpContent, canonical)
          writeFileSync(xmpSrc, updated, 'utf-8')
          console.log(`        instructions: "${rawInstructions}" → "${canonical}"`)
        }
      }
    }

    // 3. Copy JPG to public/photos/
    if (!alreadyCopied) {
      copyFileSync(join(SAVED_PHOTOS_DIR, file), destJpg)
      console.log(`        copied jpg`)
    }

    // 4. Copy XMP to public/photos/
    if (xmpSrc) {
      copyFileSync(xmpSrc, destXmp)
      console.log(`        copied xmp`)
    } else {
      console.log(`        no xmp found`)
    }

    // 5. Upload ARW to Firebase Storage
    if (!alreadyHasRaw) {
      if (arwSrc) {
        console.log(`        uploading arw… (this may take a moment)`)
        const arwFilename = basename(arwSrc)
        const rawUrl = await uploadRaw(arwSrc, arwFilename)
        overrides[slug] = { ...(overrides[slug] ?? {}), rawUrl }
        console.log(`        uploaded → ${rawUrl.slice(0, 80)}…`)
      } else {
        console.log(`        no arw found — download will fall back to jpg`)
      }
    }

    synced++
  }

  // 6. Write updated overrides
  writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2) + '\n')
  console.log(`\nOverrides saved → photos.overrides.json`)

  // 7. Regenerate photos.ts
  console.log('Regenerating photos.ts…')
  execSync('npm run generate', { cwd: PROJECT_ROOT, stdio: 'inherit' })

  console.log(`\nDone. ${synced} synced, ${skipped} skipped.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
