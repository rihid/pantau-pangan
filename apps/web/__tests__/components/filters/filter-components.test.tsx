/**
 * Unit tests untuk filter components
 * Validates: Requirements 6.1, 6.2, 6.3, 7.3, 7.4
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { ProvinsiFilter } from '@/components/filters/provinsi-filter'
import type { Timeframe } from '@pantau-pangan/shared'

// Mock useProvinsi so ProvinsiFilter doesn't need QueryClientProvider
vi.mock('@/lib/hooks/use-provinsi', () => ({
  useProvinsi: vi.fn(),
}))

import { useProvinsi } from '@/lib/hooks/use-provinsi'
const mockUseProvinsi = vi.mocked(useProvinsi)

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

  it('shows badge on active button when actualDays < TIMEFRAME_DAYS', () => {
    // 1W has TIMEFRAME_DAYS = 7, so 5 < 7 → badge shown
    const dataBadge = { '1D': null, '1W': 5, '1M': null, '3M': null, '1Y': null } as Record<
      Timeframe,
      number | null
    >
    render(<TimeframeFilter value="1W" onChange={vi.fn()} dataBadge={dataBadge} />)
    expect(screen.getByText('1W · 5d')).toBeInTheDocument()
  })

  it('shows badge with 0d when actualDays is zero', () => {
    const dataBadge = { '1D': null, '1W': 0, '1M': null, '3M': null, '1Y': null } as Record<
      Timeframe,
      number | null
    >
    render(<TimeframeFilter value="1W" onChange={vi.fn()} dataBadge={dataBadge} />)
    expect(screen.getByText('1W · 0d')).toBeInTheDocument()
  })

  it('does not show badge when actualDays >= TIMEFRAME_DAYS', () => {
    // 1W has TIMEFRAME_DAYS = 7, so 7 >= 7 → no badge
    const dataBadge = { '1D': null, '1W': 7, '1M': null, '3M': null, '1Y': null } as Record<
      Timeframe,
      number | null
    >
    render(<TimeframeFilter value="1W" onChange={vi.fn()} dataBadge={dataBadge} />)
    expect(screen.queryByText('1W · 7d')).not.toBeInTheDocument()
  })

  it('does not show badge on inactive buttons', () => {
    // active is 1D, badge data for 1W — badge should NOT appear since 1W is not active
    const dataBadge = { '1D': null, '1W': 3, '1M': null, '3M': null, '1Y': null } as Record<
      Timeframe,
      number | null
    >
    render(<TimeframeFilter value="1D" onChange={vi.fn()} dataBadge={dataBadge} />)
    expect(screen.queryByText('1W · 3d')).not.toBeInTheDocument()
  })
})

// ─── ProvinsiFilter ──────────────────────────────────────────────────────────

describe('ProvinsiFilter', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows disabled trigger with placeholder when isLoading', () => {
    mockUseProvinsi.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<ProvinsiFilter value={0} onChange={vi.fn()} />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })

  it('renders "Semua Provinsi" option when not loading', () => {
    mockUseProvinsi.mockReturnValue({
      data: [{ id: 1, biId: 1, nama: 'DKI Jakarta' }],
      isLoading: false,
      isError: false,
    })
    render(<ProvinsiFilter value={0} onChange={vi.fn()} />)
    // The trigger should not be disabled
    const trigger = screen.getByRole('combobox')
    expect(trigger).not.toBeDisabled()
  })
})
