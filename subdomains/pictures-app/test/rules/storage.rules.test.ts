import { readFileSync } from 'fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { ref, getBytes, uploadString } from 'firebase/storage'
import { beforeAll, afterAll, test } from 'vitest'

let testEnv: RulesTestEnvironment

const OBJECT_PATH = 'display/dsc00001.webp'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-pictures-app',
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
  // Seed an object the sync would have uploaded, bypassing rules.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await uploadString(ref(ctx.storage(), OBJECT_PATH), 'fake-image-bytes')
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

test('anyone can read a storage object', async () => {
  const storage = testEnv.unauthenticatedContext().storage()
  await assertSucceeds(getBytes(ref(storage, OBJECT_PATH)))
})

test('a client cannot write a storage object', async () => {
  const storage = testEnv.unauthenticatedContext().storage()
  await assertFails(uploadString(ref(storage, 'display/dsc00002.webp'), 'nope'))
})
