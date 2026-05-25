import { describe, test, expect } from 'bun:test'
import fc from 'fast-check'
import { parseCommoditiesTree, parseDetailGrid } from '../parser'

/**
 * Property 5: parseCommoditiesTree extracts all leaves
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
describe('Property 5: parseCommoditiesTree extracts all leaves', () => {
  // Arbitrary for a leaf node with comId, id, text
  const leafArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
    text: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    comId: fc.integer({ min: 1, max: 10000 }),
  })

  // Arbitrary for a category node with text and items (array of leaves)
  const categoryNodeArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    text: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    items: fc.array(leafArb, { minLength: 1, maxLength: 5 }),
  })

  // Arbitrary for a full tree (array of category nodes)
  const treeArb = fc.array(categoryNodeArb, { minLength: 1, maxLength: 10 })

  test('result length equals total number of leaves across all nodes', () => {
    fc.assert(
      fc.property(treeArb, (tree) => {
        const totalLeaves = tree.reduce((sum, node) => sum + node.items.length, 0)
        const result = parseCommoditiesTree(tree)
        expect(result.length).toBe(totalLeaves)
      }),
      { numRuns: 100 },
    )
  })

  test('each result item has correct treeId, comId, nama, kategori mapping', () => {
    fc.assert(
      fc.property(treeArb, (tree) => {
        const result = parseCommoditiesTree(tree)

        let idx = 0
        for (const node of tree) {
          for (const leaf of node.items) {
            const parsed = result[idx]!
            expect(parsed.treeId).toBe(leaf.id)
            expect(parsed.comId).toBe(leaf.comId)
            expect(parsed.nama).toBe(leaf.text)
            expect(parsed.kategori).toBe(node.text)
            idx++
          }
        }
      }),
      { numRuns: 100 },
    )
  })

  test('kategori matches the parent node text', () => {
    fc.assert(
      fc.property(treeArb, (tree) => {
        const result = parseCommoditiesTree(tree)

        // Build a set of all parent texts
        const parentTexts = new Set(tree.map((n) => n.text))

        for (const item of result) {
          expect(parentTexts.has(item.kategori)).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 6: parseDetailGrid extracts all date-price pairs
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
describe('Property 6: parseDetailGrid extracts all date-price pairs', () => {
  // Arbitrary for a valid DD/MM/YYYY date key
  const dateKeyArb = fc
    .tuple(
      fc.integer({ min: 1, max: 28 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 2020, max: 2030 }),
    )
    .map(([d, m, y]) => `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`)

  // Arbitrary for a grid row with required fields and date-price pairs
  const gridRowArb = (dateKeys: string[]) =>
    fc
      .record({
        id: fc.integer({ min: 0, max: 1000 }),
        name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        category: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        level: fc.integer({ min: 0, max: 3 }),
      })
      .chain((base) =>
        fc
          .tuple(
            ...dateKeys.map(() =>
              fc.oneof(
                fc.double({ min: 100, max: 100000, noNaN: true, noDefaultInfinity: true }),
                fc.constant(null as number | null),
              ),
            ),
          )
          .map((values) => {
            const row: Record<string, unknown> = { ...base }
            dateKeys.forEach((key, i) => {
              row[key] = values[i]
            })
            return { row, base, values }
          }),
      )

  // Generate a set of unique date keys first, then rows using those keys
  const gridDataArb = fc
    .array(dateKeyArb, { minLength: 1, maxLength: 5 })
    .map((keys) => [...new Set(keys)])
    .filter((keys) => keys.length >= 1)
    .chain((dateKeys) =>
      fc
        .array(gridRowArb(dateKeys), { minLength: 1, maxLength: 5 })
        .map((rowsData) => ({ dateKeys, rowsData })),
    )

  test('result.rows.length equals data.length', () => {
    fc.assert(
      fc.property(gridDataArb, ({ dateKeys: _dateKeys, rowsData }) => {
        const data = rowsData.map((r) => r.row)
        const raw = { data }
        const result = parseDetailGrid(raw, 1)
        expect(result.rows.length).toBe(data.length)
      }),
      { numRuns: 100 },
    )
  })

  test('each row prices array contains only entries where original value was a valid number', () => {
    fc.assert(
      fc.property(gridDataArb, ({ dateKeys: _dateKeys, rowsData }) => {
        const data = rowsData.map((r) => r.row)
        const raw = { data }
        const result = parseDetailGrid(raw, 1)

        for (let i = 0; i < rowsData.length; i++) {
          const originalValues = rowsData[i]!.values
          const parsedRow = result.rows[i]!

          // Count how many original values are valid numbers (not null, not NaN)
          const expectedValidCount = originalValues.filter(
            (v) => v !== null && !Number.isNaN(Number(v)),
          ).length

          expect(parsedRow.prices.length).toBe(expectedValidCount)
        }
      }),
      { numRuns: 100 },
    )
  })

  test('dateKeys are sorted and match DD/MM/YYYY pattern', () => {
    fc.assert(
      fc.property(gridDataArb, ({ rowsData }) => {
        const data = rowsData.map((r) => r.row)
        const raw = { data }
        const result = parseDetailGrid(raw, 1)

        // All dateKeys match DD/MM/YYYY
        for (const key of result.dateKeys) {
          expect(key).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        }

        // dateKeys are sorted ascending
        for (let i = 1; i < result.dateKeys.length; i++) {
          expect(result.dateKeys[i]! >= result.dateKeys[i - 1]!).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 7: Parser rejects malformed input
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
describe('Property 7: Parser rejects malformed input', () => {
  describe('parseCommoditiesTree throws on non-array input', () => {
    test('throws on null', () => {
      expect(() => parseCommoditiesTree(null)).toThrow()
    })

    test('throws on undefined', () => {
      expect(() => parseCommoditiesTree(undefined)).toThrow()
    })

    test('throws on string', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          expect(() => parseCommoditiesTree(s)).toThrow()
        }),
        { numRuns: 100 },
      )
    })

    test('throws on number', () => {
      fc.assert(
        fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
          expect(() => parseCommoditiesTree(n)).toThrow()
        }),
        { numRuns: 100 },
      )
    })

    test('throws on plain object (non-array)', () => {
      fc.assert(
        fc.property(fc.object({ maxDepth: 1 }), (obj) => {
          if (!Array.isArray(obj)) {
            expect(() => parseCommoditiesTree(obj)).toThrow()
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('parseCommoditiesTree throws on leaf missing comId', () => {
    test('throws when leaf has no comId field', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          (kategori, leafId, leafText) => {
            const tree = [
              {
                id: '1',
                text: kategori,
                items: [{ id: leafId, text: leafText }], // missing comId
              },
            ]
            expect(() => parseCommoditiesTree(tree)).toThrow(/comId/)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('parseDetailGrid throws on input without data field', () => {
    test('throws on null input', () => {
      expect(() => parseDetailGrid(null, 1)).toThrow()
    })

    test('throws on undefined input', () => {
      expect(() => parseDetailGrid(undefined, 1)).toThrow()
    })

    test('throws on object without data field', () => {
      fc.assert(
        fc.property(
          fc.object({ maxDepth: 1 }).filter((obj) => !('data' in obj) || !Array.isArray(obj.data)),
          (obj) => {
            expect(() => parseDetailGrid(obj, 1)).toThrow()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('parseDetailGrid throws on row missing required fields', () => {
    test('throws on row missing level', () => {
      const raw = {
        data: [{ id: 1, name: 'Test', category: 'Cat' }], // missing level
      }
      expect(() => parseDetailGrid(raw, 1)).toThrow(/level/)
    })

    test('throws on row missing id', () => {
      const raw = {
        data: [{ level: 0, name: 'Test', category: 'Cat' }], // missing id
      }
      expect(() => parseDetailGrid(raw, 1)).toThrow(/id/)
    })

    test('throws on row missing name', () => {
      const raw = {
        data: [{ id: 1, level: 0, category: 'Cat' }], // missing name
      }
      expect(() => parseDetailGrid(raw, 1)).toThrow(/name/)
    })

    test('throws on row missing category', () => {
      const raw = {
        data: [{ id: 1, level: 0, name: 'Test' }], // missing category
      }
      expect(() => parseDetailGrid(raw, 1)).toThrow(/category/)
    })

    test('throws on row with non-numeric level', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 10 }), (badLevel) => {
          const raw = {
            data: [{ id: 1, name: 'Test', category: 'Cat', level: badLevel }],
          }
          expect(() => parseDetailGrid(raw, 1)).toThrow(/level/)
        }),
        { numRuns: 100 },
      )
    })
  })
})
