# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-01
**Commit:** a35dd13
**Branch:** main

## OVERVIEW

3D hypercube text visualization exhibit. Vue 3 + TypeScript + Vite + Three.js. Renders a tesseract (4D cube) with text flowing around it via scroll-driven layout. Chinese UI, single-page, no routing.

## STRUCTURE

```
pretext/
├── src/
│   ├── components/    # 3D canvas + text layer
│   ├── composables/   # usePretextFlow (text layout logic)
│   ├── utils/         # tesseract math + text-flow geometry
│   ├── types/         # ProjectionBounds, FlowLine, etc.
│   ├── assets/        # article.ts (static content), images
│   ├── App.vue        # Root: state hub, scoped CSS
│   ├── main.ts        # Entry (5 lines)
│   └── style.css      # Global resets
├── vite.config.ts     # Vue plugin only
├── tsconfig.app.json  # Strict TS, erasableSyntaxOnly
└── package.json       # Scripts: dev/build/preview/test
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 3D rendering / Three.js | `src/components/HypercubeStage.vue` | Canvas, tesseract projection |
| Text layout / scroll | `src/components/OrbitTextLayer.vue` | Convex hull carving, flow rows |
| Text layout engine | `src/composables/usePretextFlow.ts` | @chenglou/pretext integration |
| Tesseract math | `src/utils/tesseract.ts` | 4D rotation, vertex/edge gen |
| Geometry utilities | `src/utils/text-flow.ts` | convexHull, carveTextLineSlots |
| Type definitions | `src/types/exhibition.ts` | ProjectionSnapshot, FlowLine |
| Article content | `src/assets/article.ts` | Static Chinese text |

## CONVENTIONS

- **Composition API ONLY**: `<script setup lang="ts">` everywhere
- **Strict TypeScript**: `strict: true`, `erasableSyntaxOnly: true`
- **No linter/formatter**: No ESLint, Prettier, or EditorConfig configured
- **Scoped CSS**: All component styles use `<style scoped>`
- **shallowRef for large objects**: Root component uses `shallowRef` for projection data
- **Emit up, prop down**: Components emit events, parent holds state

## ANTI-PATTERNS (THIS PROJECT)

- No `as any`, `@ts-ignore`, or type suppression
- No TODO/FIXME/HACK markers in source
- No global state (no Pinia/Vuex)
- No API calls — all data is static

## COMMANDS

```bash
npm run dev        # Vite dev server
npm run build      # vue-tsc -b && vite build
npm run preview    # Preview production build
npm run test       # vitest run
```

## NOTES

- Three.js version: 0.183.x (check `@types/three` compatibility on upgrade)
- `@chenglou/pretext` is the core text layout engine — external dependency, not local
- `tsconfig.node.json` is for vite.config.ts only; app code uses `tsconfig.app.json`
- Single test file: `src/utils/text-flow.test.ts` (4 test suites, Vitest)
