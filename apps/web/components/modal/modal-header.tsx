'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogTitle } from '@/components/ui/dialog'
import { formatHargaRp } from '@/lib/modal-utils'

interface ModalHeaderProps {
  nama: string
  harga: number
  onClose: () => void
}

export function ModalHeader({ nama, harga, onClose }: ModalHeaderProps) {
  return (
    <div className="relative flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <DialogTitle
          id="komoditas-modal-title"
          className="text-left text-lg font-bold leading-tight sm:text-xl"
        >
          {nama}
        </DialogTitle>
        <span className="text-left text-sm font-medium text-foreground font-mono sm:text-base">
          {formatHargaRp(harga)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 -mr-2 -mt-2"
        onClick={onClose}
        aria-label="Tutup"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
