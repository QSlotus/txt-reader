<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { currentBook, currentChapter, currentChapterTitle, store } from '@/store'
import ToolBar from '@/components/ToolBar.vue'
import Settings from '@/components/Settings.vue'
import Chapter from '@/components/Chapter.vue'
import Bookmark from '@/components/Bookmark.vue'
import Bookshelf from '@/components/Bookshelf.vue'
import PageIndicator from '@/components/PageIndicator.vue'
import { dbPromise } from '@/db'

const dropActive = ref(false)
const contentElement = ref<HTMLElement>()
const columnGap = ref(30)

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

window.addEventListener('beforeunload', async (e) => {
  // if (document.visibilityState === 'hidden') {
  await store.storeHistory()
  // }
})

watch(() => store.settings.lineHeight + store.settings.fontSize, () => {
  refreshMaxPage()
})
const styleKey = ref(0)

const contentStyle = computed(() => {
  console.log(styleKey.value)
  if (contentElement.value) {
    const unitWidth = contentElement.value.clientWidth + columnGap.value
    const columnWidth = (store.singleColumnMode ? contentElement.value.clientWidth : contentElement.value.clientWidth / 2) - columnGap.value
    const totalWidth = unitWidth * store.page
    return {
      transform: `translateX(-${totalWidth}px)`,
      columnWidth: `${columnWidth}px`,
      columnGap: `${columnGap.value}px`,
      fontSize: `${store.settings.fontSize}px`,
      lineHeight: `${store.settings.lineHeight}`
    }
  }
})


/**
 * 重置最大页数，在页面发生变化时使用
 */
function refreshMaxPage() {
  nextTick(() => {
    setTimeout(async () => {
      if (!currentBook.value) return
      computingPage.value = true
      await nextTick()
      for (let i = 0; i < (currentBook.value && currentBook.value.chapters.length); i++) {
        computingChapterIndex.value = i
        await setChapterPages()
        await nextTick()
        await (new Promise(resolve => setTimeout(resolve, 1)))
      }
      computingPage.value = false
      store.maxPage = currentChapterTitle.value.maxPage || 0
      // const instance = getCurrentInstance()
      // instance?.proxy?.$forceUpdate()
      styleKey.value = Math.random()
      if (store.page > store.maxPage) {
        store.page = store.maxPage
      }
    })
  })
}

const resolveFile = (files?: FileList) => {
  if (files && files.length > 0) {
    const fr = new FileReader()
    const txt = files[0]
    if (!txt.name.endsWith('.txt')) {
      return alert('文件格式不正确')
    }
    fr.onloadend = () => {
      if (!fr.result) {
        return
      }
      store.currentTxt = txt.name
      const txtContent = fr
        .result
        .toString()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
      const chapterReg = /^\s*第\s*([\d一二三四五六七八九十百千万.]+?)\s*[章卷话]/ig
      type T = { index: number, title: string, contents: string[] }
      const chapters: T[] = []
      for (let i = 0; i < txtContent.length; i++) {
        if (txtContent[i].match(chapterReg)) {
          chapters.push({
            index: i,
            title: txtContent[i],
            contents: []
          })
        }
      }
      store.chapters = chapters
        .map<IChapter>((value, index, array) => {
          const currentIndex = value.index
          let nextIndex
          if (array[index + 1]) {
            nextIndex = array[index + 1].index
          } else {
            nextIndex = txtContent.length
          }
          return {
            title: value.title,
            contents: txtContent.slice(currentIndex, nextIndex)
          }
        })
      store.chapters.unshift({
        title: txt.name,
        contents: [txt.name]
      })
      store.currentChapterIndex = 0
      store.addToBookshelf()
      // setTimeout(refreshMaxPage)
    }
    fr.readAsText(txt)
  }
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

const onKeyDown = (e: KeyboardEvent) => {
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

const onWheel = (e: WheelEvent) => {
  if ((e.target as HTMLElement) !== contentElement.value) {
    return
  }
  if (e.deltaY > 0) {
    store.nextPage()
  } else if (e.deltaY < 0) {
    store.prevPage()
  }
}

let doit: number

function onResize() {
  return nextTick(() => {
    clearTimeout(doit)
    doit = setTimeout(refreshMaxPage, 1000)
  })
}

const onClick = (e: MouseEvent) => {
  if (store.showChapters) {
    store.switchShowChapters()
  }
  if (store.showBookmarks) {
    store.switchShowBookmarks()
  }
  if (store.showSettings) {
    store.switchSettings()
  }
  const pageWidth = window.innerWidth
  if (e.clientY && e.clientX) {
    const unitWidth = pageWidth / 3
    if (e.clientX < unitWidth) {
      store.prevPage()
    } else if (e.clientX < unitWidth * 2) {
      store.switchShowMenu()
    } else {
      store.nextPage()
    }
  }
}

const onChapterChange = (e: number) => {
  store.page = 0
  store.currentChapterIndex = e
}

watch(() => store.singleColumnMode, () => {
  refreshMaxPage()
})

// compute chapters max page when book change
watch(() => store.currentTxt, async () => {
  refreshMaxPage()
})


window.addEventListener('keydown', onKeyDown)
window.addEventListener('wheel', onWheel)
window.addEventListener('resize', onResize)
window.addEventListener('click', onClick)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('click', onClick)
})

const computingChapterIndex = ref(0)
const computingChapter = computed<IChapter>(() => currentBook.value!.chapters[computingChapterIndex.value])
const hiddenContentRef = ref<HTMLElement>()
const computingContent = computed(() => {
  return computingChapter.value?.contents || []
})
const computingPage = ref(false)
const setChapterPages = async () => {
  await nextTick(() => {
    if (hiddenContentRef.value?.scrollWidth && hiddenContentRef.value?.clientWidth) {
      const pageWidth = hiddenContentRef.value.clientWidth + columnGap.value
      const page = (hiddenContentRef.value.scrollWidth + columnGap.value) / pageWidth
      computingChapter.value!.maxPage = Math.ceil(page) - 1
    }
  })
}
</script>

<template>
  <main
    id="main"
    @drop="drop"
    @dragleave="dragleave"
    @dragenter="dragenter"
    @dragover="dragover"
    :class="dropActive ? 'drop-active' : ''"
  >
    <div v-if="currentBook && computingPage" class="computing">正在计算页数{{ computingChapterIndex + 1 }}/ {{ currentBook.chapters.length }}</div>
    <Chapter @chapter-change="onChapterChange" />
    <Bookmark />
    <template v-if="!currentBook">
      <Bookshelf @upload="resolveFile($event)" />
    </template>
    <template v-else>
      <div class="content" ref="contentElement" :style="contentStyle">
        <h2 v-if="currentChapter[0]">{{ currentChapter[0] }}</h2>
        {{ currentChapter.slice(1, currentChapter.length).join('\n') }}
      </div>
      <div class="hidden-content" ref="hiddenContentRef" v-if="computingPage && computingContent.length > 0" :style="contentStyle">
        <h2 v-if="computingContent[0]">{{ computingContent[0] }}</h2>
        {{ computingContent.slice(1, currentChapter.length).join('\n') }}
      </div>
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
  //display: flex; //align-items: center; //justify-content: center;
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

.content {
  transition: .1s;
  white-space: pre-wrap;
  word-break: break-all;
  width: auto;
  height: calc(100% - $page-indicator);
}

* {
  box-sizing: border-box;
}

.hidden-content {
  visibility: hidden;
  white-space: pre-wrap;
  word-break: break-all;
  width: auto;
  height: calc(100% - $page-indicator);
}
</style>
