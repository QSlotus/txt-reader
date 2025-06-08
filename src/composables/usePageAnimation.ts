import { ref, watch } from 'vue'
import type { Ref } from 'vue'

export function usePageAnimation(drawPage: (pageIndex: number) => void, totalPages: Ref<number>, currentPage: Ref<number>) {
  const isAnimating = ref(false)
  const animationProgress = ref(0)
  const animationDirection = ref<'left' | 'right'>('right')

  async function animate(pageIndex: number, direction: 'left' | 'right') {
    if (isAnimating.value) return
    isAnimating.value = true
    animationDirection.value = direction

    let start = 0
    const duration = 300
    const startTime = performance.now()

    function step(time: number) {
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)
      animationProgress.value = progress

      drawPage(direction === 'left' ? pageIndex + 1 : pageIndex)
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        isAnimating.value = false
        animationProgress.value = 0
      }
    }

    requestAnimationFrame(step)
  }

  return {
    isAnimating,
    animationProgress,
    animationDirection,
    animate
  }
}
