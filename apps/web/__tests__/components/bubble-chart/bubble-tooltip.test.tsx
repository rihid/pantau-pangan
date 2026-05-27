/**
 * Unit tests untuk BubbleTooltip component
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { BubbleTooltip } from '@/components/bubble-chart/bubble-tooltip'
import type { BubbleData } from '@pantau-pangan/shared'

// Mock useHistorisKomoditas to control sparkline data
vi.mock('@/lib/hooks/use-historis-komoditas', () => ({
  useHistorisKomoditas: vi.fn(),
}))

import { useHistorisKomoditas } from '@/lib/hooks/use-historis-komoditas'
const mockUseHistorisKomoditas = vi.mocked(useHistorisKomoditas)

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const baseBubble: BubbleData = {
  komoditasId: 1,
  nama: 'Beras Medium I',
  kategori: 'Beras',
  harga: 12500,
  perubahan: 1.5,
  radius: 60,
  color: '#f97316',
}

describe('BubbleTooltip', () => {
  beforeEach(() => {
    mockUseHistorisKomoditas.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHistorisKomoditas>)
  })

  afterEach(() => vi.clearAllMocks())

  it('renders null when bubble is null', () => {
    const { container } = render(<BubbleTooltip bubble={null} x={100} y={100} provinsiId={0} />, {
      wrapper: createWrapper(),
    })
    expect(container.firstChild).toBeNull()
  })

  it('renders tooltip with komoditas name when bubble is provided', () => {
    render(<BubbleTooltip bubble={baseBubble} x={100} y={100} provinsiId={0} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Beras Medium I')).toBeInTheDocument()
  })

  it('renders harga formatted as Rupiah', () => {
    render(<BubbleTooltip bubble={baseBubble} x={100} y={100} provinsiId={0} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText(/Rp.*\/kg/)).toBeInTheDocument()
  })

  it('does not render sparkline when radius < 50', () => {
    const smallBubble: BubbleData = { ...baseBubble, radius: 40 }
    render(<BubbleTooltip bubble={smallBubble} x={100} y={100} provinsiId={0} />, {
      wrapper: createWrapper(),
    })
    // No polyline (sparkline SVG) should be rendered
    expect(document.querySelector('polyline')).toBeNull()
  })

  it('renders sparkline when radius >= 50 and historis data is available', () => {
    const historisData = [
      {
        id: 1,
        komoditasId: 1,
        level: 0,
        provinsiId: null,
        kotaId: null,
        pasarId: null,
        harga: 12000,
        tanggal: '2024-01-01',
      },
      {
        id: 2,
        komoditasId: 1,
        level: 0,
        provinsiId: null,
        kotaId: null,
        pasarId: null,
        harga: 12500,
        tanggal: '2024-01-02',
      },
      {
        id: 3,
        komoditasId: 1,
        level: 0,
        provinsiId: null,
        kotaId: null,
        pasarId: null,
        harga: 12300,
        tanggal: '2024-01-03',
      },
    ]
    mockUseHistorisKomoditas.mockReturnValue({
      data: historisData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHistorisKomoditas>)

    const largeBubble: BubbleData = { ...baseBubble, radius: 60 }
    render(<BubbleTooltip bubble={largeBubble} x={100} y={100} provinsiId={0} />, {
      wrapper: createWrapper(),
    })
    expect(document.querySelector('polyline')).toBeInTheDocument()
  })

  it('gracefully degrades — shows tooltip without sparkline when useHistorisKomoditas errors', () => {
    mockUseHistorisKomoditas.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHistorisKomoditas>)

    const largeBubble: BubbleData = { ...baseBubble, radius: 60 }
    render(<BubbleTooltip bubble={largeBubble} x={100} y={100} provinsiId={0} />, {
      wrapper: createWrapper(),
    })
    // Tooltip still renders with name
    expect(screen.getByText('Beras Medium I')).toBeInTheDocument()
    // But no sparkline
    expect(document.querySelector('polyline')).toBeNull()
  })
})
