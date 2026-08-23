'use client'

interface SearchFilterProps {
  value: string
  onChange: (query: string) => void
}

export function SearchFilter({ value, onChange }: SearchFilterProps) {
  return (
    <div className="relative flex items-center w-full max-w-sm">
      <svg
        className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari komoditas..."
        aria-label="Cari komoditas"
        className="pl-9 pr-8 py-1.5 text-xs bg-background/80 backdrop-blur-md border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-padi-green/50 w-full transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path
              d="M9 3L6 6M6 6L3 9M6 6L9 9M6 6L3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
