export interface Point2D {
  x: number
  y: number
}

export interface Interval {
  left: number
  right: number
}

export interface FlowSlot extends Interval {
  kind: 'primary' | 'ambient'
}

export interface FlowRow {
  y: number
  slots: FlowSlot[]
}

export interface BuildFlowRowsOptions {
  viewportWidth: number
  viewportHeight: number
  topInset: number
  bottomInset: number
  lineHeight: number
  screenPadding: number
  objectPadding: number
  minSlotWidth: number
  hull: Point2D[]
}

function cross(origin: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
}

export function convexHull(points: Point2D[]): Point2D[] {
  if (points.length <= 1) return [...points]

  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  const lower: Point2D[] = []
  const upper: Point2D[] = []

  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]!
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

function collectBandXs(points: Point2D[], y: number): number[] {
  const xs: number[] = []

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]!
    const end = points[(index + 1) % points.length]!
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)

    if (y < minY || y > maxY) continue

    if (start.y === end.y) {
      xs.push(start.x, end.x)
      continue
    }

    const t = (y - start.y) / (end.y - start.y)
    xs.push(start.x + (end.x - start.x) * t)
  }

  return xs
}

export function getPolygonIntervalForBand(
  points: Point2D[],
  bandTop: number,
  bandBottom: number,
  horizontalPadding = 0,
  verticalPadding = 0,
): Interval | null {
  if (points.length < 3) return null

  const expandedTop = bandTop - verticalPadding
  const expandedBottom = bandBottom + verticalPadding
  const xs = [
    ...collectBandXs(points, expandedTop),
    ...collectBandXs(points, expandedBottom),
    ...points
      .filter(point => point.y >= expandedTop && point.y <= expandedBottom)
      .map(point => point.x),
  ]

  if (xs.length === 0) return null

  return {
    left: Math.min(...xs) - horizontalPadding,
    right: Math.max(...xs) + horizontalPadding,
  }
}

export function carveTextLineSlots(base: Interval, blocked: Interval[], minSlotWidth: number): Interval[] {
  let slots = [base]

  for (const obstacle of blocked) {
    const next: Interval[] = []

    for (const slot of slots) {
      if (obstacle.right <= slot.left || obstacle.left >= slot.right) {
        next.push(slot)
        continue
      }

      if (obstacle.left > slot.left) {
        next.push({ left: slot.left, right: obstacle.left })
      }

      if (obstacle.right < slot.right) {
        next.push({ left: obstacle.right, right: slot.right })
      }
    }

    slots = next
  }

  return slots.filter(slot => slot.right - slot.left >= minSlotWidth)
}

function getHullCenterY(hull: Point2D[]): number {
  return hull.reduce((sum, point) => sum + point.y, 0) / hull.length
}

function classifySlotKind(
  slot: Interval,
  rowY: number,
  focusY: number,
  viewportHeight: number,
  minSlotWidth: number,
): FlowSlot['kind'] {
  const rowDistance = Math.abs(rowY - focusY)
  const slotWidth = slot.right - slot.left
  const focusBand = viewportHeight * 0.2

  if (rowDistance <= focusBand && slotWidth >= minSlotWidth * 2.4) {
    return 'primary'
  }

  return 'ambient'
}

export function buildFlowRows({
  viewportWidth,
  viewportHeight,
  topInset,
  bottomInset,
  lineHeight,
  screenPadding,
  objectPadding,
  minSlotWidth,
  hull,
}: BuildFlowRowsOptions): FlowRow[] {
  const usableTop = topInset
  const usableBottom = viewportHeight - bottomInset
  const baseInterval = { left: screenPadding, right: viewportWidth - screenPadding }
  const obstacleHull = convexHull(hull)
  const focusY = obstacleHull.length > 0 ? getHullCenterY(obstacleHull) : viewportHeight / 2
  const rows: FlowRow[] = []

  for (let y = usableTop; y + lineHeight <= usableBottom; y += lineHeight) {
    const obstacle = getPolygonIntervalForBand(
      obstacleHull,
      y,
      y + lineHeight,
      objectPadding,
      Math.max(8, objectPadding * 0.3),
    )

    const intervals = obstacle === null
      ? [baseInterval]
      : carveTextLineSlots(baseInterval, [obstacle], minSlotWidth)

    if (intervals.length === 0) {
      continue
    }

    rows.push({
      y,
      slots: intervals.map(slot => ({
        ...slot,
        kind: classifySlotKind(slot, y, focusY, viewportHeight, minSlotWidth),
      })),
    })
  }

  return rows
}
