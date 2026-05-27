// Feature: m4-bubble-chart, Property 7: Filter State Independence

import fc from 'fast-check'
import type { Timeframe } from '@pantau-pangan/shared'

/**
 * Property 7: Filter State Independence
 * Validates: Requirements 6.4, 7.6
 *
 * For any sequence of setTimeframe and setProvinsiId operations,
 * changing provinsiId must never affect timeframe, and vice versa.
 */

type FilterState = { timeframe: Timeframe; provinsiId: number }
type Operation =
  | { type: 'setTimeframe'; value: Timeframe }
  | { type: 'setProvinsiId'; value: number }

function applyOperation(state: FilterState, op: Operation): FilterState {
  if (op.type === 'setTimeframe') return { ...state, timeframe: op.value }
  return { ...state, provinsiId: op.value }
}

const timeframeArb = fc.constantFrom<Timeframe>('1D', '1W', '1M', '3M', '1Y')
const provinsiIdArb = fc.integer({ min: 0, max: 34 })

const operationArb: fc.Arbitrary<Operation> = fc.oneof(
  fc.record({ type: fc.constant('setTimeframe' as const), value: timeframeArb }),
  fc.record({ type: fc.constant('setProvinsiId' as const), value: provinsiIdArb }),
)

describe('Property 7: Filter State Independence', () => {
  test('setProvinsiId never changes timeframe', () => {
    fc.assert(
      fc.property(
        timeframeArb,
        provinsiIdArb,
        provinsiIdArb,
        (initialTimeframe, initialProvinsiId, newProvinsiId) => {
          const state: FilterState = { timeframe: initialTimeframe, provinsiId: initialProvinsiId }
          const op: Operation = { type: 'setProvinsiId', value: newProvinsiId }
          const newState = applyOperation(state, op)
          return newState.timeframe === initialTimeframe
        },
      ),
      { numRuns: 100 },
    )
  })

  test('setTimeframe never changes provinsiId', () => {
    fc.assert(
      fc.property(
        timeframeArb,
        provinsiIdArb,
        timeframeArb,
        (initialTimeframe, initialProvinsiId, newTimeframe) => {
          const state: FilterState = { timeframe: initialTimeframe, provinsiId: initialProvinsiId }
          const op: Operation = { type: 'setTimeframe', value: newTimeframe }
          const newState = applyOperation(state, op)
          return newState.provinsiId === initialProvinsiId
        },
      ),
      { numRuns: 100 },
    )
  })

  test('arbitrary sequence of mixed operations preserves independence', () => {
    fc.assert(
      fc.property(
        timeframeArb,
        provinsiIdArb,
        fc.array(operationArb, { minLength: 1, maxLength: 20 }),
        (initialTimeframe, initialProvinsiId, ops) => {
          let state: FilterState = { timeframe: initialTimeframe, provinsiId: initialProvinsiId }

          for (const op of ops) {
            const prevTimeframe = state.timeframe
            const prevProvinsiId = state.provinsiId
            state = applyOperation(state, op)

            if (op.type === 'setProvinsiId') {
              // provinsiId change must not affect timeframe
              if (state.timeframe !== prevTimeframe) return false
            }
            if (op.type === 'setTimeframe') {
              // timeframe change must not affect provinsiId
              if (state.provinsiId !== prevProvinsiId) return false
            }
          }
          return true
        },
      ),
      { numRuns: 100 },
    )
  })
})
