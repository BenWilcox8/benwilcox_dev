import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { SectionIntrigue } from './section-effects/SectionIntrigue'
import { useKeyboardNav } from '../features/keyboard/useKeyboardNav'
import type { Project } from '../types/portfolio'

type TimelineItemProps = {
  project: Project
  align: 'left' | 'right'
}

export function TimelineItem({ project, align }: TimelineItemProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const { registerSection } = useKeyboardNav()

  useEffect(() => {
    registerSection(project.id, sectionRef)
  }, [registerSection, project.id])

  const sectionStyles = useMemo(
    () =>
      ({
        '--project-accent': project.variant.accentColor,
      }) as CSSProperties,
    [project.variant.accentColor],
  )

  return (
    <section
      id={project.id}
      ref={sectionRef}
      className={`timeline-item timeline-item-${align} project-tone-${project.variant.tone} project-personality-${project.variant.personality}`}
      style={sectionStyles}
      tabIndex={-1}
      aria-label={project.title}
    >
      <div className={`project-card project-border-${project.variant.borderStyle ?? 'solid'}`}>
        <SectionIntrigue
          personality={project.variant.personality}
          accentColor={project.variant.accentColor}
          projectId={project.id}
        />
        <div className="project-grid">
          <div className="project-content">
            <p className="section-label">{project.sectionLabel}</p>
            <p className="project-date">
              {project.date.month}, {project.date.year}
            </p>
            <h2>{project.title}</h2>
            <p>{project.summary}</p>
            <p className="section-voice">{project.sectionVoice}</p>

            <div className="project-links">
              <a href={project.primaryLink.href} target="_blank" rel="noreferrer">
                {project.primaryLink.label}
              </a>
              {project.secondaryLinks?.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>

            {project.subProjects?.length ? (
              <div className="sub-projects" aria-label={`${project.title} sub projects`}>
                {project.subProjects.map((subProject) => (
                  <article key={subProject.id} className="sub-project">
                    <h3>{subProject.title}</h3>
                    <p>{subProject.description}</p>
                    <p className="asset-note asset-note-subproject" aria-label={subProject.imageAlt}>
                      subproject_visual: inherit_parent_graph_context
                    </p>
                    <div className="project-links">
                      {subProject.links.map((link) => (
                        <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <figure className="project-media">
            <img className="project-image" src={project.imageSrc} alt={project.imageAlt} loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  )
}
