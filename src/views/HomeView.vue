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

import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import { usePageSplitter } from '@/composables/usePageSplitter'
import { usePageDrawer } from '@/composables/usePageDrawer'
import { usePageAnimation } from '@/composables/usePageAnimation'

const dropActive = ref(false)

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

const canvasElement = ref<HTMLCanvasElement>()
const fontSize = computed(() => store.settings.fontSize)
const lineHeight = computed(() => store.settings.lineHeight)

// 初始化 Canvas
const { ctx, canvasWidth, canvasHeight, initCanvas } = useCanvasRenderer(canvasElement)

// 分页
const { pages, splitTextToPages } = usePageSplitter(currentChapter, canvasWidth, canvasHeight, fontSize, lineHeight)

// 绘制
const { drawPage, drawCachedPage } = usePageDrawer(ctx, canvasWidth, canvasHeight, fontSize, lineHeight)


const { animate } = usePageAnimation(drawPage, drawCachedPage)

watch(() => ({
  page: store.page,
  chapterIndex: store.currentChapterIndex
}), (newPage, oldPage) => {
  if (oldPage === undefined) return
  animate(oldPage.page, newPage.page)
  // console.log(store.chapters[newPage.chapterIndex].splitPages!)
})

// 切换章节时重新绘制
// watch(currentChapter, () => {
//   drawPage(store.page)
// })

// 切换设置时刷新
watch(() => store.settings, async () => {
  await refreshMaxPage()
})

// 切换双列模式时刷新
watch(() => store.singleColumnMode, async () => {
  await refreshMaxPage()
})

// 翻页
watch(() => store.page, (newPage) => {
  drawPage(newPage)
})


watch(currentBook, async () => {
  await refreshMaxPage()
})

const computingChapterIndex = ref(0)
const computingPage = ref(false)

/**
 * 重置最大页数，在页面发生变化时使用（更换章节/字体变更/列数变更）
 */
async function refreshMaxPage(book: IBook | undefined = undefined) {
  await nextTick()
  initCanvas()
  book = book || currentBook.value
  computingPage.value = true
  if (!book) return
  for (let i = 0; i < (book && book.chapters.length); i++) {
    await nextTick()
    await (new Promise(resolve => setTimeout(resolve)))
    computingChapterIndex.value = i
    const tmpPages = splitTextToPages(book!.chapters[i].contents)
    book!.chapters[i].maxPage = store.singleColumnMode ? tmpPages.length - 1 : Math.ceil(tmpPages.length / 2) - 1
    book!.chapters[i].splitPages = tmpPages
  }
  computingPage.value = false
  store.maxPage = currentChapterTitle.value.maxPage || 0
  if (store.page > store.maxPage) {
    store.page = store.maxPage
  }
  drawPage(store.page)
}


// 响应窗口变化
let resizeTimeout: number | null = null

function onResize() {
  if (computingPage.value) {
    return
  }
  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = window.setTimeout(() => {
    initCanvas()
    refreshMaxPage()
    drawPage(store.page)
    resizeTimeout = null
  }, 300) // 缓冲 300ms
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
$page-indicator: 50px;

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
