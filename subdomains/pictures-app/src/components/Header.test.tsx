import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from './Header'

describe('Header', () => {
  it('renders the author name link pointing to benwilcox.dev', () => {
    render(<Header />)
    const link = screen.getByRole('link', { name: /benjamin wilcox/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://benwilcox.dev')
  })

  it('renders an Instagram link', () => {
    render(<Header />)
    const instagram = screen.getByRole('link', { name: /instagram/i })
    expect(instagram).toBeInTheDocument()
    expect(instagram).toHaveAttribute('href', expect.stringContaining('instagram.com'))
  })

  it('renders a LinkedIn link', () => {
    render(<Header />)
    const linkedin = screen.getByRole('link', { name: /linkedin/i })
    expect(linkedin).toBeInTheDocument()
    expect(linkedin).toHaveAttribute('href', expect.stringContaining('linkedin.com'))
  })
})
