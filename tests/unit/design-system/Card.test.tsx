import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '@renderer/design-system'

describe('Card', () => {
  it('renders children inside a surface container', () => {
    render(<Card>Contenido</Card>)
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })
})
