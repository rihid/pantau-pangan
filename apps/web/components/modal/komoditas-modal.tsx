'use client'

import { useEffect, useState } from 'react'
import type { Timeframe } from '@pantau-pangan/shared'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { ModalHeader } from './modal-header'
import { HistorisChart } from './historis-chart'
import { GeografisTable } from './geografis-table'
import { InsightPanel } from './insight-panel'

interface ModalState {
  komoditasId: number
  nama: string
  harga: number
  provinsiId: number
}

interface KomoditasModalProps {
  modalState: ModalState | null
  onClose: () => void
}

export function KomoditasModal({ modalState, onClose }: KomoditasModalProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')

  // Reset timeframe ke 1D saat komoditas berubah
  useEffect(() => {
    setTimeframe('1D')
  }, [modalState?.komoditasId])

  return (
    <Dialog
      open={modalState !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {modalState && (
          <>
            <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-0">
              <ModalHeader
                nama={modalState.nama}
                harga={modalState.harga}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </DialogHeader>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6 flex flex-col gap-6 mt-4">
              {/* Chart historis — full width */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Historis Harga</h3>
                <HistorisChart
                  komoditasId={modalState.komoditasId}
                  timeframe={timeframe}
                  provinsiId={modalState.provinsiId}
                  namaKomoditas={modalState.nama}
                />
              </section>

              {/* Bottom panels — 2 col desktop, stack mobile */}
              <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Harga per Wilayah
                  </h3>
                  <GeografisTable
                    komoditasId={modalState.komoditasId}
                    provinsiId={modalState.provinsiId}
                  />
                </section>
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Analisis</h3>
                  <InsightPanel
                    komoditasId={modalState.komoditasId}
                    provinsiId={modalState.provinsiId}
                  />
                </section>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
