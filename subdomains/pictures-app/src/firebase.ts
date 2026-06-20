/**
 * Firebase client initialization for the website's read-only runtime.
 *
 * The site reads the published gallery manifest from Firestore; it never writes
 * (the sync uses the Admin SDK, which bypasses security rules). Config comes
 * entirely from the `VITE_FIREBASE_*` env vars — no secrets are hard-coded, and
 * the Firebase web config is safe to ship to the browser (access is governed by
 * the security rules, not by hiding these values).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Reuse an already-initialized app across HMR reloads / repeat imports.
export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db: Firestore = getFirestore(firebaseApp)

/**
 * The single published-gallery manifest document — read at runtime by the
 * website (issue #37) and written by the sync. Keyed here so the reader, the
 * writer, and the security rules all agree on the path.
 */
export const MANIFEST_COLLECTION = 'gallery'
export const MANIFEST_DOC_ID = 'manifest'
