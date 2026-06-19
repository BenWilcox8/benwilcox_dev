/**
 * display-meta.ts
 *
 * Pure field-resolution logic that makes the exported JPG the single source
 * of truth for the four "display/managed" fields — title, caption, rating, and
 * keywords — as well as extDescr and altText.
 *
 * Rules:
 *  - JPG is ALWAYS authoritative for every display field, whether or not the
 *    field is empty. A cleared field on the JPG overwrites a stale XMP value.
 *  - crs: editing instructions live exclusively in the XMP and are never touched
 *    here (they are outside the Meta interface entirely).
 *  - The collection tag is a pure projection: it is stripped from the JPG
 *    keywords to get the "real" keyword set (which is authoritative), then
 *    prepended back onto desiredJpgKeywords. It is NEVER written into the XMP.
 */

import type { Meta } from './metadata'

export interface ResolveResult {
  /** The authoritative display meta (JPG wins; collection tag excluded from keywords). */
  authoritative: Meta
  /** The keyword list that the JPG should carry (authoritative keywords + collection tag at front). */
  desiredJpgKeywords: string[]
  /** True when the XMP must be updated to match the authoritative meta. */
  xmpNeedsUpdate: boolean
}

// Case-insensitive removal of a single tag from a keyword list.
function withoutTag(keywords: string[], tagLc: string): string[] {
  if (!tagLc) return keywords
  return keywords.filter(k => k.toLowerCase() !== tagLc)
}

function keywordsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function metaMatchesAuthoritative(xmp: Meta, auth: Meta): boolean {
  return (
    xmp.title === auth.title &&
    xmp.caption === auth.caption &&
    xmp.rating === auth.rating &&
    xmp.extDescr === auth.extDescr &&
    xmp.altText === auth.altText &&
    keywordsEqual(xmp.keywords, auth.keywords)
  )
}

/**
 * Given the current metadata read from the exported JPG and the raw XMP
 * sidecar, and the current collection tag for the folder (or null), returns:
 *
 *  - `authoritative`: the display meta the website should render and the XMP
 *    should mirror. Always equals the JPG meta with the collection tag stripped
 *    from keywords (so the tag projection never leaks into the raw sidecar).
 *
 *  - `desiredJpgKeywords`: the keyword list the JPG itself should carry
 *    (= authoritative keywords with the collection tag prepended if applicable).
 *
 *  - `xmpNeedsUpdate`: true when the XMP metadata differs from `authoritative`
 *    and must be written back.
 *
 * When `xmpMeta` is null (no raw sidecar exists), `xmpNeedsUpdate` is always
 * false (nothing to write back).
 */
export function resolveDisplayMeta(
  jpgMeta: Meta,
  xmpMeta: Meta | null,
  collectionTag: string | null,
): ResolveResult {
  const tagLc = collectionTag?.toLowerCase() ?? ''

  // Strip the collection tag from the JPG keywords to get the "real" keyword
  // set that is authoritative and should be mirrored in the XMP.
  const realKeywords = tagLc ? withoutTag(jpgMeta.keywords, tagLc) : jpgMeta.keywords

  // The JPG is the single source of truth for all display fields.
  const authoritative: Meta = {
    title: jpgMeta.title,
    caption: jpgMeta.caption,
    rating: jpgMeta.rating,
    keywords: realKeywords,
    extDescr: jpgMeta.extDescr,
    altText: jpgMeta.altText,
  }

  // Desired JPG keywords: authoritative keywords with the collection tag at front.
  let desiredJpgKeywords: string[]
  if (collectionTag) {
    // Prepend the tag (after stripping any existing copy to avoid duplicates).
    desiredJpgKeywords = [collectionTag, ...withoutTag(realKeywords, tagLc)]
  } else {
    desiredJpgKeywords = realKeywords
  }

  const xmpNeedsUpdate =
    xmpMeta !== null && !metaMatchesAuthoritative(xmpMeta, authoritative)

  return { authoritative, desiredJpgKeywords, xmpNeedsUpdate }
}
