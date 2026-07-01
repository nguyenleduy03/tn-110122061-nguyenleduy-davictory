import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToastProvider } from '../components/Toast'

describe('ToastProvider', () => {
  it('renders children', () => {
    render(<ToastProvider><div>Hello</div></ToastProvider>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
