<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const dropActive = ref(false)
const showChapters = ref(false)
const txtContent = ref<string[]>([])
const page = ref(0)
const maxPage = ref(0)
const contentElement = ref<HTMLElement>()
const chaptersElement = ref<HTMLElement>()
const columnGap = ref(30)
const chapters = ref<string[]>([])
const currentChapterIndex = ref(0)
const currentTxt = ref<string>()

interface WatchHistory {
  page: number
  chapterIndex: number
}

interface Book {
  title: string;
  chapters: string[];
  contents: string[];
  history: WatchHistory;
}

const bookshelf = ref<Book[]>([])
try {
  bookshelf.value = JSON.parse(localStorage.getItem('bookshelf') || '[]')
} catch (e) {
}
const currentBook = computed(() => bookshelf.value.find(i => i.title === currentTxt.value))

watch(page, () => {
  if (currentTxt.value && currentBook && currentBook.value?.history) {
    currentBook.value.history = { page: page.value, chapterIndex: currentChapterIndex.value }
    localStorage.setItem('bookshelf', JSON.stringify(bookshelf.value))
  }
})
watch(currentChapterIndex, () => {
  if (currentTxt.value && currentBook && currentBook.value?.history) {
    currentBook.value.history = { page: page.value, chapterIndex: currentChapterIndex.value }
    localStorage.setItem('bookshelf', JSON.stringify(bookshelf.value))
  }
})

const addToBookshelf = () => {
  const index = bookshelf.value.findIndex(i => i.title === currentTxt.value)
  const data = {
    title: currentTxt.value || '',
    chapters: chapters.value,
    contents: txtContent.value,
    history: {
      page: page.value,
      chapterIndex: currentChapterIndex.value
    }
  }
  if (index !== -1) {
    bookshelf.value[index] = data
  } else {
    bookshelf.value.push(data)
  }
  localStorage.setItem('bookshelf', JSON.stringify(bookshelf.value))
}


const contentStyle = computed(() => {
  if (contentElement.value) {
    const unitWidth = contentElement.value.clientWidth + columnGap.value
    const columnWidth = contentElement.value.clientWidth / 2 - columnGap.value
    const totalWidth = unitWidth * page.value
    return {
      transform: `translateX(-${totalWidth}px)`,
      columnWidth: `${columnWidth}px`,
      columnGap: `${columnGap.value}px`
    }
  }
})
const currentChapter = computed(() => {
  const nextIndex = currentChapterIndex.value + 1
  let startIndex = txtContent.value.indexOf(chapters.value[currentChapterIndex.value])
  if (startIndex === -1) {
    startIndex = 0
  }
  const endIndex = txtContent.value.indexOf(chapters.value[nextIndex])
  return txtContent.value.slice(startIndex, endIndex)
})

/**
 * 重置最大页数，在页面发生变化时使用
 * @param reversePage
 */
const refreshMaxPage = (reversePage = false) => nextTick(() => {
  if (contentElement.value?.clientWidth && contentElement.value?.clientWidth) {
    const pageWidth = contentElement.value.clientWidth + columnGap.value
    const pages = (contentElement.value.scrollWidth + columnGap.value) / pageWidth
    maxPage.value = Math.ceil(pages) - 1
    if (reversePage) {
      page.value = maxPage.value
    }
  }
})

const resolveFile = (files: FileList) => {
  if (files.length > 0) {
    const fr = new FileReader()
    const txt = files[0]
    fr.onloadend = () => {
      if (!fr.result) {
        return
      }
      currentTxt.value = txt.name
      txtContent.value = fr
        .result
        .toString()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
      const chapterReg = /^\s*第\s*([\d一二三四五六七八九十百千万.]+?)\s*[章卷话]/i
      chapters.value = txtContent.value.filter(item => chapterReg.test(item.toString()))
      chapters.value.unshift(txt.name)
      refreshMaxPage()
      addToBookshelf()
    }
    fr.readAsText(txt)
  }
}

