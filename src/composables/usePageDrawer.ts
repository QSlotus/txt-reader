import { computed, watchEffect } from 'vue'
import type { Ref } from 'vue'
import { store } from '@/store'

export function usePageDrawer(ctx: Ref<CanvasRenderingContext2D | null>, canvasWidth: Ref<number>, canvasHeight: Ref<number>, fontSize: Ref<number>, lineHeight: Ref<number>, pages: Ref<string[][]>) {
  const padding = 30

  function drawSinglePage(ctxVal: CanvasRenderingContext2D, pageIndex: number, offsetX: number) {
    const page = pages.value[pageIndex]
    if (!page) return

    let y = padding
    for (const line of page) {
      ctxVal.fillText(line, padding + offsetX, y)
      y += lineHeight.value
    }
  }

  function drawPage(pageIndex: number) {
    const ctxVal = ctx.value
    if (!ctxVal) return

    ctxVal.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
    ctxVal.fillStyle = 'white'
    ctxVal.font = `${fontSize.value}px sans-serif`
    ctxVal.textBaseline = 'top'

    // 双列模式下，每页含两列内容
    if (!store.singleColumnMode) {
      const leftPageIndex = pageIndex * 2
      const rightPageIndex = leftPageIndex + 1

      if (pages.value[leftPageIndex]) {
        drawSinglePage(ctxVal, leftPageIndex, 0)
      }

      if (pages.value[rightPageIndex]) {
        drawSinglePage(ctxVal, rightPageIndex, canvasWidth.value / 2)
      }
    } else {
      if (pages.value[pageIndex]) {
        drawSinglePage(ctxVal, pageIndex, 0)
      }
    }
    console.log('drawPage:', pageIndex, store.singleColumnMode)
  }

  return {
    drawPage
  }
}
