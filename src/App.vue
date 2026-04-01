<script setup lang="ts">
  import { shallowRef } from 'vue'

  import HypercubeStage from './components/HypercubeStage.vue'
  import OrbitTextLayer from './components/OrbitTextLayer.vue'
  import type { ProjectionSnapshot } from './types/exhibition'

  const projection = shallowRef<ProjectionSnapshot | null>(null)
  const isInteracting = shallowRef(false)
  const animationSpeed = shallowRef(0)
  const scrollProgress = shallowRef(0)

  function handleProjectionChange(nextProjection: ProjectionSnapshot) {
    projection.value = nextProjection
  }

  function handleInteractionChange(nextValue: boolean) {
    isInteracting.value = nextValue
  }

  function handleProgressChange(progress: number) {
    scrollProgress.value = progress
  }
</script>

<template>
  <main class="exhibit-shell">
    <div class="exhibit-shell__atmosphere" aria-hidden="true"></div>

    <header class="exhibit-shell__header">
      <p class="exhibit-shell__eyebrow">高维几何 / 第四象限</p>
      <h1 class="exhibit-shell__title">超立方体</h1>
    </header>

    <aside class="exhibit-shell__meta exhibit-shell__meta--left">
      <p class="exhibit-shell__meta-label">几何参数</p>
      <p class="exhibit-shell__meta-copy">16 顶点 / 32 边 / 24 面 / 8 胞体</p>
    </aside>

    <aside class="exhibit-shell__meta exhibit-shell__meta--right">
      <p class="exhibit-shell__meta-label">交互说明</p>
      <p class="exhibit-shell__meta-copy">左右拖动超立方体 / 滚动滚轮移动文章</p>
    </aside>

    <div class="exhibit-controls">
      <label for="speed-slider">运动速度</label>
      <input id="speed-slider" type="range" min="0" max="3" step="0.1" v-model.number="animationSpeed"
        class="custom-slider" />
    </div>

    <div class="custom-scrollbar">
      <div class="custom-scrollbar-track">
        <div class="custom-scrollbar-thumb" :style="{ top: `${scrollProgress * 85}%` }"></div>
      </div>
    </div>

    <OrbitTextLayer :projection="projection" :is-interacting="isInteracting" @progress-change="handleProgressChange" />
    <HypercubeStage :speed="animationSpeed" @projection-change="handleProjectionChange"
      @interaction-change="handleInteractionChange" />
  </main>
</template>

<style scoped>
  .exhibit-shell {
    position: relative;
    width: 100vw;
    height: 100svh;
    overflow: hidden;
    isolation: isolate;
  }

  .exhibit-shell__atmosphere {
    position: absolute;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(circle at 50% 50%, rgba(79, 149, 255, 0.18), transparent 23%),
      radial-gradient(circle at 28% 26%, rgba(128, 108, 255, 0.18), transparent 32%),
      radial-gradient(circle at 78% 76%, rgba(41, 184, 255, 0.12), transparent 28%);
    filter: blur(18px);
    pointer-events: none;
  }

  .exhibit-shell__header,
  .exhibit-shell__meta {
    position: absolute;
    z-index: 8;
    pointer-events: none;
    animation: fadeUp 1s ease both;
  }

  .exhibit-shell__header {
    top: 2.2rem;
    left: 2.4rem;
    max-width: min(31rem, 37vw);
  }

  .exhibit-shell__eyebrow {
    margin: 0 0 0.8rem;
    color: rgba(188, 213, 236, 0.72);
    font-size: 0.78rem;
    letter-spacing: 0.38em;
    text-transform: uppercase;
  }

  .exhibit-shell__title {
    margin: 0;
    color: rgba(247, 251, 255, 0.96);
    font-size: clamp(3.2rem, 6.1vw, 5.9rem);
    font-weight: 500;
    letter-spacing: -0.06em;
    line-height: 0.9;
    text-wrap: balance;
  }

  .exhibit-shell__dek {
    margin: 1rem 0 0;
    max-width: 24rem;
    color: rgba(195, 213, 228, 0.74);
    font-size: 0.94rem;
    line-height: 1.5;
  }

  .exhibit-shell__meta {
    bottom: 2.2rem;
    max-width: 17rem;
  }

  .exhibit-shell__meta--left {
    left: 2.9rem;
  }

  .exhibit-shell__meta--right {
    right: 2.9rem;
    text-align: right;
  }

  .exhibit-shell__meta-label {
    margin: 0 0 0.38rem;
    color: rgba(144, 174, 201, 0.7);
    font-size: 0.74rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }

  .exhibit-shell__meta-copy,
  .exhibit-shell__meta-copy {
    margin: 0;
    color: rgba(224, 235, 245, 0.78);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .exhibit-controls {
    position: absolute;
    top: 2.2rem;
    right: 2.9rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 1rem;
    animation: fadeUp 1s ease both;
  }

  .exhibit-controls label {
    color: rgba(144, 174, 201, 0.7);
    font-size: 0.74rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .custom-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 120px;
    height: 4px;
    background: rgba(129, 168, 202, 0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(131, 213, 255, 0.9);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(131, 213, 255, 0.4);
    transition: transform 0.2s ease;
  }

  .custom-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .custom-scrollbar {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 6px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.02);
    border-left: 1px solid rgba(255, 255, 255, 0.05);
  }

  .custom-scrollbar-track {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .custom-scrollbar-thumb {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 15%;
    background: rgba(131, 213, 255, 0.4);
    border-radius: 3px;
    box-shadow: 0 0 8px rgba(131, 213, 255, 0.2);
    transition: top 0.1s linear;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translate3d(0, 18px, 0);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @media (max-width: 900px) {
    .exhibit-shell__header {
      top: 1.5rem;
      left: 1.2rem;
      right: 1.2rem;
      max-width: none;
    }

    .exhibit-controls {
      top: 1.5rem;
      right: 1.2rem;
    }

    .exhibit-shell__dek {
      max-width: 18rem;
      font-size: 0.88rem;
    }

    .exhibit-shell__meta {
      bottom: 1.25rem;
      max-width: 12rem;
    }

    .exhibit-shell__meta--left {
      left: 1.2rem;
    }

    .exhibit-shell__meta--right {
      right: 1.2rem;
    }

    .exhibit-shell__meta-copy {
      font-size: 0.82rem;
    }
  }
</style>
