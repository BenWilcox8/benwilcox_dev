import { test, expect } from 'vitest'
import { staleWorkingFiles } from './workingDir'

const slugOf = (f: string) => f.replace(/\.[^.]+$/, '').toLowerCase()

test('flags working files whose slug is not in the published (green) set', () => {
  const files = ['DSC001.jpg', 'DSC001.xmp', 'DSC002.jpg', 'DSC003.jpg']
  const green = new Set(['dsc001', 'dsc003'])
  expect(staleWorkingFiles(files, green, slugOf)).toEqual(['DSC002.jpg'])
})

test('keeps every file when all slugs are published', () => {
  const files = ['DSC001.jpg', 'DSC001.xmp', 'DSC002.jpg']
  const green = new Set(['dsc001', 'dsc002'])
  expect(staleWorkingFiles(files, green, slugOf)).toEqual([])
})

test('flags every file when nothing is published', () => {
  const files = ['DSC001.jpg', 'DSC002.xmp']
  expect(staleWorkingFiles(files, new Set(), slugOf)).toEqual(['DSC001.jpg', 'DSC002.xmp'])
})
