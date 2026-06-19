/**
 * Asserts that vercel.json sets long-lived cache headers for the image directories.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * vercel.json is static JSON (no comments allowed), so tunability of the cache
 * window cannot be documented inline in the file itself. Instead, this test:
 *   1. Documents the intended value (SEVEN_DAYS_SECONDS = 604800) as a named
 *      constant, making it obvious where to change it.
 *   2. Serves as the "living specification" of which URL patterns get long caches
 *      and what the window is.
 *
 * To widen or narrow the cache window: update SEVEN_DAYS_SECONDS here AND the
 * corresponding max-age value in vercel.json (they must stay in sync for this
 * test to stay green).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ~7 days in seconds — the intended cache window for image assets.
// Change this constant (and the matching vercel.json value) to tune the window.
const SEVEN_DAYS_SECONDS = 604800

// The Cache-Control directive we expect on image directories.
const EXPECTED_CACHE_CONTROL = `public, max-age=${SEVEN_DAYS_SECONDS}, immutable`

// URL path prefixes served from the three image directories.
const IMAGE_PATH_PREFIXES = ['/photos/', '/thumbs/', '/display/']

// A sample of non-image routes that must NOT receive the long cache header.
const NON_IMAGE_PATHS = ['/', '/api', '/index.html', '/assets/app.js']

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

interface VercelHeader {
  key: string
  value: string
}

interface VercelHeadersRule {
  source: string
  headers: VercelHeader[]
}

interface VercelConfig {
  headers?: VercelHeadersRule[]
  rewrites?: Array<{ source: string; destination: string }>
  [key: string]: unknown
}

/** Returns the Cache-Control value from the headers rule whose source pattern
 *  matches `path`, or undefined if no rule matches. */
function getCacheControl(rules: VercelHeadersRule[], path: string): string | undefined {
  for (const rule of rules) {
    // Convert Vercel glob/path-to-regexp patterns to a simple prefix check:
    // e.g. "/photos/:path*" should match "/photos/foo.jpg"
    const normalized = rule.source
      .replace(/:path\*/g, '')   // remove :path* capture
      .replace(/\*/g, '')        // remove bare wildcards
      .replace(/\/$/, '')        // strip trailing slash

    if (path.startsWith(normalized + '/') || path === normalized) {
      const header = rule.headers.find(h => h.key === 'Cache-Control')
      return header?.value
    }
  }
  return undefined
}

// ────────────────────────────────────────────────────────────────────────────
// Load vercel.json relative to this file (ESM-safe __dirname replacement)
// scripts/ → ../vercel.json → subdomains/pictures-app/vercel.json
// ────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const vercelJsonPath = resolve(__dirname, '../vercel.json')
const config: VercelConfig = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'))

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('vercel.json cache-control headers', () => {
  it('has a "headers" array', () => {
    expect(Array.isArray(config.headers)).toBe(true)
    expect((config.headers ?? []).length).toBeGreaterThan(0)
  })

  it.each(IMAGE_PATH_PREFIXES)(
    'sets long Cache-Control on image prefix: %s',
    (prefix) => {
      const samplePath = `${prefix}some-image.jpg`
      const value = getCacheControl(config.headers ?? [], samplePath)
      expect(value).toBe(EXPECTED_CACHE_CONTROL)
    }
  )

  it.each(NON_IMAGE_PATHS)(
    'does NOT apply the long cache to non-image route: %s',
    (path) => {
      const value = getCacheControl(config.headers ?? [], path)
      expect(value).toBeUndefined()
    }
  )

  it('preserves existing rewrites (SPA fallback)', () => {
    expect(Array.isArray(config.rewrites)).toBe(true)
    const fallback = (config.rewrites ?? []).find(r => r.destination === '/index.html')
    expect(fallback).toBeDefined()
  })
})
