/**
 * Unit tests for InsightContent markdown renderer.
 */

import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'

import { InsightContent } from '@/components/modal/insight-content'

describe('InsightContent', () => {
  test('renders plain paragraphs', () => {
    const { container } = render(<InsightContent markdown={'A\n\nB\n\nC'} />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[0]?.textContent).toBe('A')
    expect(paragraphs[1]?.textContent).toBe('B')
    expect(paragraphs[2]?.textContent).toBe('C')
  })

  test('renders heading # as h3', () => {
    const { container } = render(<InsightContent markdown="# Heading 1" />)
    const h3 = container.querySelector('h3')
    expect(h3).not.toBeNull()
    expect(h3?.textContent).toBe('Heading 1')
  })

  test('renders heading ## as h4', () => {
    const { container } = render(<InsightContent markdown="## Heading 2" />)
    const h4 = container.querySelector('h4')
    expect(h4).not.toBeNull()
    expect(h4?.textContent).toBe('Heading 2')
  })

  test('renders heading ### as h5', () => {
    const { container } = render(<InsightContent markdown="### Heading 3" />)
    const h5 = container.querySelector('h5')
    expect(h5).not.toBeNull()
    expect(h5?.textContent).toBe('Heading 3')
  })

  test('renders bold text as strong', () => {
    const { container } = render(<InsightContent markdown="**bold text**" />)
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.textContent).toBe('bold text')
  })

  test('renders italic text as em', () => {
    const { container } = render(<InsightContent markdown="*italic text*" />)
    const em = container.querySelector('em')
    expect(em).not.toBeNull()
    expect(em?.textContent).toBe('italic text')
  })

  test('renders unordered list', () => {
    const { container } = render(<InsightContent markdown={`- Item 1\n- Item 2\n- Item 3`} />)
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[0]?.textContent).toBe('Item 1')
    expect(items[1]?.textContent).toBe('Item 2')
    expect(items[2]?.textContent).toBe('Item 3')
  })

  test('renders ordered list', () => {
    const { container } = render(<InsightContent markdown={`1. First\n2. Second\n3. Third`} />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[0]?.textContent).toBe('First')
    expect(items[1]?.textContent).toBe('Second')
    expect(items[2]?.textContent).toBe('Third')
  })

  test('renders horizontal rule as hr', () => {
    const { container } = render(<InsightContent markdown="---" />)
    const hr = container.querySelector('hr')
    expect(hr).not.toBeNull()
  })

  test('renders inline line breaks as br inside paragraph', () => {
    const { container } = render(<InsightContent markdown={'Line 1\nLine 2'} />)
    const p = container.querySelector('p')
    expect(p).not.toBeNull()
    const br = container.querySelector('br')
    expect(br).not.toBeNull()
  })

  test('renders mixed markdown correctly', () => {
    const markdown = `# Title\n\nSome **bold** and *italic* text.\n\n- Point A\n- Point B\n\n---\n\n## Subtitle\n\n1. First step\n2. Second step`
    const { container } = render(<InsightContent markdown={markdown} />)

    expect(container.querySelector('h3')).not.toBeNull()
    expect(container.querySelector('h4')).not.toBeNull()
    expect(container.querySelector('strong')).not.toBeNull()
    expect(container.querySelector('em')).not.toBeNull()
    expect(container.querySelector('ul')).not.toBeNull()
    expect(container.querySelector('ol')).not.toBeNull()
    expect(container.querySelector('hr')).not.toBeNull()
  })
})
