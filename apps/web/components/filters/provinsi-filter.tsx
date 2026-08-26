'use client'

interface ProvinsiFilterProps {
  value: number
  onChange: (id: number) => void
}

export function ProvinsiFilter({ value, onChange }: ProvinsiFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-padi-green/60"
      aria-label="Pilih provinsi"
    >
      <option value={0}>Semua Provinsi</option>
    </select>
  )
}
