import { useEffect, useState } from 'react'

export function useActiveProjectId(projectIds: string[]) {
  const [activeProjectId, setActiveProjectId] = useState<string>(projectIds[0] ?? '')

  useEffect(() => {
    if (!projectIds.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visibleEntries[0]?.target.id) {
          setActiveProjectId(visibleEntries[0].target.id)
        }
      },
      {
        rootMargin: '-30% 0px -30% 0px',
        threshold: [0.25, 0.5, 0.75],
      },
    )

    projectIds.forEach((projectId) => {
      const node = document.getElementById(projectId)
      if (node) {
        observer.observe(node)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [projectIds])

  return activeProjectId
}
