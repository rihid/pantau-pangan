'use client'

interface SearchFilterProps {
  value: string
  onChange: (query: string) => void
}

export function SearchFilter({ value, onChange }: SearchFilterProps) {
  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <svg
        className="absolute left-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
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
        className="pl-8 pr-3 py-1.5 text-xs bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 w-36 focus:w-48 transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          className="absolute right-2.5 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
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
