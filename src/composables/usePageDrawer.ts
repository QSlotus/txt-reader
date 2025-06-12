import { computed, watchEffect } from 'vue'
import type { Ref } from 'vue'
import { store } from '@/store'

// 主题配色
export const themeColors = {
  'default': { background: '#ffffff', text: '#181818' },
  'theme-dark': { background: '#181818', text: '#f8f8f8' },
  'theme-light': { background: '#ffffff', text: '#181818' },
  'theme-book': { background: 'rgb(241, 229, 201)', text: '#000000' },
  'theme-paper': { background: 'rgb(242,235,217)', text: '#000000' }
}

export function usePageDrawer(
  ctx: Ref<CanvasRenderingContext2D | null>,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>,
  fontSize: Ref<number>,
  lineHeight: Ref<number>
) {
  const padding = 30
  const pages = computed(() => store.chapters[store.currentChapterIndex]?.splitPages)
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  function drawSinglePage(ctxVal: CanvasRenderingContext2D, page: string[], offsetX: number, isChapterFirstPage: boolean = false) {
    if (!page.length) return

    let y = padding

    for (let i = 0; i < page.length; i++) {
      const line = page[i]

      if (i === 0 && isChapterFirstPage) {
        // 第一行且是章节标题，加粗显示
        ctxVal.font = `bold ${fontSize.value * 1.2}px sans-serif`
        ctxVal.fillStyle = themeColors[store.settings.theme as keyof typeof themeColors].text
        ctxVal.fillText(line, padding + offsetX, y)
        ctxVal.font = `${fontSize.value}px sans-serif` // 恢复正常字体
        ctxVal.fillStyle = themeColors[store.settings.theme as keyof typeof themeColors].text
      } else {
        ctxVal.fillText(line, padding + offsetX, y)
      }

      y += lineHeight.value
    }
  }

  function drawFullPage(pageIndex: number) {
    const ctxVal = ctx.value
    if (!ctxVal || !pages.value) return

    ctxVal.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    // 获取当前主题颜色
    const currentTheme = store.settings.theme as keyof typeof themeColors
    const colors = themeColors[currentTheme] || themeColors['default']

    // 绘制背景
    ctxVal.fillStyle = colors.background
    ctxVal.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

    // 设置文字样式
    ctxVal.fillStyle = colors.text
    ctxVal.font = `${fontSize.value}px sans-serif`
    ctxVal.textBaseline = 'top'

    if (!store.singleColumnMode) {
      const leftPageIndex = pageIndex * 2
      const rightPageIndex = leftPageIndex + 1

      if (pages.value[leftPageIndex]) {
        drawSinglePage(ctxVal, pages.value[leftPageIndex], 0, pageIndex === 0)
      }

      if (pages.value[rightPageIndex]) {
        drawSinglePage(ctxVal, pages.value[rightPageIndex], canvasWidth.value / 2)
      }
    } else {
      drawSinglePage(ctxVal, pages.value[pageIndex], 0, pageIndex === 0)
    }
    console.log('drawPage:', pageIndex, store.singleColumnMode)
  }

  function drawCachedPage(ctx: CanvasRenderingContext2D, drawingPages: readonly string[][], pageIndex: number, offsetX: number) {
    if (!tempCtx) return
    // 获取当前主题颜色
    const currentTheme = store.settings.theme as keyof typeof themeColors
    const colors = themeColors[currentTheme] || themeColors['default']

    tempCanvas.width = canvasWidth.value
    tempCanvas.height = canvasHeight.value


    // 绘制背景
    tempCtx.fillStyle = colors.background
    tempCtx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

    tempCtx.fillStyle = colors.text
    tempCtx.font = `${fontSize.value}px sans-serif`
    tempCtx.textBaseline = 'top'

    // let drawingPages = chapterIndex === store.currentChapterIndex ? pages.value : store.chapters[chapterIndex].splitPages!
    if (!drawingPages) {
      return
    }
    if (!store.singleColumnMode) {
      const leftPageIndex = pageIndex * 2
      const rightPageIndex = leftPageIndex + 1

      if (drawingPages[leftPageIndex]) {
        drawSinglePage(tempCtx, drawingPages[leftPageIndex], 0, pageIndex === 0)
      }

      if (drawingPages[rightPageIndex]) {
        drawSinglePage(tempCtx, drawingPages[rightPageIndex], canvasWidth.value / 2)
      }
    } else {
      drawSinglePage(tempCtx, drawingPages[pageIndex], 0, pageIndex === 0)
    }

    ctx.save()
    ctx.translate(offsetX, 0)
    ctx.drawImage(tempCanvas, 0, 0, canvasWidth.value, canvasHeight.value)
    ctx.restore()
  }

  return {
    drawPage: drawFullPage,
    drawCachedPage
  }
}
