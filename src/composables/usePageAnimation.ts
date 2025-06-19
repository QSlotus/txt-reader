import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { store } from '@/store'

export function usePageAnimation(
  drawPage: (pageIndex: number) => void,
  drawCachedPage: (ctx: CanvasRenderingContext2D, drawingPages: readonly string[][], pageIndex: number, offsetX: number) => void
) {
  const animationProgress = ref(0)
  const animationDirection = ref<'left' | 'right'>('right')
  const cachedChapter = ref(store.currentChapterIndex)


  // 预先创建离屏 canvas
  const offscreenCanvas = document.createElement('canvas')
  const offscreenCtx = offscreenCanvas.getContext('2d')
  let mainCanvas: HTMLCanvasElement | null = null
  let mainCtx: CanvasRenderingContext2D | null = null

  async function animate(oldPage: number, pageIndex: number) {
    if (store.isAnimating) return


    const direction = cachedChapter.value !== store.currentChapterIndex
      ? (store.currentChapterIndex > cachedChapter.value ? 'right' : 'left')
      : (pageIndex > oldPage ? 'right' : 'left')

    animationDirection.value = direction


    mainCanvas = document.querySelector('canvas') as HTMLCanvasElement
    if (!mainCanvas) return
    mainCtx = mainCanvas.getContext('2d')
    if (!mainCtx) return

    // 缓存当前页和下一页内容
    const prevPageChapterIndex = cachedChapter.value
    const prevPageIndex = oldPage
    const nextPageChapterIndex = store.currentChapterIndex
    const nextPageIndex = pageIndex
    cachedChapter.value = store.currentChapterIndex

    const duration = 150 // 动画持续时间（ms）
    const startTime = performance.now()

    const width = mainCanvas.width
    const height = mainCanvas.height

    offscreenCanvas.width = width
    offscreenCanvas.height = height

    let prevDrawingPages = store.chapters[prevPageChapterIndex]?.splitPages
    let nextDrawingPages = store.chapters[nextPageChapterIndex]?.splitPages
    if (!prevDrawingPages || !nextDrawingPages) return
    function step(time: number) {
      console.log('step')
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用 ease-in-out 缓动函数
      const easedProgress = easeInOut(progress)
      animationProgress.value = easedProgress

      offscreenCtx!.clearRect(0, 0, width, height)

      // 绘制当前页和目标页
      if (direction === 'right') {
        // 向右滑动：当前页向左移出，下一页从右侧进入
        drawCachedPage(offscreenCtx!, prevDrawingPages!, prevPageIndex, -easedProgress * width)
        drawCachedPage(offscreenCtx!, nextDrawingPages!, nextPageIndex, (1 - easedProgress) * width)
      } else {
        // 向左滑动：当前页向右移出，上一页从左侧进入
        drawCachedPage(offscreenCtx!, prevDrawingPages!, prevPageIndex, easedProgress * width)
        drawCachedPage(offscreenCtx!, nextDrawingPages!, nextPageIndex, -(1 - easedProgress) * width)
      }

      mainCtx?.clearRect(0, 0, width, height)
      mainCtx?.drawImage(offscreenCanvas, 0, 0)


      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        drawPage(pageIndex)
        store.isAnimating = false
        animationProgress.value = 0
        // cachedChapter.value = store.currentChapterIndex
      }
    }

    store.isAnimating = true
    console.log('store.isAnimating', store.isAnimating)
    requestAnimationFrame(step)
  }

  return {
    animationProgress,
    animate
  }
}

// Ease-in-out 缓动函数（类似 CSS cubic-bezier(0.4, 0.0, 0.2, 1)）
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
