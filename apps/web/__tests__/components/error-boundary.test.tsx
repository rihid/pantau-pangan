import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary } from '@/components/providers/error-boundary'

/** A component that throws an error on render */
function ThrowError({ message = 'Test render error' }: { message?: string }): never {
  throw new Error(message)
}

/** A component that renders normally */
function SafeChild() {
  return <div>Safe content</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error noise from React's error boundary logging in tests
  let consoleErrorSpy: ReturnType<typeof vi.spyOn<Console, 'error'>>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  test('renders fallback UI when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Terjadi kesalahan yang tidak terduga.')).toBeInTheDocument()
  })

  test('fallback UI contains instructions to reload in Bahasa Indonesia', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Muat ulang halaman untuk mencoba lagi.')).toBeInTheDocument()
  })

  test('fallback UI contains "Muat Ulang Halaman" button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    )
    const button = screen.getByRole('button', { name: /Muat Ulang Halaman/i })
    expect(button).toBeInTheDocument()
  })

  test('calls console.error with error and componentStack when catching an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Specific error message" />
      </ErrorBoundary>,
    )

    // console.error is called by React itself and by our componentDidCatch
    // Verify our componentDidCatch called it with the error object and componentStack
    const calls: unknown[][] = consoleErrorSpy.mock.calls as unknown[][]
    const errorCall = calls.find(
      (call) => call[0] instanceof Error && call[0].message === 'Specific error message',
    )
    expect(errorCall).toBeDefined()
    // Second argument should be the componentStack string
    expect(typeof errorCall?.[1]).toBe('string')
  })
})
