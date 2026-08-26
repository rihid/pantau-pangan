'use client'

import { Fragment } from 'react'

interface InlineToken {
  type: 'text' | 'bold' | 'italic'
  content: string
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []

  // Regex untuk bold dan italic (termasuk kombinasi ***bold+italic***)
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const [full, , boldItalic, bold, italic] = match
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }

    if (boldItalic !== undefined) {
      tokens.push({ type: 'bold', content: boldItalic })
      // italic juga, tapi untuk simplicity kita anggap bold saja
      // atau kita bisa wrap dengan em+strong — di-render layer kita handle
    } else if (bold !== undefined) {
      tokens.push({ type: 'bold', content: bold })
    } else if (italic !== undefined) {
      tokens.push({ type: 'italic', content: italic })
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) })
  }

  if (tokens.length === 0) {
    tokens.push({ type: 'text', content: text })
  }

  return tokens
}

function renderInline(tokens: InlineToken[], keyPrefix: string) {
  return tokens.map((token, i) => {
    const key = `${keyPrefix}-inline-${i}`
    switch (token.type) {
      case 'bold':
        return <strong key={key}>{token.content}</strong>
      case 'italic':
        return <em key={key}>{token.content}</em>
      default:
        return <Fragment key={key}>{token.content}</Fragment>
    }
  })
}

/**
 * Parse a single markdown block into a React element.
 * Headings are down-shifted by 2 levels because the modal already has
 * an h2 (DialogTitle). So # → h3, ## → h4, ### → h5.
 */
function renderBlock(block: string, index: number): React.ReactNode {
  const trimmed = block.trim()
  const key = `block-${index}`

  // Horizontal rule
  if (/^(---|\*\*\*|___)\s*$/.test(trimmed)) {
    return <hr key={key} className="my-5 border-border" />
  }

  // Heading 1-3
  const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
  if (headingMatch) {
    const hashes = headingMatch[1]
    const rawText = headingMatch[2]
    if (!hashes || !rawText) return <p key={key}>{trimmed}</p>
    const level = hashes.length // 1, 2, or 3
    const text = rawText.trim()
    const Tag = `h${level + 2}` as 'h3' | 'h4' | 'h5'
    const sizeClass =
      level === 1
        ? 'text-base font-semibold mt-5 mb-2'
        : level === 2
          ? 'text-[15px] font-semibold mt-4 mb-2'
          : 'text-sm font-medium mt-3 mb-1.5'
    return (
      <Tag key={key} className={`${sizeClass} text-foreground tracking-tight`}>
        {renderInline(parseInline(text), key)}
      </Tag>
    )
  }

  // Unordered list
  if (/^[-*]\s/.test(trimmed)) {
    const items = trimmed.split('\n').filter((line) => /^[-*]\s/.test(line))
    return (
      <ul key={key} className="my-3 list-disc pl-5 space-y-1 text-foreground">
        {items.map((item, i) => {
          const text = item.replace(/^[-*]\s+/, '')
          return <li key={`${key}-li-${i}`}>{renderInline(parseInline(text), `${key}-li-${i}`)}</li>
        })}
      </ul>
    )
  }

  // Ordered list
  if (/^\d+\.\s/.test(trimmed)) {
    const items = trimmed.split('\n').filter((line) => /^\d+\.\s/.test(line))
    return (
      <ol key={key} className="my-3 list-decimal pl-5 space-y-1 text-foreground">
        {items.map((item, i) => {
          const text = item.replace(/^\d+\.\s+/, '')
          return <li key={`${key}-li-${i}`}>{renderInline(parseInline(text), `${key}-li-${i}`)}</li>
        })}
      </ol>
    )
  }

  // Paragraph (default)
  // Handle single newlines inside a paragraph as <br>
  const lines = trimmed.split('\n')
  return (
    <p key={key} className="mb-4 last:mb-0 text-foreground leading-relaxed">
      {lines.map((line, i) => (
        <Fragment key={`${key}-line-${i}`}>
          {renderInline(parseInline(line), `${key}-line-${i}`)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </p>
  )
}

interface InsightContentProps {
  markdown: string
}

/**
 * Lightweight markdown renderer for LLM insight text.
 *
 * Supports:
 * - Headings (# / ## / ###) → h3 / h4 / h5
 * - Bold (**text**) → <strong>
 * - Italic (*text*) → <em>
 * - Unordered lists (- / *) → <ul>
 * - Ordered lists (1. / 2.) → <ol>
 * - Horizontal rules (---) → <hr>
 * - Paragraphs with inline line breaks → <p> + <br>
 */
export function InsightContent({ markdown }: InsightContentProps) {
  // Split into blocks by double newline, but preserve single newlines within blocks
  const blocks = markdown.split(/\r?\n\s*\r?\n/)

  return (
    <article className="text-base sm:text-[15px]">
      {blocks.map((block, i) => renderBlock(block, i))}
    </article>
  )
}
