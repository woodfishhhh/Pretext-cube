import { layoutNextLine, prepareWithSegments, type LayoutCursor, type PreparedTextWithSegments } from '@chenglou/pretext'
import { useWindowSize } from '@vueuse/core'
import {
  computed,
  markRaw,
  onMounted,
  onUnmounted,
  shallowRef,
  watchEffect,
  watch,
  type Ref,
} from 'vue'

import { articleText } from '../assets/article'
import type { FlowLine, ProjectionSnapshot } from '../types/exhibition'
import { carveTextLineSlots, getPolygonIntervalForBand, type Interval } from '../utils/text-flow'
import { generateEdges } from '../utils/tesseract'

const BODY_FONT_FAMILY = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "Iowan Old Style", "Palatino Linotype", serif'
const TESSERACT_EDGES = generateEdges()
const WHEEL_STEP_PIXELS = 36
const WHEEL_LINE_MULTIPLIER = 3

type TypographySettings = {
  font: string
  lineHeight: number
  topInset: number
  bottomInset: number
  screenPadding: number
  objectPadding: number
  minSlotWidth: number
}

function getTypographySettings(viewportWidth: number): TypographySettings {
  if (viewportWidth <= 720) {
    return {
      font: `500 15px ${BODY_FONT_FAMILY}`,
      lineHeight: 25,
      topInset: 154,
      bottomInset: 84,
      screenPadding: 26,
      objectPadding: 26,
      minSlotWidth: 86,
    }
  }

  if (viewportWidth <= 1080) {
    return {
      font: `500 16px ${BODY_FONT_FAMILY}`,
      lineHeight: 27,
      topInset: 156,
      bottomInset: 92,
      screenPadding: 42,
      objectPadding: 34,
      minSlotWidth: 120,
    }
  }

  return {
    font: `500 17px ${BODY_FONT_FAMILY}`,
    lineHeight: 29,
    topInset: 170,
    bottomInset: 102,
    screenPadding: 70,
    objectPadding: 42,
    minSlotWidth: 144,
  }
}

