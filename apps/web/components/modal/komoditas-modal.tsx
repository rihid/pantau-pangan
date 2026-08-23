'use client'

import { useEffect, useState } from 'react'
import type { Timeframe } from '@pantau-pangan/shared'
import { LayoutDashboard, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
      <DialogContent
        aria-labelledby="komoditas-modal-title"
        className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 rounded-md"
      >
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

            <Tabs defaultValue="overview" className="px-4 pb-4 sm:px-6 sm:pb-6 mt-4">
              <TabsList>
                <TabsTrigger value="overview">
                  <LayoutDashboard className="size-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="insight">
                  <Sparkles className="size-4" />
                  Insight
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex flex-col gap-6 mt-4">
                {/* Chart historis — full width */}
                <section>
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Chart Historis
                  </h3>
                  <HistorisChart
                    komoditasId={modalState.komoditasId}
                    timeframe={timeframe}
                    provinsiId={modalState.provinsiId}
                    namaKomoditas={modalState.nama}
                  />
                </section>

                {/* Tabel Geografis — full width */}
                <section>
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Tabel Geografis
                  </h3>
                  <GeografisTable
                    komoditasId={modalState.komoditasId}
                    provinsiId={modalState.provinsiId}
                  />
                </section>
              </TabsContent>

              <TabsContent value="insight" className="mt-4">
                <InsightPanel
                  komoditasId={modalState.komoditasId}
                  provinsiId={modalState.provinsiId}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
