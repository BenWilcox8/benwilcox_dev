import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from './Header'

describe('Header', () => {
  it('renders Instagram link', () => {
    render(<Header />)
    const link = screen.getByRole('link', { name: 'Instagram' })
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/ben_the_user/')
  })

  it('renders LinkedIn link', () => {
    render(<Header />)
    const link = screen.getByRole('link', { name: 'LinkedIn' })
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/benwilcox2005/')
  })

  it('renders GitHub link', () => {
    render(<Header />)
    const link = screen.getByRole('link', { name: 'GitHub' })
    expect(link).toHaveAttribute('href', 'https://github.com/BenWilcox8/benwilcox_dev/tree/main/subdomains/pictures-app')
  })
})
