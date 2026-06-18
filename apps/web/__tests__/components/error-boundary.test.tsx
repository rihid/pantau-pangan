'use client'

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
  // Capture console.error calls without relying on .mock.calls
  const capturedErrors: Array<{ error: unknown; stack: unknown }> = []

  beforeEach(() => {
    capturedErrors.length = 0
    vi.spyOn(console, 'error').mockImplementation((err: unknown, stack: unknown) => {
      capturedErrors.push({ error: err, stack })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

    // componentDidCatch calls console.error(error, info.componentStack)
    // Find the call where the first arg is our specific Error
    const errorCall = capturedErrors.find(
      ({ error }) => error instanceof Error && error.message === 'Specific error message',
    )
    expect(errorCall).toBeDefined()
    // Second argument is the componentStack string from React.ErrorInfo
    expect(typeof errorCall?.stack).toBe('string')
  })
})
