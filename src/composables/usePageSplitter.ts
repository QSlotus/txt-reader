import { computed, ref, watchEffect } from 'vue'
import type { Ref } from 'vue'
import { store } from '@/store'

export function usePageSplitter(textLinesRef: Ref<string[]>, canvasWidth: Ref<number>, canvasHeight: Ref<number>, fontSize: Ref<number>, lineHeight: Ref<number>) {
  const padding = 30
  const pages = ref<string[][]>([])

  function splitTextToPages(textLines: string[]): string[][] {
    const linesPerPage: string[] = []
    const result: string[][] = []
    let heightUsed = padding

    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return []

    ctx.font = `${fontSize.value}px sans-serif`
    ctx.textBaseline = 'top'

    // 计算可用宽度为 canvasWidth 的一半
    const availableWidth = store.singleColumnMode ? canvasWidth.value : canvasWidth.value / 2 - padding * 2

    for (const line of textLines) {
      const words = line.split('')
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine + word
        const { width } = ctx.measureText(testLine)
        if (width > availableWidth && currentLine !== '') {
          linesPerPage.push(currentLine)
          heightUsed += lineHeight.value
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        linesPerPage.push(currentLine)
        heightUsed += lineHeight.value
      }

      if (heightUsed >= canvasHeight.value - padding) {
        result.push([...linesPerPage])
        linesPerPage.length = 0
        heightUsed = padding
      }
    }

    if (linesPerPage.length > 0) {
      result.push(linesPerPage)
    }

    return result
  }

  watchEffect(() => {
    console.log(textLinesRef)
    pages.value = splitTextToPages(textLinesRef.value)
  })

  return {
    pages,
    splitTextToPages
  }
}
