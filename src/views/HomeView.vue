<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { currentBook, currentChapter, currentChapterTitle, store } from '@/store'
import ToolBar from '@/components/ToolBar.vue'
import Settings from '@/components/Settings.vue'
import Chapter from '@/components/Chapter.vue'
import Bookmark from '@/components/Bookmark.vue'
import Bookshelf from '@/components/Bookshelf.vue'
import PageIndicator from '@/components/PageIndicator.vue'
import { dbPromise } from '@/db'

const dropActive = ref(false)
const columnGap = ref(30)

const canvasElement = ref<HTMLCanvasElement>()
const ctx = ref<CanvasRenderingContext2D | null>()
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const fontSize = computed(() => store.settings.fontSize)
const lineHeight = computed(() => store.settings.lineHeight)
const padding = 30 // 页面内边距
let pages: string[][] = [] // 分好页的章节内容

function initCanvas() {
  const el = canvasElement.value
  if (!el) return
  const devicePixelRatio = window.devicePixelRatio || 1
  canvasWidth.value = el.clientWidth * devicePixelRatio
  canvasHeight.value = el.clientHeight * devicePixelRatio
  el.width = canvasWidth.value
  el.height = canvasHeight.value
  ctx.value = el.getContext('2d')
}

async function init() {
  const db = await dbPromise
  const books = await db.getAll('bookshelf')
  store.bookshelf = books.map<IBook>(i => {
    return {
      title: i.title,
      chapters: JSON.parse(i.chapters),
      // contents: JSON.parse(i.contents),
      history: JSON.parse(i.history),
      showDelete: false
    }
  })
}

init()
watch(() => currentBook.value, async (newVal) => {
  await nextTick()
  initCanvas()
  console.log('change book:', newVal, ctx)
  await refreshMaxPage(newVal)
  pages = splitTextToPages(currentChapter.value)
  drawPage(store.page)
})
watch(() => currentChapter.value, () => {
  pages = splitTextToPages(currentChapter.value)
  drawPage(store.page)
})
watch(() => store.page, (newPage) => {
  drawPage(newPage)
})

const computingChapterIndex = ref(0)
const computingPage = ref(false)

/**
 * 重置最大页数，在页面发生变化时使用
 */
async function refreshMaxPage(book: IBook | undefined) {
  book = book || currentBook.value
  computingPage.value = true
  if (!book) return
  for (let i = 0; i < (book && book.chapters.length); i++) {
    await nextTick()
    await (new Promise(resolve => setTimeout(resolve, 1)))
    computingChapterIndex.value = i
    const tmpPages = splitTextToPages(book!.chapters[i].contents)
    console.log('tmpPages:', tmpPages)
    book!.chapters[i].maxPage = tmpPages.length - 1
  }
  console.log(book.chapters)
  computingPage.value = false
  store.maxPage = currentChapterTitle.value.maxPage || 0
  if (store.page > store.maxPage) {
    store.page = store.maxPage
  }
}

function splitTextToPages(textLines: string[]): string[][] {
  const linesPerPage: string[] = []
  const result: string[][] = []
  let heightUsed = padding

  const ctxCtx = ctx.value
  if (!ctxCtx) return []

  ctxCtx.font = `${fontSize.value}px sans-serif`
  ctxCtx.textBaseline = 'top'

  for (const line of textLines) {
    const words = line.split('')
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine + word
      const { width } = ctxCtx.measureText(testLine)
      if (width > canvasWidth.value - padding * 2 && currentLine !== '') {
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

// 绘制当前页面内容
function drawPage(pageIndex: number) {
  console.log(pages, pageIndex)
  const ctxVal = ctx.value
  if (!ctxVal || !pages[pageIndex]) return

  ctxVal.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  // 设置样式
  ctxVal.fillStyle = 'white'
  ctxVal.font = `${fontSize.value}px sans-serif`
  ctxVal.textBaseline = 'top'

  let y = padding
  for (const line of pages[pageIndex]) {
    ctxVal.fillText(line, padding, y)
    y += lineHeight.value
  }
}

// 响应窗口变化
function onResize() {
  initCanvas()
  refreshMaxPage()
}

const drop = (e: DragEvent) => {
  dropActive.value = false
  e.stopPropagation()
  e.preventDefault()
  if (e.dataTransfer?.files) {
    resolveFile(e.dataTransfer.files)
  }
}
const dragleave = (e: DragEvent) => {
  e.stopPropagation()
  e.preventDefault()
  dropActive.value = false
}
const dragenter = (e: DragEvent) => {
  e.stopPropagation()
  e.preventDefault()
  dropActive.value = true
}
const dragover = (e: DragEvent) => {
  e.stopPropagation()
  e.preventDefault()
  dropActive.value = true
}

// 键盘事件处理
function onKeyDown(e: KeyboardEvent) {
  if (currentBook.value) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      store.prevPage()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      store.nextPage()
    } else if (e.key === 'c') {
      store.switchShowChapters()
    } else if (e.key === 'z') {
      store.switchShowBookmarks()
    } else if (e.key === 's') {
      store.switchSettings()
    } else if (e.key === 't') {
      store.switchShowMenu()
    } else if (e.key === 'q') {
      store.switchColumnMode()
    } else if (e.key === 'a') {
      store.addBookmark()
    } else if (e.key === 'b') {
      store.backToBookshelf()
    }
  }
}

// 点击事件处理
function onClick(e: MouseEvent) {
  if (store.showChapters) {
    store.switchShowChapters()
  }
  if (store.showBookmarks) {
    store.switchShowBookmarks()
  }
  if (store.showSettings) {
    store.switchSettings()
  }
  const unitWidth = window.innerWidth / 3
  if (e.clientX < unitWidth) {
    store.prevPage()
  } else if (e.clientX < unitWidth * 2) {
    store.switchShowMenu()
  } else {
    store.nextPage()
  }
}

const onChapterChange = (e: number) => {
  store.page = 0
  store.currentChapterIndex = e
  console.log(currentChapter)
}

// 监听窗口变化
window.addEventListener('resize', onResize)
window.addEventListener('keydown', onKeyDown)
window.addEventListener('click', onClick)

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('click', onClick)
})

