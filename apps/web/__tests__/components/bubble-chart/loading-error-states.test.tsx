/**
 * Unit tests untuk loading dan error states
 * Validates: Requirements 8.1, 8.3, 8.5
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BubbleChartSkeleton } from '@/components/bubble-chart/bubble-chart-skeleton'
import { BubbleChartError } from '@/components/bubble-chart/bubble-chart-error'

describe('BubbleChartSkeleton', () => {
  it('renders exactly 21 circles', () => {
    const { container } = render(<BubbleChartSkeleton />)
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(21)
  })

  it('renders an SVG element', () => {
    const { container } = render(<BubbleChartSkeleton />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('all circles have animate-pulse class', () => {
    const { container } = render(<BubbleChartSkeleton />)
    const circles = container.querySelectorAll('circle')
    circles.forEach((circle) => {
      expect(circle.classList.contains('animate-pulse')).toBe(true)
    })
  })
})

describe('BubbleChartError', () => {
  it('renders error message', () => {
    render(<BubbleChartError onRetry={vi.fn()} />)
    expect(screen.getByText(/gagal memuat/i)).toBeInTheDocument()
  })

  it('renders "Coba Lagi" retry button', () => {
    render(<BubbleChartError onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument()
  })

  it('calls onRetry when "Coba Lagi" button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<BubbleChartError onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: /coba lagi/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
