import type { Project } from '../types/portfolio'

export const projects: Project[] = [
  {
    id: 'one-stop-greek',
    title: 'One Stop Greek',
    summary:
      'Mobile and web product for Greek life workflows with clean UX and high signal-to-noise information surfaces.',
    sectionLabel: 'deployment-log::osg',
    sectionVoice: 'Product launch energy with blunt status-readout formatting.',
    date: {
      month: 'January',
      year: 2026,
    },
    imageSrc: '/OSG_Screenshot.png',
    imageAlt: 'One Stop Greek screenshot',
    primaryLink: {
      label: 'Website',
      href: 'https://onestopgreek.com',
    },
    secondaryLinks: [
      {
        label: 'App Store',
        href: 'https://apps.apple.com/us/app/one-stop-greek/id6749855639',
      },
    ],
    variant: {
      tone: 'product',
      accentColor: '#4f46e5',
      personality: 'productSpec',
      borderStyle: 'solid',
    },
  },
  {
    id: 'unt-course-viewer',
    title: 'UNT Course Viewer',
    summary:
      'Search and planning experience that helps UNT students navigate degree pathways more efficiently.',
    sectionLabel: 'dataset-observer::unt',
    sectionVoice: 'Dense information architecture vibes with catalog-like spacing.',
    date: {
      month: 'July',
      year: 2025,
    },
    imageSrc: '/UNT_Courses.jpeg',
    imageAlt: 'UNT Course Viewer screenshot',
    primaryLink: {
      label: 'Live Site',
      href: 'https://unt.benwilcox.dev',
    },
    secondaryLinks: [
      {
        label: 'KERA Article',
        href: 'https://www.keranews.org/science-technology/2025-07-24/this-unt-sophomore-created-a-website-to-solve-a-common-issue-students-face-with-degree-planning',
      },
    ],
    variant: {
      tone: 'research',
      accentColor: '#f59e0b',
      personality: 'terminalLog',
      borderStyle: 'dashed',
    },
  },
  {
    id: 'fourier-desmos',
    title: 'Fourier Series in Desmos',
    summary:
      'Interactive mathematics storytelling through graph-based explorations that connect theory to visual intuition.',
    sectionLabel: 'math-engine::fourier',
    sectionVoice: 'Notebook-like math storytelling with theorem-adjacent pacing.',
    date: {
      month: 'March',
      year: 2025,
    },
    imageSrc: '/Fourier_Series_Screenshot.png',
    imageAlt: 'Fourier series Desmos screenshot',
    primaryLink: {
      label: 'Main Desmos Project',
      href: 'https://www.desmos.com/calculator/hhlxkexvtg',
    },
    subProjects: [
      {
        id: 'fourier-wave-build',
        title: 'Wave Composition Demo',
        description:
          'Shows harmonic layering with a slider-focused interface to make coefficient effects observable in real time.',
        imageAlt: 'Placeholder image for wave composition demo',
        links: [
          {
            label: 'Open Graph',
            href: 'https://www.desmos.com/calculator/hhlxkexvtg',
          },
        ],
      },
      {
        id: 'fourier-visual-notes',
        title: 'Visual Notes Companion',
        description:
          'Companion notes panel concept for explaining convergence behavior in plain language alongside the graph.',
        imageAlt: 'Placeholder image for Fourier visual notes',
        links: [
          {
            label: 'Reference Graph',
            href: 'https://www.desmos.com/calculator/hhlxkexvtg',
          },
        ],
      },
    ],
    variant: {
      tone: 'math',
      accentColor: '#06b6d4',
      personality: 'mathNotebook',
      borderStyle: 'solid',
    },
  },
]
