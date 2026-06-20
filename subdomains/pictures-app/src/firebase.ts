// Firebase client init (#36). The website reads its photo manifest from a
// single Firestore document at runtime; see PhotoDataProvider.
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)

/** Firestore collection holding the single photo manifest document. */
export const MANIFEST_COLLECTION = 'gallery'

/** Document id of the photo manifest within `MANIFEST_COLLECTION`. */
export const MANIFEST_DOC_ID = 'manifest'
