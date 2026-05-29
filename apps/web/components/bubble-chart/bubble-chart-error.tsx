'use client'

import { Button } from '@/components/ui/button'

interface BubbleChartErrorProps {
  onRetry: () => void
}

export function BubbleChartError({ onRetry }: BubbleChartErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <p className="text-muted-foreground text-sm">Gagal memuat data harga pangan</p>
      <Button onClick={onRetry}>Coba Lagi</Button>
    </div>
  )
}
