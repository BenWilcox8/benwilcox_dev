import { useEffect } from 'react'
import { projects } from '../content/projects'
import { useKeyboardNav } from '../features/keyboard/useKeyboardNav'
import { useActiveProjectId } from '../hooks/useActiveProjectId'
import { DateIndicator } from './DateIndicator'
import { TimelineItem } from './TimelineItem'

function formatProjectDate(projectId: string) {
  const matchedProject = projects.find((project) => project.id === projectId)
  if (!matchedProject) {
    return ''
  }

  return `${matchedProject.date.month}, ${matchedProject.date.year}`
}

export function TimelinePage() {
  const projectIds = projects.map((project) => project.id)
  const activeProjectId = useActiveProjectId(projectIds)
  const { setActiveSection } = useKeyboardNav()

  useEffect(() => {
    if (activeProjectId) {
      setActiveSection(activeProjectId)
    }
  }, [activeProjectId, setActiveSection])

  return (
    <section className="timeline-page" aria-label="Project timeline">
      <DateIndicator dateLabel={formatProjectDate(activeProjectId)} />
      <div className="timeline-rail" aria-hidden="true" />
      {projects.map((project, index) => {
        const align = index % 2 === 0 ? 'right' : 'left'
        return <TimelineItem key={project.id} project={project} align={align} />
      })}
    </section>
  )
}
