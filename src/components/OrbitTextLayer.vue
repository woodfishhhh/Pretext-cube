<script setup lang="ts">
  import { toRef, watchEffect } from 'vue'

  import { usePretextFlow } from '../composables/usePretextFlow'
  import type { ProjectionSnapshot } from '../types/exhibition'

  const props = defineProps<{
    projection: ProjectionSnapshot | null
    isInteracting: boolean
  }>()

  const emit = defineEmits<{
    progressChange: [progress: number]
  }>()

  const { lines, typography, progress } = usePretextFlow(
    toRef(props, 'projection'),
    toRef(props, 'isInteracting'),
  )

  watchEffect(() => {
    emit('progressChange', progress.value)
  })
</script>

<template>
  <div class="orbit-text-layer" :class="{ 'orbit-text-layer--active': props.isInteracting }"
    :style="{ font: typography.font, lineHeight: `${typography.lineHeight}px` }">
    <div v-for="line in lines" :key="line.id" class="orbit-text-line" :class="{
      'orbit-text-line--primary': line.kind === 'primary',
      'orbit-text-line--ambient': line.kind === 'ambient',
    }" :style="{
        left: `${line.x}px`,
        top: `${line.y}px`,
        width: `${line.width}px`,
        opacity: line.opacity,
        filter: `blur(${line.blur}px)`,
        transform: `translate3d(${line.driftX}px, 0, 0)`,
      }">
      {{ line.text }}
    </div>
  </div>
</template>

<style scoped>
  .orbit-text-layer {
    position: absolute;
    inset: 0;
    z-index: 6;
    overflow: hidden;
    pointer-events: none;
    color: rgba(216, 233, 248, 0.52);
    mask-image: linear-gradient(to bottom,
        transparent 0%,
        rgba(0, 0, 0, 0.92) 8%,
        rgba(0, 0, 0, 1) 18%,
        rgba(0, 0, 0, 1) 82%,
        rgba(0, 0, 0, 0.92) 92%,
        transparent 100%);
  }

  .orbit-text-layer--active {
    color: rgba(230, 241, 255, 0.78);
  }

  .orbit-text-line {
    position: absolute;
    white-space: pre;
    will-change: transform, opacity, filter;
    text-shadow: 0 0 18px rgba(90, 188, 255, 0.08);
    transition:
      opacity 180ms ease,
      filter 220ms ease,
      transform 240ms ease,
      color 220ms ease;
  }

  .orbit-text-line--primary {
    color: rgba(244, 249, 255, 0.96);
    letter-spacing: 0.01em;
    text-shadow: 0 0 22px rgba(123, 196, 255, 0.1);
  }

  .orbit-text-line--ambient {
    color: rgba(154, 187, 214, 0.82);
    letter-spacing: 0.045em;
  }
</style>
