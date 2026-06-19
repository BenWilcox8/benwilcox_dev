/**
 * Pure, side-effect-free derivation of the three per-photo URL sources.
 *
 *   thumbSrc   — ~400 px wide WebP, served from /thumbs/
 *   displaySrc — ~1600 px wide WebP, served from /display/
 *   fullSrc    — original full-resolution JPG/PNG, served from /photos/
 *
 * The slug (used as the WebP filename stem) matches the slug derivation used
 * in generate-photos.ts: lowercase, spaces/underscores → hyphens, non-alnum
 * characters stripped.
 *
 * This function is intentionally dependency-free so it can be unit-tested
 * without touching the filesystem.
 */

export interface PhotoSrcs {
  thumbSrc: string
  displaySrc: string
  fullSrc: string
}

/**
 * Derive the three URL sources for a photo given its original filename
 * (just the basename, e.g. "DSC02689.jpg").
 */
export function derivePhotoSrcs(filename: string): PhotoSrcs {
  const slug = filenameToSlug(filename)
  return {
    thumbSrc: `/thumbs/${slug}.webp`,
    displaySrc: `/display/${slug}.webp`,
    fullSrc: `/photos/${filename}`,
  }
}

/**
 * Converts a filename (without extension) to a URL slug.
 * Matches the logic in generate-photos.ts / sync-photos.ts.
 */
function filenameToSlug(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  const stem = dotIndex !== -1 ? filename.slice(0, dotIndex) : filename
  return stem
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
