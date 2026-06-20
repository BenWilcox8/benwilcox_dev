/**
 * Pure, side-effect-free helpers for the public Firebase Storage object layout.
 *
 * Photo binaries live in the public bucket at fixed, slug-based paths so their
 * URLs are clean and stable (the sync overwrites in place on every re-export).
 * Both the sync (Admin SDK upload destinations) and the manifest URLs are built
 * from these helpers, so the writer and the client agree on every path.
 *
 * Clean public URL shape (no download token — the objects are world-readable):
 *   https://storage.googleapis.com/<bucket>/<path>
 */

/** The kinds of per-photo object stored in the public bucket. */
export type StorageKind = 'thumb' | 'display' | 'full' | 'raw' | 'xmp'

const STORAGE_BASE = 'https://storage.googleapis.com'

/**
 * The object path (key) within the bucket for a photo's given kind. Slug-based
 * and stable, so re-exports overwrite in place.
 */
export function storageObjectPath(slug: string, kind: StorageKind): string {
  switch (kind) {
    case 'thumb':
      return `thumbs/${slug}.webp`
    case 'display':
      return `display/${slug}.webp`
    case 'full':
      return `photos/${slug}.jpg`
    case 'raw':
      return `raw/${slug}.arw`
    case 'xmp':
      return `photos/${slug}.xmp`
  }
}

/** The clean public URL for a photo's object of the given kind. */
export function buildStorageUrl(bucket: string, slug: string, kind: StorageKind): string {
  return `${STORAGE_BASE}/${bucket}/${storageObjectPath(slug, kind)}`
}

/** The three per-photo display URL fields written into the manifest record,
 *  pointing straight at the public Storage CDN. */
export interface StorageSrcs {
  thumbSrc: string
  displaySrc: string
  fullSrc: string
}

/** Builds the manifest's thumb/display/full URL fields for a photo slug. */
export function deriveStorageSrcs(bucket: string, slug: string): StorageSrcs {
  return {
    thumbSrc: buildStorageUrl(bucket, slug, 'thumb'),
    displaySrc: buildStorageUrl(bucket, slug, 'display'),
    fullSrc: buildStorageUrl(bucket, slug, 'full'),
  }
}
