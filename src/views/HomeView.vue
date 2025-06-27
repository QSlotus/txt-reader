<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { currentBook, currentChapter, currentChapterTitle, currentPage, store } from '@/store'
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
      chapters: (JSON.parse(i.chapters) as IChapter[]).map(chapter => {
        return {
          title: chapter.title,
          contents: Object.freeze(chapter.contents),
          maxPage: chapter.maxPage,
          splitPages: chapter.splitPages
        } as IChapter
      }),
      // contents: JSON.parse(i.contents),
      history: JSON.parse(i.history),
      showDelete: false
    }
  })
  
  // 检查URL参数，如果存在url参数，则自动加载对应的远程TXT文件
  checkUrlParams()
}

// 检查URL参数并加载远程文件
const checkUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const remoteFileUrl = urlParams.get('url')
  const customName = urlParams.get('name') // 支持自定义名称参数
  
  if (remoteFileUrl) {
    try {
      // 解码URL，确保特殊字符处理正确
      const decodedUrl = decodeURIComponent(remoteFileUrl)
      console.log('从URL参数加载远程文件:', decodedUrl)
      
      // 如果URL参数中包含远程文件地址，则自动加载
      loadRemoteUrl(decodedUrl, customName ? decodeURIComponent(customName) : undefined)
      
      // 不再清除URL参数，保留原始URL以便于分享
      // const newUrl = window.location.pathname + window.location.hash
      // window.history.replaceState({}, '', newUrl)
    } catch (error) {
      console.error('解析URL参数失败:', error)
      alert('解析URL参数失败，请检查链接格式')
    }
  }
}

init()

const canvasElement = ref<HTMLCanvasElement>()
const fontSize = computed(() => store.settings.fontSize)
const lineHeight = computed(() => store.settings.lineHeight)

// 初始化 Canvas
const { ctx, canvasWidth, canvasHeight, initCanvas } = useCanvasRenderer(canvasElement)

// 分页
const { splitTextToPages } = usePageSplitter(currentChapter, canvasWidth, canvasHeight, fontSize, lineHeight)

// 绘制
const { drawPage, drawCachedPage } = usePageDrawer(ctx, canvasWidth, canvasHeight, fontSize, lineHeight)


const { animate } = usePageAnimation(drawPage, drawCachedPage)

watch(() => ({
  page: currentPage.value,
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
}, { deep: true })

// 切换双列模式时刷新
watch(() => store.singleColumnMode, async () => {
  await refreshMaxPage()
})

// 翻页
// watch(() => store.page, (newPage) => {
//   drawPage(newPage)
// })


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
  console.log('开始刷新最大页数')
  initCanvas()
  book = book || currentBook.value
  computingPage.value = true
  
  if (!book) {
    console.warn('没有书籍数据，无法计算页数')
    computingPage.value = false
    return
  }
  
  console.log('计算页数，章节数:', book.chapters.length)
  
  for (let i = 0; i < book.chapters.length; i++) {
    await nextTick()
    await (new Promise(resolve => setTimeout(resolve)))
    computingChapterIndex.value = i
    
    console.log(`处理第${i+1}章，内容行数:`, book.chapters[i].contents.length)
    
    // 确保章节内容不为空
    if (!book.chapters[i].contents || book.chapters[i].contents.length === 0) {
      console.warn(`第${i+1}章内容为空，添加默认内容`)
      book.chapters[i].contents = [book.chapters[i].title || '空章节']
    }
    
    const tmpPages = Object.freeze(splitTextToPages(book.chapters[i].contents))
    console.log(`第${i+1}章分页结果:`, tmpPages.length, '页')
    
    book.chapters[i].maxPage = store.singleColumnMode ? 
      Math.max(0, tmpPages.length - 1) : 
      Math.max(0, Math.ceil(tmpPages.length / 2) - 1)
    
    book.chapters[i].splitPages = tmpPages
    
    console.log(`第${i+1}章最大页数:`, book.chapters[i].maxPage)
  }
  
  computingPage.value = false
  store.maxPage = currentChapterTitle.value?.maxPage || 0
  console.log('当前章节最大页数:', store.maxPage)
  
  if (currentPage.value > store.maxPage) {
    currentPage.value = store.maxPage
  }
  
  console.log('绘制页面:', currentPage.value)
  drawPage(currentPage.value)
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
    drawPage(currentPage.value)
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


const onWheel = (e: WheelEvent) => {
  if ((e.target as HTMLElement) !== canvasElement.value) {
    return
  }
  if (e.deltaY > 0) {
    store.nextPage()
  } else if (e.deltaY < 0) {
    store.prevPage()
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
  currentPage.value = 0
  store.currentChapterIndex = e
  console.log(currentChapter)
}

// 监听窗口变化
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

      processTxtContent(txtContent, txt.name)
    }

    fr.readAsArrayBuffer(txt)
  }
}