const resolveFile = (files?: FileList) => {
  if (files && files.length > 0) {
    const fr = new FileReader()
    const txt = files[0]
    if (!txt.name.endsWith('.txt')) {
      return alert('文件格式不正确')
    }

    fr.onloadend = () => {
      if (!(fr.result instanceof ArrayBuffer)) return

      // 默认尝试解码为 UTF-8
      let decoder = new TextDecoder('utf-8', { fatal: false })
      let txtContent = decoder.decode(new Uint8Array(fr.result))

      // 判断是否乱码（简单判断法：是否有大量  替换字符）
      if (txtContent.includes('\uFFFD')) {
        // 尝试使用 GBK 解码
        try {
          decoder = new TextDecoder('gbk', { fatal: true })
          txtContent = decoder.decode(new Uint8Array(fr.result))
        } catch (e) {
          console.warn('无法用 GBK 解码，可能是其他编码格式。')
        }
      }

      store.currentTxt = txt.name

      // 处理换行符 & 分割成数组
      const contentLines = txtContent
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')

      const chapterReg = /^\s*第\s*([\d一二三四五六七八九十百千万.]+?)\s*[章卷话]/ig
      type T = { index: number, title: string, contents: string[] }
      const chapters: T[] = []

      for (let i = 0; i < contentLines.length; i++) {
        if (contentLines[i].match(chapterReg)) {
          chapters.push({
            index: i,
            title: contentLines[i],
            contents: []
          })
        }
      }

      store.chapters = chapters.map<IChapter>((value, index, array) => {
        const currentIndex = value.index
        let nextIndex = array[index + 1]?.index ?? contentLines.length
        return {
          title: value.title,
          contents: contentLines.slice(currentIndex, nextIndex)
        }
      })

      store.chapters.unshift({
        title: txt.name,
        contents: [txt.name].concat(contentLines.slice(0, chapters[0]?.index || 0))
      })

      store.currentChapterIndex = 0
      store.addToBookshelf()
    }

    fr.readAsArrayBuffer(txt)
  }
}
</script>

<template>
  <main
    id="main"
    :class="dropActive ? 'drop-active' : ''"
    @dragenter="dragenter"
    @dragleave="dragleave"
    @dragover="dragover"
    @drop="drop"
  >
    <div v-if="currentBook && computingPage" class="computing">正在计算页数{{ computingChapterIndex + 1 }}/ {{ currentBook.chapters.length }}</div>

    <canvas v-if="currentBook" ref="canvasElement"></canvas>
    <Chapter @chapter-change="onChapterChange" />
    <Bookmark />
    <template v-if="!currentBook">
      <Bookshelf @upload="resolveFile($event)" />
    </template>
    <PageIndicator />
    <ToolBar />
    <Settings />
  </main>
</template>

<style lang="scss">
.computing {
  background-color: rgba(0, 0, 0, .7);
  color: #fff;
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  z-index: 2;
  left: 0;
  top: 0;
}

$page-indicator: 50px;

#main {
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 20px 20px 0 20px;
  //display: flex;
  //flex-direction: column;
}

.drop-active {
  border-radius: 20px;
  border: 5px dashed #ffffff;
  //background-color: red;
}

::-webkit-scrollbar {
  width: 10px;
  background: var(--color-background-mute);
}

::-webkit-scrollbar-thumb {
  width: 10px;
  background: var(--color-border);
}

canvas {
  width: 100%;
  height: calc(100% - $page-indicator);
  display: block;
  //background-color: #fff;
}
</style>