function createFallbackHull(viewportWidth: number, viewportHeight: number): ProjectionSnapshot['hull'] {
  const centerX = viewportWidth / 2
  const centerY = viewportHeight / 2
  const halfWidth = Math.min(viewportWidth * 0.18, 180)
  const halfHeight = Math.min(viewportHeight * 0.25, 220)

  return [
    { x: centerX - halfWidth, y: centerY - halfHeight },
    { x: centerX + halfWidth, y: centerY - halfHeight },
    { x: centerX + halfWidth, y: centerY + halfHeight },
    { x: centerX - halfWidth, y: centerY + halfHeight },
  ]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildLineVisual(
  index: number,
  text: string,
  x: number,
  y: number,
  width: number,
  kind: 'primary' | 'ambient',
  viewportWidth: number,
  viewportHeight: number,
  isInteracting: boolean,
): FlowLine {
  const centerY = viewportHeight * 0.52
  const centerX = viewportWidth / 2
  const distanceRatio = Math.min(1, Math.abs(y - centerY) / (viewportHeight * 0.44))
  const sideDirection = x + width / 2 < centerX ? -1 : 1
  const primaryOpacity = isInteracting ? 0.86 : 0.62
  const ambientOpacity = isInteracting ? 0.42 : 0.17
  const opacity = kind === 'primary'
    ? primaryOpacity - distanceRatio * 0.18
    : ambientOpacity - distanceRatio * 0.06

  return {
    id: `${index}-${x}-${y}-${text.length}`,
    text,
    x,
    y,
    width,
    kind,
    opacity: Math.max(kind === 'primary' ? 0.34 : 0.08, opacity),
    blur: kind === 'primary'
      ? Math.max(0, distanceRatio * (isInteracting ? 0.4 : 0.9))
      : (isInteracting ? 0.5 : 1.4) + distanceRatio * 0.7,
    driftX: kind === 'primary'
      ? sideDirection * distanceRatio * 8
      : sideDirection * (12 + distanceRatio * 14),
  }
}

function classifySlotKind(
  slot: Interval,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
): 'primary' | 'ambient' {
  const centerY = viewportHeight * 0.52
  const rowDistance = Math.abs(y - centerY)
  const rowBand = viewportHeight * 0.2
  const slotWidth = slot.right - slot.left

  if (rowDistance < rowBand && slotWidth > viewportWidth * 0.16) {
    return 'primary'
  }

  return 'ambient'
}

function getWireframeIntervalForBand(
  snapshot: ProjectionSnapshot,
  bandTop: number,
  bandBottom: number,
  paddingX: number,
  paddingY: number,
): Interval | null {
  const y = (bandTop + bandBottom) * 0.5
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let hasIntersection = false

  for (const [a, b] of TESSERACT_EDGES) {
    const p1 = snapshot.vertices[a]
    const p2 = snapshot.vertices[b]
    if (p1 === undefined || p2 === undefined) continue

    const minY = Math.min(p1.y, p2.y) - paddingY
    const maxY = Math.max(p1.y, p2.y) + paddingY
    if (y < minY || y > maxY) continue

    if (Math.abs(p2.y - p1.y) < 0.0001) {
      minX = Math.min(minX, p1.x, p2.x)
      maxX = Math.max(maxX, p1.x, p2.x)
      hasIntersection = true
      continue
    }

    const t = (y - p1.y) / (p2.y - p1.y)
    if (t < 0 || t > 1) continue

    const x = p1.x + (p2.x - p1.x) * t
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    hasIntersection = true
  }

  if (!hasIntersection) return null

  return {
    left: minX - paddingX,
    right: maxX + paddingX,
  }
}

export function usePretextFlow(
  projection: Ref<ProjectionSnapshot | null>,
  isInteracting: Ref<boolean>,
) {
  const { width, height } = useWindowSize()
  const typography = computed(() => getTypographySettings(width.value))
  const lines = shallowRef<FlowLine[]>([])
  const scrollOffset = shallowRef(0)
  const maxOffset = shallowRef(Number.POSITIVE_INFINITY)
  const prepared = shallowRef<PreparedTextWithSegments | null>(null)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let layoutQueued = false
  let wheelCarry = 0
  let touchAnchorY = 0
  let touchCarry = 0

  const refreshPrepared = (font: string) => {
    try {
      prepared.value = markRaw(prepareWithSegments(articleText, font))
    } catch {
      prepared.value = null
    }
  }

  refreshPrepared(typography.value.font)

  const runLayout = () => {
    if (prepared.value === null || width.value === 0 || height.value === 0) {
      lines.value = []
      return
    }

    const hull = projection.value?.hull ?? createFallbackHull(width.value, height.value)
    const baseInterval: Interval = {
      left: typography.value.screenPadding,
      right: width.value - typography.value.screenPadding,
    }
    const slotSequence: Array<{ y: number; slot: Interval & { kind: 'primary' | 'ambient' } }> = []
    const maxY = height.value - typography.value.bottomInset

    for (
      let y = typography.value.topInset;
      y + typography.value.lineHeight <= maxY;
      y += typography.value.lineHeight
    ) {
      const dynamicObstacle = projection.value
        ? getWireframeIntervalForBand(
          projection.value,
          y,
          y + typography.value.lineHeight,
          typography.value.objectPadding,
          Math.max(8, typography.value.objectPadding * 0.3),
        )
        : null

      const hullObstacle = dynamicObstacle ?? getPolygonIntervalForBand(
        hull,
        y,
        y + typography.value.lineHeight,
        typography.value.objectPadding,
        Math.max(8, typography.value.objectPadding * 0.3),
      )

      let intervals = hullObstacle
        ? carveTextLineSlots(baseInterval, [hullObstacle], typography.value.minSlotWidth)
        : [baseInterval]

      // Keep line flow continuous even when the object occupies most of a row.
      if (intervals.length === 0) {
        intervals = [baseInterval]
      }

      for (const slot of intervals) {
        slotSequence.push({
          y,
          slot: {
            ...slot,
            kind: classifySlotKind(slot, y, width.value, height.value),
          },
        })
      }
    }

    if (slotSequence.length === 0) {
      lines.value = []
      return
    }

    let totalLines = 0
    let countCursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    while (true) {
      const entry = slotSequence[totalLines % slotSequence.length]!
      const line = layoutNextLine(
        prepared.value,
        countCursor,
        entry.slot.right - entry.slot.left,
      )
      if (line === null) break
      countCursor = line.end
      totalLines += 1
    }

    const calculatedMaxOffset = Math.max(0, totalLines - slotSequence.length)
    maxOffset.value = calculatedMaxOffset

    if (scrollOffset.value > calculatedMaxOffset) {
      scrollOffset.value = calculatedMaxOffset
    }

    const visibleLines: FlowLine[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let consumed = 0
    const renderBudget = scrollOffset.value + slotSequence.length

    while (consumed < renderBudget) {
      const entry = slotSequence[consumed % slotSequence.length]!
      const line = layoutNextLine(
        prepared.value,
        { segmentIndex: cursor.segmentIndex, graphemeIndex: cursor.graphemeIndex },
        entry.slot.right - entry.slot.left,
      )

      if (line === null) {
        break
      }

      if (consumed >= scrollOffset.value) {
        visibleLines.push(
          buildLineVisual(
            visibleLines.length,
            line.text,
            Math.round(entry.slot.left),
            Math.round(entry.y),
            line.width,
            entry.slot.kind,
            width.value,
            height.value,
            isInteracting.value,
          ),
        )
      }

      cursor = {
        segmentIndex: line.end.segmentIndex,
        graphemeIndex: line.end.graphemeIndex,
      }
      consumed += 1
    }

    lines.value = visibleLines
  }

  const scheduleLayout = () => {
    if (layoutQueued) return
    layoutQueued = true
    queueMicrotask(() => {
      layoutQueued = false
      runLayout()
    })
  }

  const advance = (delta: number) => {
    if (delta === 0) return
    const limit = Number.isFinite(maxOffset.value) ? maxOffset.value : Number.MAX_SAFE_INTEGER
    const next = clamp(scrollOffset.value + delta, 0, limit)
    if (next === scrollOffset.value) return
    scrollOffset.value = next
    scheduleLayout()
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()

    const normalizedDelta = event.deltaMode === 1
      ? event.deltaY * typography.value.lineHeight
      : event.deltaMode === 2
        ? event.deltaY * height.value
        : event.deltaY

    wheelCarry += normalizedDelta
    const stepUnit = prefersReducedMotion.matches
      ? WHEEL_STEP_PIXELS * 1.4
      : WHEEL_STEP_PIXELS
    const steps = Math.trunc(wheelCarry / stepUnit)

    if (steps !== 0) {
      wheelCarry -= steps * stepUnit
      advance(steps * WHEEL_LINE_MULTIPLIER)
      return
    }

    if (Math.abs(normalizedDelta) >= 0.01) {
      advance(normalizedDelta > 0 ? 1 : -1)
    }
  }

  const onTouchStart = (event: TouchEvent) => {
    touchAnchorY = event.touches[0]?.clientY ?? 0
    touchCarry = 0
  }

  const onTouchMove = (event: TouchEvent) => {
    const nextY = event.touches[0]?.clientY ?? touchAnchorY
    const delta = touchAnchorY - nextY
    touchAnchorY = nextY
    touchCarry += delta

    const threshold = prefersReducedMotion.matches
      ? typography.value.lineHeight * 0.8
      : typography.value.lineHeight * 0.55

    if (Math.abs(touchCarry) < threshold) return

    const steps = Math.trunc(touchCarry / threshold)
    touchCarry -= steps * threshold
    advance(steps * 2)
  }

  onMounted(() => {
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    scheduleLayout()

    if ('fonts' in document) {
      void document.fonts.ready.then(() => {
        refreshPrepared(typography.value.font)
        scheduleLayout()
      })
    }

  })

  onUnmounted(() => {
    window.removeEventListener('wheel', onWheel, { capture: true })
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
  })

  watchEffect(() => {
    void projection.value
    void isInteracting.value
    void width.value
    void height.value
    void typography.value
    void scrollOffset.value
    if (prepared.value !== null) {
      scheduleLayout()
    }
  })

  watch(
    () => typography.value.font,
    font => {
      refreshPrepared(font)
      scheduleLayout()
    },
  )

  const progress = computed(() => {
    if (!Number.isFinite(maxOffset.value) || maxOffset.value === 0) return 0
    return clamp(scrollOffset.value / maxOffset.value, 0, 1)
  })

  return {
    lines,
    typography,
    progress,
  }
}
