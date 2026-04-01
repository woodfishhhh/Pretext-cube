<script setup lang="ts">
  import { useWindowSize } from '@vueuse/core'
  import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
  import * as THREE from 'three'

  import type { ProjectionSnapshot } from '../types/exhibition'
  import { convexHull } from '../utils/text-flow'
  import {
    generateCubeSurfaceIndices,
    generateEdges,
    generateVertices,
    project4DTo3D,
    rotate4D,
  } from '../utils/tesseract'

  const props = withDefaults(defineProps<{
    speed?: number
  }>(), {
    speed: 0
  })

  const emit = defineEmits<{
    projectionChange: [snapshot: ProjectionSnapshot]
    interactionChange: [active: boolean]
  }>()

  const canvasHost = useTemplateRef<HTMLDivElement>('canvasHost')
  const interactionPad = useTemplateRef<HTMLButtonElement>('interactionPad')
  const { width, height } = useWindowSize()

  const vertices4D = generateVertices()
  const tesseractEdges = generateEdges()
  const surfaceIndices = generateCubeSurfaceIndices(0)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  type MotionState = {
    rotationXW: number
    rotationYZ: number
    inertiaXW: number
    inertiaYZ: number
    isDragging: boolean
  }

  const motion: MotionState = {
    rotationXW: -0.45,
    rotationYZ: 0.72,
    inertiaXW: 0,
    inertiaYZ: 0,
    isDragging: false,
  }

  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let lineMesh: THREE.LineSegments | null = null
  let pointMesh: THREE.Points | null = null
  let outerShell: THREE.Mesh | null = null
  let innerShell: THREE.Mesh | null = null
  let glowShell: THREE.Mesh | null = null
  let rafId = 0
  let previousTime = 0
  let lastPointerX = 0
  let lastPointerY = 0

  function createSurfaceGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(surfaceIndices)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3))
    return geometry
  }

  function initScene() {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(34, width.value / height.value, 0.1, 100)
    camera.position.set(0, 0.08, 12.3)

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width.value, height.value)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.outputColorSpace = THREE.SRGBColorSpace

    canvasHost.value?.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xb9e4ff, 1.4))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
    keyLight.position.set(3.2, 3.8, 5.4)
    scene.add(keyLight)

    const rimLight = new THREE.PointLight(0x57b8ff, 28, 18, 2)
    rimLight.position.set(-2.6, -1.3, 4.6)
    scene.add(rimLight)

    const backLight = new THREE.PointLight(0x9f8cff, 18, 20, 2)
    backLight.position.set(2.4, 1.4, -4.8)
    scene.add(backLight)

    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xbbe5ff,
      transparent: true,
      opacity: 0.18,
      metalness: 0.05,
      roughness: 0.12,
      transmission: 0.92,
      thickness: 1.2,
      ior: 1.18,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const innerMaterial = shellMaterial.clone()
    innerMaterial.color = new THREE.Color(0x7ebcff)
    innerMaterial.opacity = 0.11
    innerMaterial.roughness = 0.18

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x2f8dff,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    outerShell = new THREE.Mesh(createSurfaceGeometry(), shellMaterial)
    outerShell.renderOrder = 2
    scene.add(outerShell)

    innerShell = new THREE.Mesh(createSurfaceGeometry(), innerMaterial)
    innerShell.renderOrder = 2
    scene.add(innerShell)

    glowShell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.9, 1), glowMaterial)
    glowShell.renderOrder = 1
    scene.add(glowShell)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tesseractEdges.length * 2 * 3), 3))

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x9ed9ff,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial)
    lineMesh.renderOrder = 3
    scene.add(lineMesh)

    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices4D.length * 3), 3))

    const pointMaterial = new THREE.PointsMaterial({
      color: 0xf4fbff,
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })

    pointMesh = new THREE.Points(pointGeometry, pointMaterial)
    pointMesh.renderOrder = 4
    scene.add(pointMesh)
  }

  function updateMeshPositions(elapsedSeconds: number, deltaSeconds: number) {
    if (
      scene === null ||
      camera === null ||
      renderer === null ||
      lineMesh === null ||
      pointMesh === null ||
      outerShell === null ||
      innerShell === null ||
      glowShell === null
    ) {
      return
    }

    if (!motion.isDragging && !reducedMotion.matches) {
      if (Math.abs(motion.inertiaXW) < 0.0001) motion.inertiaXW = 0
      if (Math.abs(motion.inertiaYZ) < 0.0001) motion.inertiaYZ = 0

      motion.rotationXW += deltaSeconds * 0.34 * props.speed + motion.inertiaXW
      motion.rotationYZ += deltaSeconds * 0.21 * props.speed + motion.inertiaYZ

      motion.inertiaXW *= 0.935
      motion.inertiaYZ *= 0.93
    }

    const displayEuler = new THREE.Euler(
      0.52 + Math.sin(elapsedSeconds * 0.38) * 0.08 + motion.inertiaYZ * 6,
      -0.46 + Math.cos(elapsedSeconds * 0.29) * 0.09 + motion.inertiaXW * 7,
      Math.sin(elapsedSeconds * 0.22) * 0.14,
    )

    glowShell.rotation.copy(displayEuler)
    glowShell.scale.setScalar(1 + Math.sin(elapsedSeconds * 0.9) * 0.03)

    const pointPositions = pointMesh.geometry.attributes.position.array as Float32Array
    const linePositions = lineMesh.geometry.attributes.position.array as Float32Array
    const outerPositions = outerShell.geometry.attributes.position.array as Float32Array
    const innerPositions = innerShell.geometry.attributes.position.array as Float32Array
    const projectedVertices: THREE.Vector3[] = []
    const screenVertices = []
    const halfWidth = width.value / 2
    const halfHeight = height.value / 2

    for (let index = 0; index < vertices4D.length; index += 1) {
      const rotated = rotate4D(vertices4D[index]!, motion.rotationXW, motion.rotationYZ)
      const projected = project4DTo3D(rotated, 3.1)
      projected.multiplyScalar(1.18)
      projected.applyEuler(displayEuler)

      pointPositions[index * 3] = projected.x
      pointPositions[index * 3 + 1] = projected.y
      pointPositions[index * 3 + 2] = projected.z
      projectedVertices.push(projected)

      if (index < 8) {
        outerPositions[index * 3] = projected.x
        outerPositions[index * 3 + 1] = projected.y
        outerPositions[index * 3 + 2] = projected.z
      } else {
        const innerIndex = index - 8
        innerPositions[innerIndex * 3] = projected.x
        innerPositions[innerIndex * 3 + 1] = projected.y
        innerPositions[innerIndex * 3 + 2] = projected.z
      }

      const screenPosition = projected.clone().project(camera)
      screenVertices.push({
        x: screenPosition.x * halfWidth + halfWidth,
        y: -screenPosition.y * halfHeight + halfHeight,
      })
    }

    let edgeCursor = 0
    for (const [a, b] of tesseractEdges) {
      const pointA = projectedVertices[a]!
      const pointB = projectedVertices[b]!

      linePositions[edgeCursor++] = pointA.x
      linePositions[edgeCursor++] = pointA.y
      linePositions[edgeCursor++] = pointA.z
      linePositions[edgeCursor++] = pointB.x
      linePositions[edgeCursor++] = pointB.y
      linePositions[edgeCursor++] = pointB.z
    }

    pointMesh.geometry.attributes.position.needsUpdate = true
    lineMesh.geometry.attributes.position.needsUpdate = true
    outerShell.geometry.attributes.position.needsUpdate = true
    innerShell.geometry.attributes.position.needsUpdate = true
    outerShell.geometry.computeVertexNormals()
    innerShell.geometry.computeVertexNormals()

    const hull = convexHull(screenVertices)
    const xs = screenVertices.map(point => point.x)
    const ys = screenVertices.map(point => point.y)
    const snapshot: ProjectionSnapshot = {
      vertices: screenVertices,
      hull,
      center: {
        x: xs.reduce((sum, value) => sum + value, 0) / xs.length,
        y: ys.reduce((sum, value) => sum + value, 0) / ys.length,
      },
      bounds: {
        left: Math.min(...xs),
        right: Math.max(...xs),
        top: Math.min(...ys),
        bottom: Math.max(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      },
    }

    emit('projectionChange', snapshot)
    renderer.render(scene, camera)
  }

  let animationTime = 0

  function animateFrame(timestamp: number) {
    if (previousTime === 0) previousTime = timestamp
    const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.04)
    animationTime += deltaSeconds * props.speed

    previousTime = timestamp
    updateMeshPositions(animationTime, deltaSeconds)
    rafId = requestAnimationFrame(animateFrame)
  }

  function onPointerDown(event: PointerEvent) {
    motion.isDragging = true
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    emit('interactionChange', true)
    interactionPad.value?.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!motion.isDragging) return

    const deltaX = event.clientX - lastPointerX
    const deltaY = event.clientY - lastPointerY

    if (event.pointerType === 'touch' && Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
      lastPointerX = event.clientX
      lastPointerY = event.clientY
      return
    }

    motion.rotationXW += deltaX * 0.0085
    motion.rotationYZ += deltaY * 0.0065
    motion.inertiaXW = deltaX * 0.00058
    motion.inertiaYZ = deltaY * 0.00042
    lastPointerX = event.clientX
    lastPointerY = event.clientY
  }

  function endDrag(pointerId?: number) {
    if (!motion.isDragging) return
    motion.isDragging = false
    if (pointerId !== undefined && interactionPad.value?.hasPointerCapture(pointerId)) {
      interactionPad.value.releasePointerCapture(pointerId)
    }
    emit('interactionChange', false)
  }

  function onPointerUp(event: PointerEvent) {
    endDrag(event.pointerId)
  }

  function disposeObject(object: THREE.Object3D | null) {
    if (object === null) return

    object.traverse(child => {
      const mesh = child as THREE.Mesh
      if ('geometry' in mesh && mesh.geometry instanceof THREE.BufferGeometry) {
        mesh.geometry.dispose()
      }

      if ('material' in mesh) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const material of materials) {
          material.dispose()
        }
      }
    })
  }

  onMounted(() => {
    initScene()
    rafId = requestAnimationFrame(animateFrame)

    interactionPad.value?.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    interactionPad.value?.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    disposeObject(outerShell)
    disposeObject(innerShell)
    disposeObject(glowShell)
    disposeObject(lineMesh)
    disposeObject(pointMesh)
    renderer?.dispose()
    canvasHost.value?.replaceChildren()
  })

  watch([width, height], ([nextWidth, nextHeight]) => {
    if (camera === null || renderer === null) return
    camera.aspect = nextWidth / nextHeight
    camera.updateProjectionMatrix()
    renderer.setSize(nextWidth, nextHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })
</script>

<template>
  <div class="hypercube-stage">
    <div ref="canvasHost" class="hypercube-stage__canvas"></div>
    <button ref="interactionPad" type="button" class="hypercube-stage__interaction" aria-label="拖动旋转超立方体"></button>
  </div>
</template>

<style scoped>
  .hypercube-stage {
    position: absolute;
    inset: 0;
    z-index: 5;
  }

  .hypercube-stage__canvas {
    position: absolute;
    inset: 0;
  }

  .hypercube-stage__interaction {
    position: absolute;
    inset: 50% auto auto 50%;
    width: min(46vw, 460px);
    height: min(72vh, 560px);
    transform: translate(-50%, -50%);
    border: 0;
    border-radius: 38%;
    background:
      radial-gradient(circle at 50% 50%, rgba(114, 192, 255, 0.08), transparent 58%);
    box-shadow: inset 0 0 0 1px rgba(148, 208, 255, 0.06);
    cursor: grab;
    touch-action: pan-y;
    appearance: none;
  }

  .hypercube-stage__interaction:active {
    cursor: grabbing;
  }

  @media (max-width: 900px) {
    .hypercube-stage__interaction {
      width: min(70vw, 420px);
      height: min(64svh, 520px);
    }
  }
</style>
