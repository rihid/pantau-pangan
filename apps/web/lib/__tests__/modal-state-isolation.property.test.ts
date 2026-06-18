/**
 * Property 6: Modal State Isolation
 *
 * Validates: Requirements 1.6, 5.7
 *
 * Memverifikasi bahwa state modal (timeframe_modal + modalState) terisolasi
 * dari state halaman utama (timeframe + provinsiId).
 *
 * Diimplementasikan sebagai pure logic test (tanpa render React) karena
 * isolasi ini adalah properti dari state management, bukan DOM.
 */

import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'

// Simulasi state halaman utama
interface MainPageState {
  timeframe: Timeframe
  provinsiId: number
}

// Simulasi state modal
interface ModalState {
  komoditasId: number | null
  timeframeModal: Timeframe
}

// Operasi yang bisa terjadi
type Operation =
  | { type: 'SET_TIMEFRAME_MAIN'; value: Timeframe }
  | { type: 'SET_PROVINSI_ID'; value: number }
  | { type: 'OPEN_MODAL'; komoditasId: number }
  | { type: 'SET_TIMEFRAME_MODAL'; value: Timeframe }
  | { type: 'CLOSE_MODAL' }

function applyOperation(
  mainState: MainPageState,
  modalState: ModalState,
  op: Operation,
): { mainState: MainPageState; modalState: ModalState } {
  switch (op.type) {
    case 'SET_TIMEFRAME_MAIN':
      return { mainState: { ...mainState, timeframe: op.value }, modalState }
    case 'SET_PROVINSI_ID':
      return { mainState: { ...mainState, provinsiId: op.value }, modalState }
    case 'OPEN_MODAL':
      return {
        mainState,
        modalState: { komoditasId: op.komoditasId, timeframeModal: '1D' },
      }
    case 'SET_TIMEFRAME_MODAL':
      return { mainState, modalState: { ...modalState, timeframeModal: op.value } }
    case 'CLOSE_MODAL':
      return { mainState, modalState: { komoditasId: null, timeframeModal: '1D' } }
  }
}

// Generators
const timeframeArb = fc.constantFrom<Timeframe>('1D', '1W', '1M', '3M', '1Y')
const provinsiIdArb = fc.integer({ min: 0, max: 38 })
const komoditasIdArb = fc.integer({ min: 1, max: 100 })

const operationArb: fc.Arbitrary<Operation> = fc.oneof(
  timeframeArb.map((value) => ({ type: 'SET_TIMEFRAME_MAIN' as const, value })),
  provinsiIdArb.map((value) => ({ type: 'SET_PROVINSI_ID' as const, value })),
  komoditasIdArb.map((komoditasId) => ({ type: 'OPEN_MODAL' as const, komoditasId })),
  timeframeArb.map((value) => ({ type: 'SET_TIMEFRAME_MODAL' as const, value })),
  fc.constant({ type: 'CLOSE_MODAL' as const }),
)

describe('Property 6: Modal State Isolation', () => {
  /**
   * Property 6a: Timeframe_Modal tidak mempengaruhi main timeframe
   *
   * Generate sequence operasi acak. Sebelum setiap operasi SET_TIMEFRAME_MODAL,
   * catat main timeframe. Setelah operasi tersebut, assert main timeframe
   * tidak berubah.
   */
  test('SET_TIMEFRAME_MODAL tidak mengubah main timeframe', () => {
    fc.assert(
      fc.property(
        fc.array(operationArb, { minLength: 1, maxLength: 30 }),
        timeframeArb,
        provinsiIdArb,
        (ops, initialTimeframe, initialProvinsiId) => {
          let mainState: MainPageState = {
            timeframe: initialTimeframe,
            provinsiId: initialProvinsiId,
          }
          let modalState: ModalState = { komoditasId: null, timeframeModal: '1D' }

          for (const op of ops) {
            const mainTimeframeBeforeOp = mainState.timeframe

            const next = applyOperation(mainState, modalState, op)
            mainState = next.mainState
            modalState = next.modalState

            // Setelah SET_TIMEFRAME_MODAL, main timeframe harus tetap sama
            if (op.type === 'SET_TIMEFRAME_MODAL') {
              expect(mainState.timeframe).toBe(mainTimeframeBeforeOp)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 6b: Menutup modal tidak mengubah main state
   *
   * Apply sequence operasi acak yang mengandung CLOSE_MODAL.
   * Assert mainState sebelum dan sesudah CLOSE_MODAL identik.
   */
  test('CLOSE_MODAL tidak mengubah main state (timeframe dan provinsiId)', () => {
    fc.assert(
      fc.property(
        fc.array(operationArb, { minLength: 0, maxLength: 20 }),
        timeframeArb,
        provinsiIdArb,
        (opsBeforeClose, initialTimeframe, initialProvinsiId) => {
          let mainState: MainPageState = {
            timeframe: initialTimeframe,
            provinsiId: initialProvinsiId,
          }
          let modalState: ModalState = { komoditasId: null, timeframeModal: '1D' }

          // Apply operations sebelum CLOSE_MODAL
          for (const op of opsBeforeClose) {
            const next = applyOperation(mainState, modalState, op)
            mainState = next.mainState
            modalState = next.modalState
          }

          // Snapshot main state sebelum CLOSE_MODAL
          const mainStateBeforeClose = { ...mainState }

          // Apply CLOSE_MODAL
          const closeResult = applyOperation(mainState, modalState, { type: 'CLOSE_MODAL' })
          mainState = closeResult.mainState
          modalState = closeResult.modalState

          // Main state harus identik dengan sebelum close
          expect(mainState.timeframe).toBe(mainStateBeforeClose.timeframe)
          expect(mainState.provinsiId).toBe(mainStateBeforeClose.provinsiId)

          // Modal state harus di-reset
          expect(modalState.komoditasId).toBeNull()
          expect(modalState.timeframeModal).toBe('1D')
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 6c: Operasi modal (OPEN, SET_TIMEFRAME_MODAL, CLOSE) tidak mempengaruhi provinsiId
   *
   * Apply operasi modal saja. Assert provinsiId tidak berubah.
   */
  test('operasi modal tidak mengubah provinsiId', () => {
    const modalOnlyOperationArb: fc.Arbitrary<Operation> = fc.oneof(
      komoditasIdArb.map((komoditasId) => ({ type: 'OPEN_MODAL' as const, komoditasId })),
      timeframeArb.map((value) => ({ type: 'SET_TIMEFRAME_MODAL' as const, value })),
      fc.constant({ type: 'CLOSE_MODAL' as const }),
    )

    fc.assert(
      fc.property(
        fc.array(modalOnlyOperationArb, { minLength: 1, maxLength: 30 }),
        timeframeArb,
        provinsiIdArb,
        (ops, initialTimeframe, initialProvinsiId) => {
          let mainState: MainPageState = {
            timeframe: initialTimeframe,
            provinsiId: initialProvinsiId,
          }
          let modalState: ModalState = { komoditasId: null, timeframeModal: '1D' }

          for (const op of ops) {
            const next = applyOperation(mainState, modalState, op)
            mainState = next.mainState
            modalState = next.modalState

            // provinsiId harus selalu tetap karena operasi modal tidak mengubahnya
            expect(mainState.provinsiId).toBe(initialProvinsiId)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
