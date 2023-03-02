<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { currentChapter, store } from '@/store'
import ToolBar from '@/components/ToolBar.vue'
import Settings from '@/components/Settings.vue'
import Chapter from '@/components/Chapter.vue'
import Bookmark from '@/components/Bookmark.vue'
import Bookshelf from '@/components/Bookshelf.vue'
import PageIndicator from '@/components/PageIndicator.vue'

const dropActive = ref(false)
const contentElement = ref<HTMLElement>()
const columnGap = ref(30)


window.addEventListener('close', () => {
  store.storeHistory()
})

watch(() => store.currentChapterIndex, () => {
  refreshMaxPage()
})
watch(() => store.settings.lineHeight + store.settings.fontSize, () => {
  refreshMaxPage()
})

const contentStyle = computed(() => {
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
 * @param reversePage
 */
async function refreshMaxPage(reversePage = false) {
  return await nextTick(() => {
    if (contentElement.value?.clientWidth && contentElement.value?.clientWidth) {
      const pageWidth = contentElement.value.clientWidth + columnGap.value
      const pages = (contentElement.value.scrollWidth + columnGap.value) / pageWidth
      store.maxPage = Math.ceil(pages) - 1
      return store.maxPage
      // if (reversePage) {
      //   store.page = store.maxPage
      // }
    }
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
      store.txtContent = fr
        .result
        .toString()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
      const chapterReg = /^\s*第\s*([\d一二三四五六七八九十百千万.]+?)\s*[章卷话]/i
      store.chapters = store.txtContent.filter(item => chapterReg.test(item.toString()))
      store.chapters.unshift(txt.name)
      refreshMaxPage()
      store.addToBookshelf()
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
  if (store.txtContent.length > 0) {
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


const onResize = () => nextTick(() => {
  const instance = getCurrentInstance()
  instance?.proxy?.$forceUpdate()
  setTimeout(refreshMaxPage, 100)
})

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
  console.log(e)
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
  setTimeout(refreshMaxPage, 100)
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
    <Chapter @chapter-change="onChapterChange" />
    <Bookmark />
    <template v-if="store.txtContent.length === 0">
      <Bookshelf @upload="resolveFile($event)" />
    </template>
    <template v-else>
      <div class="content" ref="contentElement" :style="contentStyle">
        {{ currentChapter.join('\n') }}
      </div>
    </template>
    <PageIndicator />
    <ToolBar />
    <Settings />
  </main>
</template>
<style lang="scss">
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
  //flex: 1;
  height: calc(100% - $page-indicator);
  //height: 100%;
  //column-gap: 30px;
  //column-width: calc(50vw - 30px);
  font-size: 20px;
  font-family: Simhei, sans-serif;
}

* {
  box-sizing: border-box;
}

</style>
