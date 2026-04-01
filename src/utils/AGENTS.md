# UTILS

## OVERVIEW

Pure math/geometry functions. Two modules: tesseract (4D → 3D projection) and text-flow (convex hull, slot carving). Test file covers text-flow.

## STRUCTURE

```
utils/
├── tesseract.ts         # 4D math: vertices, edges, rotation, projection
├── text-flow.ts         # 2D geometry: convexHull, carveTextLineSlots, buildFlowRows
└── text-flow.test.ts    # Vitest: 4 test suites
```

## WHERE TO LOOK

| Function | File | Purpose |
|----------|------|---------|
| `generateVertices()` | tesseract.ts | 16 vertices of tesseract in 4D |
| `generateEdges()` | tesseract.ts | 32 edges connecting vertices |
| `rotate4D()` | tesseract.ts | 4D rotation matrix application |
| `project4DTo3D()` | tesseract.ts | Perspective projection 4D→3D |
| `convexHull()` | text-flow.ts | Gift-wrapping algorithm |
| `carveTextLineSlots()` | text-flow.ts | Carve text slots from polygon |
| `buildFlowRows()` | text-flow.ts | Build flow row layout |
| `getPolygonIntervalForBand()` | text-flow.ts | Intersect polygon with horizontal band |

## CONVENTIONS

- All functions are pure (no side effects)
- Exported as named exports (no default exports)
- Types defined inline in `types/exhibition.ts` or local interfaces
- Test file uses Vitest (`describe`/`it`/`expect`)

## ANTI-PATTERNS

- Never mutate input arrays — always copy
- Never use `any` type — strict TS enforced
- Never add DOM/Three.js dependencies — keep pure math
