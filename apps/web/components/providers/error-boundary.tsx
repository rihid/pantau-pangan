'use client'

import React from 'react'

// ErrorBoundary hanya menangkap error di render/lifecycle — tidak menangkap error di event handler atau async useEffect

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            Terjadi kesalahan yang tidak terduga.
          </p>
          <p className="text-muted-foreground">Muat ulang halaman untuk mencoba lagi.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors"
          >
            Muat Ulang Halaman
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
