import type { Point2D } from '../utils/text-flow'

export interface ProjectionBounds {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

export interface ProjectionSnapshot {
  vertices: Point2D[]
  hull: Point2D[]
  center: Point2D
  bounds: ProjectionBounds
}

export interface FlowLine {
  id: string
  text: string
  x: number
  y: number
  width: number
  kind: 'primary' | 'ambient'
  opacity: number
  blur: number
  driftX: number
}
