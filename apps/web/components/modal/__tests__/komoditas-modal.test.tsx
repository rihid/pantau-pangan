/**
 * Unit tests for KomoditasModal component.
 */

import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { KomoditasModal } from '@/components/modal/komoditas-modal'

// Mock child components to isolate modal structure testing
vi.mock('@/components/modal/modal-header', () => ({
  ModalHeader: () => <div data-testid="modal-header">ModalHeader</div>,
}))

vi.mock('@/components/modal/historis-chart', () => ({
  HistorisChart: () => <div data-testid="historis-chart">HistorisChart</div>,
}))

vi.mock('@/components/modal/geografis-table', () => ({
  GeografisTable: () => <div data-testid="geografis-table">GeografisTable</div>,
}))

vi.mock('@/components/modal/insight-panel', () => ({
  InsightPanel: () => <div data-testid="insight-panel">InsightPanel</div>,
}))

describe('KomoditasModal', () => {
  test('does not render when modalState is null', () => {
    const { container } = render(<KomoditasModal modalState={null} onClose={() => {}} />)
    expect(container.querySelector('[data-testid="modal-header"]')).toBeNull()
  })

  test('renders tabs with Overview and Insight', () => {
    render(
      <KomoditasModal
        modalState={{
          komoditasId: 1,
          nama: 'Beras',
          harga: 12000,
          provinsiId: 0,
        }}
        onClose={() => {}}
      />,
    )

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /insight/i })).toBeInTheDocument()
  })

  test('Overview tab contains chart and table', () => {
    render(
      <KomoditasModal
        modalState={{
          komoditasId: 1,
          nama: 'Beras',
          harga: 12000,
          provinsiId: 0,
        }}
        onClose={() => {}}
      />,
    )

    // Default tab is overview — both chart and table should be present
    expect(screen.getByTestId('historis-chart')).toBeInTheDocument()
    expect(screen.getByTestId('geografis-table')).toBeInTheDocument()
  })

  test('Insight tab contains insight panel', () => {
    render(
      <KomoditasModal
        modalState={{
          komoditasId: 1,
          nama: 'Beras',
          harga: 12000,
          provinsiId: 0,
        }}
        onClose={() => {}}
      />,
    )

    const insightTab = screen.getByRole('tab', { name: /insight/i })
    expect(insightTab).toBeInTheDocument()

    fireEvent.click(insightTab)

    expect(screen.getByTestId('insight-panel')).toBeInTheDocument()
  })
})
