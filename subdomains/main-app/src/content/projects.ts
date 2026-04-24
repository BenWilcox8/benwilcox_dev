import type { Project } from '../types/portfolio'

export const projects: Project[] = [
  {
    id: 'one-stop-greek',
    title: 'One Stop Greek',
    summary:
      'Mobile and web product for Greek life workflows with clean UX and high signal-to-noise information surfaces.',
    date: {
      month: 'January',
      year: 2026,
    },
    imageAlt: 'Placeholder image representing One Stop Greek mobile product',
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
      borderStyle: 'solid',
    },
  },
  {
    id: 'unt-course-viewer',
    title: 'UNT Course Viewer',
    summary:
      'Search and planning experience that helps UNT students navigate degree pathways more efficiently.',
    date: {
      month: 'July',
      year: 2025,
    },
    imageAlt: 'Placeholder image representing UNT Course Viewer interface',
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
      borderStyle: 'dashed',
    },
  },
  {
    id: 'fourier-desmos',
    title: 'Fourier Series in Desmos',
    summary:
      'Interactive mathematics storytelling through graph-based explorations that connect theory to visual intuition.',
    date: {
      month: 'March',
      year: 2025,
    },
    imageAlt: 'Placeholder image representing Fourier series graphing project',
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
      borderStyle: 'solid',
    },
  },
]
