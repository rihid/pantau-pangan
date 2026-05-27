'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProvinsi } from '@/lib/hooks/use-provinsi'

interface ProvinsiFilterProps {
  value: number
  onChange: (provinsiId: number) => void
}

export function ProvinsiFilter({ value, onChange }: ProvinsiFilterProps) {
  const { data: provinsiList, isLoading } = useProvinsi()

  return (
    <Select
      value={value.toString()}
      onValueChange={(newValue) => onChange(parseInt(newValue ?? '0', 10))}
    >
      <SelectTrigger disabled={isLoading}>
        <SelectValue placeholder={isLoading ? 'Memuat provinsi...' : 'Semua Provinsi'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">Semua Provinsi</SelectItem>
        {provinsiList?.map((provinsi) => (
          <SelectItem key={provinsi.id} value={provinsi.id.toString()}>
            {provinsi.nama}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