const setChapter = (chapterIndex: number, reversePage = false) => {
  if (!reversePage) {
    page.value = 0
  }
  currentChapterIndex.value = chapterIndex
  refreshMaxPage(reversePage)
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

function prevPage() {
  if (page.value > 0) {
    page.value = page.value - 1
  } else if (currentChapterIndex.value > 0) {
    setChapter(currentChapterIndex.value - 1, true)
  }
}

function nextPage() {
  if (page.value < maxPage.value) {
    page.value = page.value + 1
  } else if (currentChapterIndex.value < chapters.value.length - 1) {
    setChapter(currentChapterIndex.value + 1)
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    prevPage()
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    nextPage()
  } else if (e.key === 'd') {
    showChapters.value = !showChapters.value
  } else if (e.key === 'b') {
    backToBookshelf()
  }
}

const onWheel = (e: WheelEvent) => {
  if (e.target !== contentElement.value) {
    return
  }
  if (e.deltaY > 0) {
    nextPage()
  } else if (e.deltaY < 0) {
    prevPage()
  }
}


const onResize = () => nextTick(() => {
  refreshMaxPage()
})
const read = (book: Book) => {
  currentTxt.value = book.title
  txtContent.value = book.contents
  chapters.value = book.chapters
  currentChapterIndex.value = book.history.chapterIndex
  page.value = book.history.page
  refreshMaxPage()
}
const onClick = (e: MouseEvent) => {
  if (e.target !== chaptersElement.value && showChapters.value) {
    showChapters.value = false
    return
  }
  console.log(e)
  const pageWidth = window.innerWidth
  if (e.clientY && e.clientX) {
    if (e.clientX < pageWidth / 2) {
      prevPage()
    }else{
      nextPage()
    }
  }
  // if () {
  // }
}
const fileUpload = ref<HTMLInputElement>()
const openUpload = () => {
  fileUpload.value?.click()
}
const onFileSelect = () => {
  if (fileUpload.value?.files) {
    resolveFile(fileUpload.value?.files)
  }
}
const backToBookshelf = () => {
  currentTxt.value = undefined
  txtContent.value = []
  chapters.value = []
  currentChapterIndex.value = 0
  page.value = 0
}
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
    <div class="chapters" ref="chaptersElement" :class="{show:showChapters}">
      <div class="chapters-content">
        <div class="chapters-list">
          <div v-for="(chapter,index) in chapters" :class="{active: index === currentChapterIndex}" class="chapters-item" @click="setChapter(index)">
            {{ chapter }}
          </div>
        </div>
        <button class="chapters-button" @click="showChapters = !showChapters">
          <span style="writing-mode: tb-rl;line-height: 18px;">{{ showChapters ? '隐 藏' : '目 录' }}</span>
        </button>
      </div>
    </div>
    <div class="bookshelf" v-if="txtContent.length === 0" @click="openUpload">
      <input type="file" ref="fileUpload" style="display:none;" @change="onFileSelect">
      <div class="">
        <div class="book" v-for="book in bookshelf" @click.stop="read(book)">
          <div class="book-page" v-for="i in 5" :style="{top:`-${(5-i)*2}px`,right:`-${(5-i)*2}px`}"></div>
          <div class="cover">{{ book.title }}</div>
        </div>
      </div>
      <div class="file-placeholder">
        上传或将txt文件拖到此处
      </div>
    </div>
    <div
      class="content"
      ref="contentElement"
      :style="contentStyle"
      v-else
    >
      {{ currentChapter.join('\n') }}
    </div>
    <div class="page-indicator">
      <div>
        <a @click.stop="showChapters = true">{{ chapters[currentChapterIndex] }}({{ currentChapterIndex + 1 }}/{{ chapters.length + 1 }})</a>
      </div>
      <div> {{ page + 1 }}/{{ maxPage + 1 }}</div>
      <button class="btn" style="position: absolute;left: 0;top: 0" @click.stop="showChapters=true">打开目录</button>
      <button class="btn" style="position: absolute;right: 0;top: 0" @click="backToBookshelf">回到书架</button>
    </div>
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

.bookshelf {
  display: flex;
  //align-items: center;
  //justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
}

.file-placeholder {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
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

.chapters {
  top: 0;
  left: 0;
  z-index: 1;
  width: 300px;
  position: fixed;
  transition: .3s;
  background-color: var(--color-background-soft);
  transform: translateX(-100%);

  &.show {
    transform: translateX(0);
  }

  &-content {
    position: relative;
  }

  &-list {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  &-item {
    //display: flex;
    //align-items: center;
    //justify-content: center;
    width: 100%;
    padding: 10px 20px;
    line-height: 18px;
    border-bottom: 1px solid #EBEBEB;

    &.active {
      color: hsla(160, 100%, 37%, 1);
    }
  }

  &-button {
    height: 100px;
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%) translateX(100%);
    z-index: 1;
    border: none;
    background-color: var(--color-background-soft);
    color: var(--color-text);
    padding: 20px 10px;
    border-radius: 0 15px 15px 0;
    opacity: 0;
    transition: .3s;
    writing-mode: tb-rl;

    &:hover {
      opacity: 1;

    }
  }
}

.page-indicator {
  height: $page-indicator;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.book {
  width: 150px;
  height: 200px;
  position: relative;
}

.cover {
  width: 100%;
  height: 100%;
  background-color: #d9d9d9;
  border-radius: 10px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  //display: flex;
  //align-items: center;
  //justify-content: center;
  color: black;
  padding: 30px;

  position: absolute;
}

.book-page {
  content: '';
  border-radius: 10px;
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: #d9d9d9;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
}

.btn {
  background: hsla(160, 100%, 37%, 1);
  border: none;
  padding: 10px 15px;
  color: #fff;
}
</style>
