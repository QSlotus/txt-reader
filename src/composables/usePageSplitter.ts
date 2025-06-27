import { computed, ref, watchEffect } from 'vue'
import type { Ref } from 'vue'
import { store } from '@/store'


/**
 * 使用分页拆分文本的自定义钩子
 *
 * @param textLinesRef - 包含文本行的响应式引用
 * @param canvasWidth - 画布宽度的响应式引用
 * @param canvasHeight - 画布高度的响应式引用
 * @param fontSize - 字体大小的响应式引用
 * @param lineHeight - 行高的响应式引用
 *
 * 该钩子的主要功能是将给定的文本行根据画布的尺寸和字体属性分页拆分
 * 它通过计算每行文本的宽度和高度，以及画布的可用空间来确定如何分页
 */
export function usePageSplitter(textLinesRef: Ref<string[]>, canvasWidth: Ref<number>, canvasHeight: Ref<number>, fontSize: Ref<number>, lineHeight: Ref<number>) {
  // 内边距常量，用于计算文本区域的可用宽度和高度
  const padding = 30
  // 分页结果的响应式引用，每个页面是一个字符串数组
  const pages = ref<string[][]>([])
  const ctx = document.createElement('canvas').getContext('2d')

  /**
   * 将文本行拆分成多个页面
   *
   * @param textLines - 待拆分的文本行数组
   * @returns 返回一个二维数组，每个子数组代表一个页面的文本行
   */
  function splitTextToPages(textLines: string[]): string[][] {
    console.log('splitTextToPages, 行数:', textLines.length)
    
    // 如果文本行为空，返回至少一个空页面
    if (!textLines || textLines.length === 0) {
      console.log('文本行为空，返回空页面')
      return [['']]
    }
    
    // 存储每页的文本行
    const linesPerPage: string[] = []
    // 存储所有页面的文本行
    const result: string[][] = []
    // 当前页面已使用的高度
    let heightUsed = padding

    // 创建一个临时画布上下文用于测量文本宽度
    if (!ctx) {
      console.warn('无法创建画布上下文，返回默认页面')
      return [textLines]
    }

    // 设置画布上下文的字体和文本基线
    ctx.font = `${fontSize.value}px sans-serif`
    ctx.textBaseline = 'top'

    // 计算可用宽度，增加安全边距避免文字被截断
    const availableWidth = store.singleColumnMode 
      ? canvasWidth.value - padding * 2 // 单列模式下减去两侧的内边距
      : (canvasWidth.value / 2) - padding * 2 // 双列模式下是画布宽度的一半减去内边距
    
    console.log('可用宽度:', availableWidth, '可用高度:', canvasHeight.value - padding * 2)

    // 遍历每一行文本
    for (const line of textLines) {
      // 将文本行拆分成单词
      const words = line.split('')
      let currentLine = ''
      // 遍历每一个单词
      for (const word of words) {
        // 测试当前行加上下一个单词的宽度
        const testLine = currentLine + word
        const { width } = ctx.measureText(testLine)
        // 如果超过可用宽度且当前行不为空，则将当前行添加到页面中，并重置当前行
        if (width > availableWidth && currentLine !== '') {
          linesPerPage.push(currentLine)
          heightUsed += lineHeight.value
          currentLine = word

          // 如果当前页面的高度已满，则将当前页面添加到结果中，并重置页面
          if (heightUsed >= canvasHeight.value - padding * 2) {
            result.push([...linesPerPage])
            linesPerPage.length = 0
            heightUsed = padding
          }
        } else {
          currentLine = testLine
        }
      }
      // 如果当前行不为空，则将其添加到页面中
      if (currentLine) {
        linesPerPage.push(currentLine)
        heightUsed += lineHeight.value
      }

      // 如果当前页面的高度已满，则将当前页面添加到结果中，并重置页面
      if (heightUsed >= canvasHeight.value - padding * 2) {
        result.push([...linesPerPage])
        linesPerPage.length = 0
        heightUsed = padding
      }
    }

    // 如果还有剩余的文本行，则将其添加到结果中
    if (linesPerPage.length > 0) {
      result.push(linesPerPage)
    }
    
    // 确保至少有一个页面
    if (result.length === 0) {
      console.log('未生成任何页面，添加默认页面')
      result.push([''])
    }
    
    console.log('分页结果:', result.length, '页')

    // 返回分页结果
    return result
  }

  // 监听文本行的变化，并重新分页
  // watchEffect(() => {
  //   console.log(textLinesRef)
  //   pages.value = splitTextToPages(textLinesRef.value)
  // })

  // 返回分页结果和分页函数
  return {
    pages,
    splitTextToPages
  }
}
