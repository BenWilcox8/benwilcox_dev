/**
 * Parses Lightroom develop settings (crs: namespace) from XMP sidecar content.
 *
 * Lightroom writes `crs:` keys in TWO serializations:
 *   - Attribute form:  crs:Exposure2012="+0.50"
 *   - Element form:    <crs:Exposure2012>+0.50</crs:Exposure2012>
 *
 * Both forms are handled here. Zero values are omitted (same as Lightroom's
 * "no adjustment" default).
 */

export const XMP_EDIT_KEYS = [
  'Exposure2012',
  'Contrast2012',
  'Highlights2012',
  'Shadows2012',
  'Whites2012',
  'Blacks2012',
  'Clarity2012',
  'Vibrance',
  'Saturation',
  'Sharpness',
  'LuminanceSmoothing',
  'ColorNoiseReduction',
] as const

export type XmpEditKey = (typeof XMP_EDIT_KEYS)[number]

export function parseXmpEdits(xmpContent: string): Record<string, number> {
  const edits: Record<string, number> = {}
  for (const key of XMP_EDIT_KEYS) {
    // Try attribute form first: crs:Key="value"
    const attrMatch = xmpContent.match(new RegExp(`crs:${key}="([^"]+)"`))
    if (attrMatch) {
      const val = parseFloat(attrMatch[1])
      if (!isNaN(val) && val !== 0) edits[key] = val
      continue
    }
    // Try element form: <crs:Key>value</crs:Key>
    const elemMatch = xmpContent.match(new RegExp(`<crs:${key}>([^<]+)</crs:${key}>`))
    if (elemMatch) {
      const val = parseFloat(elemMatch[1])
      if (!isNaN(val) && val !== 0) edits[key] = val
    }
  }
  return edits
}
