import { readFileSync } from 'fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { beforeAll, afterAll, test } from 'vitest'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-pictures-app',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

test('anyone can read the gallery manifest document', async () => {
  const db = testEnv.unauthenticatedContext().firestore()
  await assertSucceeds(getDoc(doc(db, 'gallery', 'manifest')))
})

test('a client cannot write the gallery manifest document', async () => {
  const db = testEnv.unauthenticatedContext().firestore()
  await assertFails(setDoc(doc(db, 'gallery', 'manifest'), { photos: [] }))
})
