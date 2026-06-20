// Admin-SDK access to the single published gallery manifest document. The
// generate step reads the PREVIOUS manifest from here (the reconcile's
// previous-state source, replacing photos.order.json — issue #41) and writes
// the freshly-reconciled manifest straight back.
//
// The manifest path is duplicated from src/firebase.ts on purpose: that module
// pulls in the browser ("firebase/app") client SDK, which must not be imported
// into a Node/Admin script. Reader, writer, and security rules still agree on
// the same path.

import { getFirestore } from 'firebase-admin/firestore'
import type { PhotoData } from '../src/content/photoData'

export const MANIFEST_COLLECTION = 'gallery'
export const MANIFEST_DOC_ID = 'manifest'

function manifestRef() {
  return getFirestore().collection(MANIFEST_COLLECTION).doc(MANIFEST_DOC_ID)
}

/** The previous published manifest, or null when none has been written yet. */
export async function readManifest(): Promise<PhotoData | null> {
  const snapshot = await manifestRef().get()
  if (!snapshot.exists) return null
  return (snapshot.data() as PhotoData) ?? null
}

/** Overwrite the single manifest document with the freshly-reconciled data. */
export async function writeManifest(manifest: PhotoData): Promise<void> {
  await manifestRef().set(manifest)
}

/**
 * The rawUrl already recorded per slug on the previous manifest. The sync uses
 * this to skip re-uploading an ARW whose public URL is already published
 * (replacing the old photos.overrides.json `rawUrl` bookkeeping), and generate
 * uses it to carry the URL forward onto the freshly-discovered photo.
 */
export async function readRawUrls(): Promise<Record<string, string>> {
  const manifest = await readManifest()
  const map: Record<string, string> = {}
  for (const photo of manifest?.photos ?? []) {
    if (typeof photo.rawUrl === 'string') map[photo.slug] = photo.rawUrl
  }
  return map
}
