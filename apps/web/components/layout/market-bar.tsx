'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProvinsi } from '@/lib/hooks/use-provinsi'

interface MarketBarProps {
  provinsiId: number
  onProvinsiChange: (provinsiId: number) => void
  isLive: boolean
  latestDate?: string
  earliestDate?: string
}

function formatTanggal(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

export function MarketBar({
  provinsiId,
  onProvinsiChange,
  isLive,
  latestDate,
  earliestDate,
}: MarketBarProps) {
  const { data: provinsiList, isLoading } = useProvinsi()
  const provinsiNama = provinsiList?.find((p) => p.id === provinsiId)?.nama ?? 'Semua Provinsi'

  return (
    <div
      role="status"
      aria-label="Status data harga pangan"
      className="flex items-center justify-between gap-3 h-9 px-4 border-b border-border bg-background/70 backdrop-blur-md"
    >
      {/* Kiri: label (mobile) + indikator live + keterangan tanggal */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Label muncul di kiri hanya di layar kecil (mobile) */}
        <span className="md:hidden text-[11px] font-semibold uppercase tracking-wider text-foreground">
          Harga Pangan Nasional
        </span>
        {/* Live: tetap di kiri di layar lebar, di-hidden di mobile */}
        {isLive && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-padi-green">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-padi-green opacity-75 animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-padi-green" />
            </span>
            Live
          </span>
        )}
        {latestDate && (
          <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">
            data {formatTanggal(latestDate)}
            {earliestDate && ` · ${formatTanggal(earliestDate)}`}
          </span>
        )}
      </div>

      {/* Kanan: label (desktop) + select wilayah */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden md:inline text-[11px] font-semibold uppercase tracking-wider text-foreground">
          Harga Pangan Nasional
        </span>
        <Select
          value={provinsiNama}
          onValueChange={(nama) => {
            const provinsi = provinsiList?.find((p) => p.nama === nama)
            onProvinsiChange(provinsi?.id ?? 0)
          }}
        >
          <SelectTrigger disabled={isLoading} aria-label="Pilih wilayah" className="border-0">
            <SelectValue placeholder={isLoading ? 'Memuat provinsi...' : 'Pilih provinsi'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua Provinsi">Semua Provinsi</SelectItem>
            {provinsiList?.map((provinsi) => (
              <SelectItem key={provinsi.id} value={provinsi.nama}>
                {provinsi.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
