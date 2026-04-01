import { describe, expect, it } from 'vitest'

import {
  buildFlowRows,
  carveTextLineSlots,
  convexHull,
  getPolygonIntervalForBand,
} from './text-flow'

describe('text flow geometry helpers', () => {
  it('builds a convex hull and removes interior points', () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
      { x: 10, y: 10 },
    ])

    expect(hull).toHaveLength(4)
    expect(hull).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ])
  })

  it('carves slots out of a base interval', () => {
    expect(
      carveTextLineSlots(
        { left: 0, right: 100 },
        [{ left: 35, right: 65 }],
        10,
      ),
    ).toEqual([
      { left: 0, right: 35 },
      { left: 65, right: 100 },
    ])
  })

  it('finds a polygon interval for a horizontal band', () => {
    const interval = getPolygonIntervalForBand(
      [
        { x: 300, y: 200 },
        { x: 500, y: 200 },
        { x: 500, y: 420 },
        { x: 300, y: 420 },
      ],
      260,
      300,
      24,
      12,
    )

    expect(interval).toEqual({ left: 276, right: 524 })
  })

  it('creates dual wrap slots through the middle of an obstacle and full rows outside it', () => {
    const rows = buildFlowRows({
      viewportWidth: 1200,
      viewportHeight: 800,
      topInset: 120,
      bottomInset: 80,
      lineHeight: 28,
      screenPadding: 72,
      objectPadding: 36,
      minSlotWidth: 80,
      hull: [
        { x: 420, y: 250 },
        { x: 780, y: 250 },
        { x: 780, y: 560 },
        { x: 420, y: 560 },
      ],
    })

    const topRow = rows[0]
    const middleRow = rows.find(row => row.y >= 330 && row.y <= 360)

    expect(topRow?.slots).toHaveLength(1)
    expect(topRow?.slots[0]).toMatchObject({ left: 72, right: 1128, kind: 'ambient' })

    expect(middleRow?.slots).toHaveLength(2)
    expect(middleRow?.slots[0]).toMatchObject({ left: 72, right: 384, kind: 'primary' })
    expect(middleRow?.slots[1]).toMatchObject({ left: 816, right: 1128, kind: 'primary' })
  })
})
