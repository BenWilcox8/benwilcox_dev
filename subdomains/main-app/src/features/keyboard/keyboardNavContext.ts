import { createContext, type RefObject } from 'react'

export type KeyboardCommand = 'nextSection' | 'previousSection' | 'focusCurrentSection'

type KeyboardNavContextValue = {
  registerSection: (projectId: string, ref: RefObject<HTMLElement | null>) => void
  setActiveSection: (projectId: string) => void
  getSectionRef: (projectId: string) => RefObject<HTMLElement | null> | undefined
  activeSectionId: string | null
  supportedCommands: KeyboardCommand[]
}

export const supportedCommands: KeyboardCommand[] = [
  'nextSection',
  'previousSection',
  'focusCurrentSection',
]

export const KeyboardNavContext = createContext<KeyboardNavContextValue | null>(null)