// 处理远程URL加载
const loadRemoteUrl = async (url: string, customName?: string) => {
  // 显示加载状态
  computingPage.value = true
  const loadingMessage = '正在加载远程文件...'
  
  try {
    console.log('开始加载远程文件:', url)
    
    // 检查URL格式
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url
    }
    
    // 如果提供了自定义名称，直接使用
    let fileName = customName || 'remote-file.txt'
    
    // 如果没有自定义名称，尝试从URL中提取
    if (!customName) {
      try {
        // 尝试从URL中提取文件名
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split('/')
        const lastPart = pathParts[pathParts.length - 1]
        
        // 如果路径最后部分包含.txt，则使用它作为文件名
        if (lastPart.includes('.txt')) {
          fileName = decodeURIComponent(lastPart)
        } else {
          // 尝试从查询参数中提取可能的文件名
          for (const [key, value] of urlObj.searchParams.entries()) {
            if (value.toLowerCase().endsWith('.txt')) {
              fileName = decodeURIComponent(value)
              break
            }
          }
          
          // 如果URL中有文件名相关的参数
          if (urlObj.searchParams.has('filename')) {
            fileName = decodeURIComponent(urlObj.searchParams.get('filename') || 'remote-file.txt')
          } else if (urlObj.searchParams.has('name')) {
            fileName = decodeURIComponent(urlObj.searchParams.get('name') || 'remote-file.txt')
          }
        }
        
        // 清理文件名（移除查询参数等）
        fileName = fileName.split('?')[0]
      } catch (e) {
        console.warn('从URL提取文件名失败，使用默认名称', e)
      }
    }
    
    // 确保文件名以.txt结尾
    if (!fileName.toLowerCase().endsWith('.txt')) {
      fileName += '.txt'
    }
    
    console.log('文件名:', fileName)

    // 尝试直接获取远程文件
    let response: Response | null = null
    let fetchError: Error | null = null
    
    try {
      response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Accept': 'text/plain,*/*'
        }
      })
    } catch (error) {
      fetchError = error as Error
      console.warn('直接获取文件失败，尝试使用代理:', error)
    }
    
    // 如果直接获取失败，尝试使用代理服务
    if (!response || !response.ok) {
      // 使用CORS代理服务
      const corsProxies = [
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?'
      ]
      
      for (const proxy of corsProxies) {
        try {
          console.log('尝试使用代理:', proxy)
          const proxyUrl = proxy + encodeURIComponent(url)
          response = await fetch(proxyUrl, {
            headers: {
              'Accept': 'text/plain,*/*',
              'X-Requested-With': 'XMLHttpRequest'
            }
          })
          
          if (response.ok) {
            console.log('使用代理成功获取文件')
            break
          }
        } catch (error) {
          console.warn(`代理 ${proxy} 获取失败:`, error)
        }
      }
    }
    
    if (!response || !response.ok) {
      throw fetchError || new Error(`加载失败: ${response?.status} ${response?.statusText}`)
    }

    // 获取文件内容
    const buffer = await response.arrayBuffer()
    console.log('文件已下载，大小:', buffer.byteLength, '字节')
    
    // 默认尝试解码为 UTF-8
    let decoder = new TextDecoder('utf-8', { fatal: false })
    let txtContent = decoder.decode(new Uint8Array(buffer))

    // 判断是否乱码（简单判断法：是否有大量替换字符）
    if (txtContent.includes('\uFFFD')) {
      console.log('检测到UTF-8解码可能有问题，尝试GBK解码')
      // 尝试使用 GBK 解码
      try {
        decoder = new TextDecoder('gbk', { fatal: true })
        txtContent = decoder.decode(new Uint8Array(buffer))
      } catch (e) {
        console.warn('无法用 GBK 解码，可能是其他编码格式。')
      }
    }

    // 处理文本内容
    processTxtContent(txtContent, fileName)
    console.log('文件加载并处理完成')
  } catch (error) {
    const errorMsg = `加载远程文件失败: ${error instanceof Error ? error.message : '未知错误'}`
    alert(errorMsg)
    console.error('加载远程文件失败:', error)
  } finally {
    computingPage.value = false
  }
}

// 提取处理文本内容的通用方法
const processTxtContent = (txtContent: string, fileName: string) => {
  console.log('处理文本内容，文件名:', fileName)
  console.log('文本长度:', txtContent.length, '字符')
  
  store.currentTxt = fileName

      // 处理换行符 & 分割成数组
      const contentLines = txtContent
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
  
  console.log('行数:', contentLines.length)

      const chapterReg = /^\s*第\s*([\d一二三四五六七八九十百千万.]+?)\s*[章卷话]/ig
      type T = { index: number, title: string, contents: string[] }
      const chapters: T[] = []

  // 查找所有章节
      for (let i = 0; i < contentLines.length; i++) {
        if (contentLines[i].match(chapterReg)) {
          chapters.push({
            index: i,
            title: contentLines[i],
            contents: []
          })
        }
      }

  console.log('找到章节数:', chapters.length)

  // 如果找到了章节，按章节处理
  if (chapters.length > 0) {
      store.chapters = chapters.map<IChapter>((value, index, array) => {
        const currentIndex = value.index
        let nextIndex = array[index + 1]?.index ?? contentLines.length
        return {
          title: value.title,
          contents: contentLines.slice(currentIndex, nextIndex)
        }
      })

    // 添加文件开头到第一章之间的内容作为"前言"章节
      store.chapters.unshift({
      title: fileName,
      contents: [fileName].concat(contentLines.slice(0, chapters[0]?.index || 0))
    })
  } else {
    // 如果没有找到章节，将整个文件作为一个章节处理
    console.log('未找到章节，将整个文件作为一个章节处理')
    store.chapters = [{
      title: fileName,
      contents: [fileName].concat(contentLines)
    }]
  }

  console.log('最终章节数:', store.chapters.length)
  console.log('第一章内容行数:', store.chapters[0].contents.length)

      store.currentChapterIndex = 0
  const book = store.addToBookshelf()
  
  // 确保页面计算和渲染
  nextTick(() => {
    console.log('开始刷新页面计算')
    refreshMaxPage(book)
  })
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
      <Bookshelf @upload="resolveFile($event)" @loadUrl="loadRemoteUrl" />
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
