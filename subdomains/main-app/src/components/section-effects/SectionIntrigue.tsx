import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { ISourceOptions } from '@tsparticles/engine'
import { Noise, useNoiseConfig } from 'react-noise'
import type { ProjectVariantConfig } from '../../types/portfolio'

type SectionIntrigueProps = {
  personality: ProjectVariantConfig['personality']
  accentColor: string
  projectId: string
}

const miniParticleOptions: ISourceOptions = {
  fpsLimit: 60,
  particles: {
    number: { value: 10 },
    color: { value: '#2f4a9e' },
    opacity: { value: { min: 0.08, max: 0.18 } },
    size: { value: { min: 1, max: 2 } },
    move: {
      enable: true,
      speed: 0.3,
      direction: 'none',
      random: true,
      outModes: { default: 'bounce' },
    },
  },
  detectRetina: true,
  interactivity: {
    events: {
      onHover: { enable: false, mode: [] },
      onClick: { enable: false, mode: [] },
    },
  },
}

function getNoiseConfig(personality: ProjectVariantConfig['personality']) {
  switch (personality) {
    case 'terminalLog':
      return { key: 'noise-terminal-log', color: '80 116 187', opacity: 0.06 }
    case 'productSpec':
      return { key: 'noise-product-spec', color: '154 120 204', opacity: 0.055 }
    case 'mathNotebook':
      return { key: 'noise-math-notebook', color: '88 145 169', opacity: 0.07 }
    default:
      return { key: 'noise-default', color: '120 120 120', opacity: 0.05 }
  }
}

export function SectionIntrigue({ personality, accentColor, projectId }: SectionIntrigueProps) {
  const [particlesReady, setParticlesReady] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const hasParticles = personality === 'mathNotebook' && !reducedMotion
  const noiseConfig = useMemo(() => getNoiseConfig(personality), [personality])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', onChange)
    return () => {
      mediaQuery.removeEventListener('change', onChange)
    }
  }, [])

  useNoiseConfig(
    {
      key: noiseConfig.key,
      color: noiseConfig.color,
      opacity: reducedMotion ? noiseConfig.opacity * 0.8 : noiseConfig.opacity,
      resolution: { width: 480, height: 300 },
    },
    [noiseConfig, reducedMotion],
  )

  useEffect(() => {
    if (!hasParticles) {
      return
    }

    void initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setParticlesReady(true)
    })
  }, [hasParticles])

  const accentStyle = useMemo(
    () =>
      ({
        '--section-accent': accentColor,
      }) as CSSProperties,
    [accentColor],
  )

  return (
    <div className={`section-intrigue section-intrigue-${personality}`} style={accentStyle} aria-hidden="true">
      <Noise className="section-noise" noiseKey={noiseConfig.key} />
      <span className="section-accent section-accent-primary" />
      <span className="section-accent section-accent-secondary" />

      {hasParticles && particlesReady ? (
        <Particles
          id={`particles-${projectId}`}
          className="section-mini-particles"
          options={miniParticleOptions}
        />
      ) : null}
    </div>
  )
}
