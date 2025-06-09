import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { store } from '@/store'

export function usePageAnimation(
  drawPage: (pageIndex: number) => void,
  drawCachedPage: (ctx: CanvasRenderingContext2D, chapterIndex: number, pageIndex: number, offsetX: number) => void
) {
  const isAnimating = ref(false)
  const animationProgress = ref(0)
  const animationDirection = ref<'left' | 'right'>('right')
  const cachedChapter = ref(store.currentChapterIndex)

  async function animate(oldPage: number, pageIndex: number) {
    if (isAnimating.value) return
    isAnimating.value = true
    let direction: 'left' | 'right'
    if (cachedChapter.value !== store.currentChapterIndex) {
      direction = store.currentChapterIndex > cachedChapter.value ? 'right' : 'left'
    } else {
      direction = pageIndex > oldPage ? 'right' : 'left'
    }

    animationDirection.value = direction

    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return

    // 缓存当前页和下一页内容
    const prevPageChapterIndex = cachedChapter.value
    const prevPageIndex = oldPage
    const nextPageChapterIndex = store.currentChapterIndex
    const nextPageIndex = pageIndex
    cachedChapter.value = store.currentChapterIndex

    const duration = 100 // 动画持续时间（ms）

    const startTime = performance.now()

    function step(time: number) {
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)
      animationProgress.value = progress

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = window.innerWidth * window.devicePixelRatio
      canvas.height = window.innerHeight * window.devicePixelRatio

      // 绘制当前页和目标页
      if (direction === 'right') {
        // 向右滑动：当前页向左移出，下一页从右侧进入
        drawCachedPage(ctx, prevPageChapterIndex, prevPageIndex, -progress * canvas.width)
        drawCachedPage(ctx, nextPageChapterIndex, nextPageIndex, (1 - progress) * canvas.width)
      } else {
        // 向左滑动：当前页向右移出，上一页从左侧进入
        drawCachedPage(ctx, prevPageChapterIndex, prevPageIndex, progress * canvas.width)
        drawCachedPage(ctx, nextPageChapterIndex, nextPageIndex, -(1 - progress) * canvas.width)
      }

      // 将缓存绘制到主 Canvas
      const mainCanvas = document.querySelector('canvas') as HTMLCanvasElement
      if (mainCanvas) {
        const mainCtx = mainCanvas.getContext('2d')
        if (mainCtx) {
          mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height)
          mainCtx.drawImage(canvas, 0, 0)
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        drawPage(nextPageIndex) // 动画结束后重绘最终页
        isAnimating.value = false
        animationProgress.value = 0
      }
    }

    requestAnimationFrame(step)
  }

  return {
    isAnimating,
    animationProgress,
    animate
  }
}
