import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
  type RefObject,
} from 'react'
import { KeyboardNavContext, supportedCommands } from './keyboardNavContext'

type SectionRefMap = Map<string, RefObject<HTMLElement | null>>

export function KeyboardNavProvider({ children }: PropsWithChildren) {
  const [sectionRefs] = useState<SectionRefMap>(() => new Map())
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  const registerSection = useCallback(
    (projectId: string, ref: RefObject<HTMLElement | null>) => {
      sectionRefs.set(projectId, ref)
    },
    [sectionRefs],
  )

  const setActiveSection = useCallback((projectId: string) => {
    setActiveSectionId(projectId)
  }, [])

  const getSectionRef = useCallback(
    (projectId: string) => {
      return sectionRefs.get(projectId)
    },
    [sectionRefs],
  )

  const value = useMemo(
    () => ({
      registerSection,
      setActiveSection,
      getSectionRef,
      activeSectionId,
      supportedCommands,
    }),
    [registerSection, setActiveSection, getSectionRef, activeSectionId],
  )

  return <KeyboardNavContext.Provider value={value}>{children}</KeyboardNavContext.Provider>
}
