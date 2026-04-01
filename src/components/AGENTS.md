# COMPONENTS

## OVERVIEW

Two Vue 3 SFCs: HypercubeStage (3D canvas) and OrbitTextLayer (text overlay).

## CONVENTIONS

- `<script setup lang="ts">` — Composition API only
- `<style scoped>` — all styles scoped
- Props declared with `defineProps<{ ... }>()`
- Events via `defineEmits<{ ... }>()`
- No global state — parent (App.vue) passes data via props, components emit events back

## WHERE TO LOOK

| File | Role |
|------|------|
| `HypercubeStage.vue` | Three.js canvas, tesseract rendering, mouse/touch drag rotation, projection emits |
| `OrbitTextLayer.vue` | Scroll-driven text flow, convex hull carving, uses `usePretextFlow` composable |

## DATA FLOW

```
App.vue
  ├── props → HypercubeStage → emits projectionChange, interactionChange
  └── props → OrbitTextLayer → uses usePretextFlow → emits progressChange
```

## ANTI-PATTERNS

- Never import `@chenglou/pretext` directly — use `usePretextFlow` composable
- Never mutate props — always emit events
- Never use Options API
