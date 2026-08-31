import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@renderer/design-system'

describe('Button', () => {
  it('renders its label and responds to clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Continuar estudiando</Button>)

    const button = screen.getByRole('button', { name: 'Continuar estudiando' })
    await userEvent.click(button)

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disables interaction when disabled', () => {
    render(<Button disabled>Comenzar sesión</Button>)
    expect(screen.getByRole('button', { name: 'Comenzar sesión' })).toBeDisabled()
  })
})
