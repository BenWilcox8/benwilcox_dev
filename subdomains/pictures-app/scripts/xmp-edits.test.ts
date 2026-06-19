import { describe, it, expect } from 'vitest'
import { parseXmpEdits } from './xmp-edits'

// ── Attribute-form tests ───────────────────────────────────────────────────

describe('attribute form', () => {
  it('parses a positive float Exposure2012', () => {
    const xmp = `crs:Exposure2012="+0.50"`
    expect(parseXmpEdits(xmp)).toEqual({ Exposure2012: 0.5 })
  })

  it('parses a positive integer Contrast2012', () => {
    const xmp = `crs:Contrast2012="+16"`
    expect(parseXmpEdits(xmp)).toEqual({ Contrast2012: 16 })
  })

  it('parses Shadows2012 with leading +', () => {
    const xmp = `crs:Shadows2012="+50"`
    expect(parseXmpEdits(xmp)).toEqual({ Shadows2012: 50 })
  })

  it('omits zero-valued keys', () => {
    const xmp = `crs:Exposure2012="0.00" crs:Contrast2012="0"`
    expect(parseXmpEdits(xmp)).toEqual({})
  })

  it('omits keys not present', () => {
    const xmp = `crs:SomeOtherKey="42"`
    expect(parseXmpEdits(xmp)).toEqual({})
  })

  it('parses Sharpness without leading + (plain integer)', () => {
    const xmp = `crs:Sharpness="40"`
    expect(parseXmpEdits(xmp)).toEqual({ Sharpness: 40 })
  })

  it('parses ColorNoiseReduction without leading +', () => {
    const xmp = `crs:ColorNoiseReduction="25"`
    expect(parseXmpEdits(xmp)).toEqual({ ColorNoiseReduction: 25 })
  })
})

// ── Element-form tests ────────────────────────────────────────────────────

describe('element form', () => {
  it('parses Exposure2012 with leading +', () => {
    const xmp = `<crs:Exposure2012>+0.50</crs:Exposure2012>`
    expect(parseXmpEdits(xmp)).toEqual({ Exposure2012: 0.5 })
  })

  it('parses Contrast2012 with leading + integer', () => {
    const xmp = `<crs:Contrast2012>+16</crs:Contrast2012>`
    expect(parseXmpEdits(xmp)).toEqual({ Contrast2012: 16 })
  })

  it('parses Vibrance with leading +', () => {
    const xmp = `<crs:Vibrance>+11</crs:Vibrance>`
    expect(parseXmpEdits(xmp)).toEqual({ Vibrance: 11 })
  })

  it('parses Saturation with leading +', () => {
    const xmp = `<crs:Saturation>+8</crs:Saturation>`
    expect(parseXmpEdits(xmp)).toEqual({ Saturation: 8 })
  })

  it('parses Sharpness as plain integer', () => {
    const xmp = `<crs:Sharpness>40</crs:Sharpness>`
    expect(parseXmpEdits(xmp)).toEqual({ Sharpness: 40 })
  })

  it('parses ColorNoiseReduction as plain integer', () => {
    const xmp = `<crs:ColorNoiseReduction>25</crs:ColorNoiseReduction>`
    expect(parseXmpEdits(xmp)).toEqual({ ColorNoiseReduction: 25 })
  })

  it('omits zero-valued element keys', () => {
    const xmp = `<crs:Exposure2012>0</crs:Exposure2012><crs:Contrast2012>0</crs:Contrast2012>`
    expect(parseXmpEdits(xmp)).toEqual({})
  })
})

// ── Mixed / real-world snippets ───────────────────────────────────────────

describe('real-world snippets', () => {
  // DSC03829 is element-form. Expected non-zero edits:
  // Exposure +0.50, Contrast +16, Vibrance +11, Saturation +8, Sharpness 40, ColorNoiseReduction 25
  const dsc03829Snippet = `
  <crs:Blacks2012>0</crs:Blacks2012>
  <crs:Clarity2012>0</crs:Clarity2012>
  <crs:ColorNoiseReduction>25</crs:ColorNoiseReduction>
  <crs:Contrast2012>+16</crs:Contrast2012>
  <crs:Exposure2012>+0.50</crs:Exposure2012>
  <crs:Highlights2012>0</crs:Highlights2012>
  <crs:LuminanceSmoothing>0</crs:LuminanceSmoothing>
  <crs:Saturation>+8</crs:Saturation>
  <crs:Shadows2012>0</crs:Shadows2012>
  <crs:Sharpness>40</crs:Sharpness>
  <crs:Vibrance>+11</crs:Vibrance>
  <crs:Whites2012>0</crs:Whites2012>
  `

  it('parses DSC03829 element-form snippet with 6 non-zero edits', () => {
    expect(parseXmpEdits(dsc03829Snippet)).toEqual({
      Exposure2012: 0.5,
      Contrast2012: 16,
      Vibrance: 11,
      Saturation: 8,
      Sharpness: 40,
      ColorNoiseReduction: 25,
    })
  })

  // DSC02689 is attribute-form. Only non-zero managed key: Shadows2012=+50, Sharpness=40, ColorNoiseReduction=25
  const dsc02689Snippet = `
   crs:Exposure2012="0.00"
   crs:Contrast2012="0"
   crs:Highlights2012="0"
   crs:Shadows2012="+50"
   crs:Whites2012="0"
   crs:Blacks2012="0"
   crs:Clarity2012="0"
   crs:Vibrance="0"
   crs:Saturation="0"
   crs:Sharpness="40"
   crs:LuminanceSmoothing="0"
   crs:ColorNoiseReduction="25"
  `

  it('parses DSC02689 attribute-form snippet with 3 non-zero edits', () => {
    expect(parseXmpEdits(dsc02689Snippet)).toEqual({
      Shadows2012: 50,
      Sharpness: 40,
      ColorNoiseReduction: 25,
    })
  })

  it('zero-omission rule: no edits when all managed keys are zero', () => {
    const xmp = `
      crs:Exposure2012="0.00"
      crs:Contrast2012="0"
      <crs:Vibrance>0</crs:Vibrance>
      <crs:Saturation>0</crs:Saturation>
    `
    expect(parseXmpEdits(xmp)).toEqual({})
  })
})
