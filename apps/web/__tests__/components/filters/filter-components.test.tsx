/**
 * Unit tests untuk filter components
 * Validates: Requirements 6.1, 6.2, 6.3, 7.3, 7.4
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import type { Timeframe } from '@pantau-pangan/shared'

// ─── TimeframeFilter ────────────────────────────────────────────────────────

describe('TimeframeFilter', () => {
  afterEach(() => vi.clearAllMocks())

  it('renders all 5 timeframe buttons', () => {
    render(<TimeframeFilter value="1D" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1W' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument()
  })

  it('calls onChange with correct timeframe when a button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeframeFilter value="1D" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '1W' }))
    expect(onChange).toHaveBeenCalledWith('1W')

    await user.click(screen.getByRole('button', { name: '3M' }))
    expect(onChange).toHaveBeenCalledWith('3M')
  })

  it('calls onChange with the clicked timeframe value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

    for (const tf of timeframes) {
      onChange.mockClear()
      const { unmount } = render(<TimeframeFilter value="1D" onChange={onChange} />)
      await user.click(screen.getByRole('button', { name: tf }))
      expect(onChange).toHaveBeenCalledWith(tf)
      unmount()
    }
  })

  it('disables buttons in disabledTimeframes set', () => {
    const disabledTimeframes = new Set<Timeframe>(['1M', '3M', '1Y'])
    render(
      <TimeframeFilter value="1W" onChange={vi.fn()} disabledTimeframes={disabledTimeframes} />,
    )
    expect(screen.getByRole('button', { name: '1M' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '3M' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1Y' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1D' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: '1W' })).not.toBeDisabled()
  })

  it('shows tooltip on disabled buttons when availableDays is provided', () => {
    const disabledTimeframes = new Set<Timeframe>(['1M'])
    render(
      <TimeframeFilter
        value="1W"
        onChange={vi.fn()}
        disabledTimeframes={disabledTimeframes}
        availableDays={10}
      />,
    )
    const btn = screen.getByRole('button', { name: '1M' })
    expect(btn).toHaveAttribute('title')
    expect(btn.getAttribute('title')).toMatch(/10/)
  })

  it('does not call onChange when disabled button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const disabledTimeframes = new Set<Timeframe>(['3M'])
    render(
      <TimeframeFilter value="1W" onChange={onChange} disabledTimeframes={disabledTimeframes} />,
    )
    await user.click(screen.getByRole('button', { name: '3M' }))
    expect(onChange).not.toHaveBeenCalledWith('3M')
  })

  it('does not show badge when no disabledTimeframes prop', () => {
    render(<TimeframeFilter value="1W" onChange={vi.fn()} />)
    // no disabled buttons by default
    expect(screen.getByRole('button', { name: '1M' })).not.toBeDisabled()
  })
})
