/**
 * Unit tests for InsightPanel component.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { InsightResponse } from '@pantau-pangan/shared'

// Mock useInsight
vi.mock('@/lib/hooks/use-insight')

import { InsightPanel } from '@/components/modal/insight-panel'
import * as useInsightModule from '@/lib/hooks/use-insight'

type MockReturnType = ReturnType<typeof useInsightModule.useInsight>

function mockHook(override: Partial<MockReturnType>) {
  vi.spyOn(useInsightModule, 'useInsight').mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    status: 'success',
    fetchStatus: 'idle',
    isSuccess: true,
    isPending: false,
    error: null,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoadingError: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    errorUpdateCount: 0,
    isPaused: false,
    isEnabled: true,
    promise: Promise.resolve(undefined as unknown as InsightResponse),
    ...override,
  } as MockReturnType)
}

const defaultProps = { komoditasId: 1, provinsiId: 0 }

describe('InsightPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('1. auto-fetch: useInsight called on mount', () => {
    const spy = vi.spyOn(useInsightModule, 'useInsight').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      status: 'success',
      fetchStatus: 'idle',
      isSuccess: true,
      isPending: false,
      error: null,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isLoadingError: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      errorUpdateCount: 0,
      isPaused: false,
      isEnabled: true,
      promise: Promise.resolve(undefined as unknown as InsightResponse),
    } as unknown as MockReturnType)

    render(<InsightPanel {...defaultProps} />)

    expect(spy).toHaveBeenCalledWith(1, 0)
  })

  test('2. skeleton displayed when isLoading: true', () => {
    mockHook({
      isLoading: true,
      data: undefined,
      isError: false,
      status: 'pending',
      isPending: true,
      isSuccess: false,
    })

    const { container } = render(<InsightPanel {...defaultProps} />)

    // InsightPanelSkeleton renders animate-pulse
    const pulse = container.querySelector('.animate-pulse')
    expect(pulse).not.toBeNull()
  })

  test('3. cache label shown with date when cached: true', () => {
    mockHook({
      isLoading: false,
      isError: false,
      data: {
        komoditasId: 1,
        provinsiId: 0,
        cached: true,
        generatedAt: '2024-01-15T00:00:00Z',
        insight: 'Para 1\n\nPara 2',
      },
    })

    render(<InsightPanel {...defaultProps} />)

    // Should show "Dari cache · 15/01/2024"
    expect(screen.getByText(/dari cache/i)).toBeInTheDocument()
    expect(screen.getByText(/15\/01\/2024/i)).toBeInTheDocument()
  })

  test('4. no cache label when cached: false', () => {
    mockHook({
      isLoading: false,
      isError: false,
      data: {
        komoditasId: 1,
        provinsiId: 0,
        cached: false,
        generatedAt: '2024-01-15T00:00:00Z',
        insight: 'Some insight text',
      },
    })

    render(<InsightPanel {...defaultProps} />)

    expect(screen.queryByText(/dari cache/i)).not.toBeInTheDocument()
  })

  test('5. paragraphs split on \\n\\n: "A\\n\\nB\\n\\nC" → 3 <p> elements', () => {
    mockHook({
      isLoading: false,
      isError: false,
      data: {
        komoditasId: 1,
        provinsiId: 0,
        cached: false,
        generatedAt: '2024-01-01T00:00:00Z',
        insight: 'A\n\nB\n\nC',
      },
    })

    const { container } = render(<InsightPanel {...defaultProps} />)

    const paragraphs = container.querySelectorAll('p')
    // Filter to only insight paragraphs (not cache label)
    const insightParagraphs = Array.from(paragraphs).filter(
      (p) => p.textContent === 'A' || p.textContent === 'B' || p.textContent === 'C',
    )
    expect(insightParagraphs).toHaveLength(3)
  })

  test('6. retry button: on error, click "Coba lagi" calls refetch', () => {
    const refetchMock = vi.fn().mockResolvedValue({})
    mockHook({
      isLoading: false,
      isError: true,
      data: undefined,
      status: 'error',
      isSuccess: false,
      error: new Error('Server error'),
      refetch: refetchMock,
    })

    render(<InsightPanel {...defaultProps} />)

    const retryBtn = screen.getByRole('button', { name: /coba lagi/i })
    expect(retryBtn).toBeInTheDocument()

    fireEvent.click(retryBtn)
    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  test('7. timeout: after 36s loading without response, error state shown', () => {
    vi.useFakeTimers()

    mockHook({
      isLoading: true,
      data: undefined,
      isError: false,
      status: 'pending',
      isPending: true,
      isSuccess: false,
    })

    render(<InsightPanel {...defaultProps} />)

    // Initially in loading/skeleton state — no error message
    expect(screen.queryByText(/insight tidak tersedia/i)).not.toBeInTheDocument()

    // Advance timers past the 35s timeout
    act(() => {
      vi.advanceTimersByTime(36_000)
    })

    // Now should show error state
    expect(screen.getByText(/insight tidak tersedia/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument()
  })

  test('8. markdown headings rendered as h3/h4/h5', () => {
    mockHook({
      isLoading: false,
      isError: false,
      data: {
        komoditasId: 1,
        provinsiId: 0,
        cached: false,
        generatedAt: '2024-01-01T00:00:00Z',
        insight: '# Title\n\n## Subtitle\n\n### Detail',
      },
    })

    const { container } = render(<InsightPanel {...defaultProps} />)

    expect(container.querySelector('h3')).not.toBeNull()
    expect(container.querySelector('h4')).not.toBeNull()
    expect(container.querySelector('h5')).not.toBeNull()
  })

  test('9. markdown bold rendered as strong', () => {
    mockHook({
      isLoading: false,
      isError: false,
      data: {
        komoditasId: 1,
        provinsiId: 0,
        cached: false,
        generatedAt: '2024-01-01T00:00:00Z',
        insight: 'This is **bold** text.',
      },
    })

    const { container } = render(<InsightPanel {...defaultProps} />)

    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.textContent).toBe('bold')
  })
})
