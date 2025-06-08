import type { Ref } from 'vue'
import { ref, computed, watchEffect } from 'vue'

export function useCanvasRenderer(canvasRef: Ref<HTMLCanvasElement | undefined>) {
  const ctx = ref<CanvasRenderingContext2D | null>(null)
  const canvasWidth = ref(0)
  const canvasHeight = ref(0)

  function initCanvas() {
    const el = canvasRef.value
    if (!el) return
    const devicePixelRatio = window.devicePixelRatio || 1
    canvasWidth.value = el.clientWidth * devicePixelRatio
    canvasHeight.value = el.clientHeight * devicePixelRatio
    el.width = canvasWidth.value
    el.height = canvasHeight.value
    ctx.value = el.getContext('2d')
    console.log('initCanvas')
  }

  return {
    ctx,
    canvasWidth,
    canvasHeight,
    initCanvas
  }
}
