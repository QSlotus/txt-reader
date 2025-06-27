<script setup lang="ts">

import { ref, computed } from 'vue'
import { store } from '@/store'
// store
const emit = defineEmits<{
  (e: 'upload', fl?: FileList): void
  (e: 'loadUrl', url: string, customName?: string): void
}>()

const fileUpload = ref<HTMLInputElement>()
const openUpload = () => {
  fileUpload.value?.click()
}
const onFileSelect = () => {
  if (fileUpload.value?.files) {
    emit('upload', fileUpload.value?.files)
    // resolveFile(fileUpload.value?.files)
  }
}

// 远程URL加载相关
const showUrlInput = ref(false)
const remoteUrl = ref('')
const customFileName = ref('')

const toggleUrlInput = (e: Event) => {
  e.stopPropagation()
  showUrlInput.value = !showUrlInput.value
  showShareLink.value = false
  
  if (!showUrlInput.value) {
    // 重置输入
    remoteUrl.value = ''
    customFileName.value = ''
  }
}

const loadRemoteUrl = (e: Event) => {
  e.stopPropagation()
  if (remoteUrl.value.trim()) {
    emit('loadUrl', remoteUrl.value.trim(), customFileName.value.trim() || undefined)
    remoteUrl.value = ''
    customFileName.value = ''
    showUrlInput.value = false
  }
}

// 分享链接相关
const showShareLink = ref(false)
const shareUrl = ref('')
const shareUrlInput = ref<HTMLInputElement | null>(null)
const copySuccess = ref(false)

const toggleShareLink = (e: Event) => {
  e.stopPropagation()
  if (!showShareLink.value && remoteUrl.value.trim()) {
    // 生成分享链接
    const baseUrl = window.location.origin + window.location.pathname
    let shareUrlValue = `${baseUrl}?url=${encodeURIComponent(remoteUrl.value.trim())}`
    
    // 如果有自定义文件名，添加到URL参数中
    if (customFileName.value.trim()) {
      shareUrlValue += `&name=${encodeURIComponent(customFileName.value.trim())}`
    }
    
    shareUrl.value = shareUrlValue
    showShareLink.value = true
    showUrlInput.value = true
    copySuccess.value = false
    
    // 等待DOM更新后选中分享链接
    setTimeout(() => {
      shareUrlInput.value?.select()
    }, 100)
  } else {
    showShareLink.value = !showShareLink.value
    copySuccess.value = false
  }
}

// 复制分享链接
const copyShareLink = () => {
  if (shareUrlInput.value) {
    try {
      // 现代浏览器API
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareUrl.value)
          .then(() => {
            copySuccess.value = true
            setTimeout(() => {
              copySuccess.value = false
            }, 2000)
          })
          .catch(err => {
            console.error('复制失败:', err)
            fallbackCopyMethod()
          })
      } else {
        // 回退方法
        fallbackCopyMethod()
      }
    } catch (err) {
      console.error('复制失败:', err)
      alert('复制失败，请手动复制链接')
    }
  }
}

// 回退的复制方法
const fallbackCopyMethod = () => {
  if (shareUrlInput.value) {
    shareUrlInput.value.select()
    document.execCommand('copy')
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

// 直接打开分享链接
const openShareLink = () => {
  if (shareUrl.value) {
    window.open(shareUrl.value, '_blank')
  }
}

// 获取当前页面的URL（包含参数）
const getCurrentPageUrl = () => {
  return window.location.href
}

// 复制当前页面URL
const copyCurrentUrl = () => {
  const currentUrl = getCurrentPageUrl()
  
  try {
    // 现代浏览器API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(currentUrl)
        .then(() => {
          alert('当前页面链接已复制，可直接分享')
        })
        .catch(err => {
          console.error('复制失败:', err)
          alert('复制失败，请手动复制浏览器地址栏')
        })
    } else {
      // 创建临时输入框
      const tempInput = document.createElement('input')
      tempInput.value = currentUrl
      document.body.appendChild(tempInput)
      tempInput.select()
      document.execCommand('copy')
      document.body.removeChild(tempInput)
      alert('当前页面链接已复制，可直接分享')
    }
  } catch (err) {
    console.error('复制失败:', err)
    alert('复制失败，请手动复制浏览器地址栏')
  }
}

// 检查URL是否包含url参数
const hasUrlParam = computed(() => {
  return window.location.search.includes('url=')
})

</script>
<template>
  <div class="bookshelf" @click.stop="openUpload">
    <input type="file" ref="fileUpload" style="display:none;" @change="onFileSelect">
    <div class="booklist">
      <div class="book" v-for="book in store.bookshelf" :key="book.title" @click.stop="store.read(book)" @contextmenu.prevent.stop="book.showDelete = !book.showDelete">
        <div class="book-page" v-for="i in 5" :style="{top:`-${(5-i)*2}px`,right:`-${(5-i)*2}px`}"></div>
        <div class="cover">{{ book.title }}</div>
        <div class="book-delete" @click.stop="store.removeBook(book)" v-if="book.showDelete">删除</div>
      </div>
    </div>
    <div class="file-placeholder" v-if="!showUrlInput">
      点按上传或将txt文件拖到此处
    </div>
    
    <!-- 远程URL加载区域 -->
    <div class="remote-url-container" @click.stop>
      <button class="btn url-toggle-btn" @click="toggleUrlInput">{{ showUrlInput ? '取消' : '加载远程URL' }}</button>
      
      <div class="url-input-container" v-if="showUrlInput">
        <div class="input-group">
          <input 
            type="text" 
            v-model="remoteUrl" 
            placeholder="输入远程txt文件URL" 
            class="url-input"
            @keyup.enter="loadRemoteUrl"
          />
          <input 
            type="text" 
            v-model="customFileName" 
            placeholder="自定义文件名（可选）" 
            class="url-input custom-name-input"
          />
        </div>
        <div class="button-group">
          <button class="btn" @click="loadRemoteUrl">加载</button>
          <button class="btn" @click="toggleShareLink">生成分享链接</button>
        </div>
      </div>
      
      <!-- 分享链接区域 -->
      <div class="share-link-container" v-if="showShareLink">
        <input 
          ref="shareUrlInput"
          type="text" 
          v-model="shareUrl" 
          readonly
          class="url-input"
        />
        <button class="btn" @click="copyShareLink">
          {{ copySuccess ? '已复制' : '复制链接' }}
        </button>
        <button class="btn" @click="openShareLink">打开链接</button>
      </div>
      
      <!-- 当前页面已经包含URL参数时显示分享按钮 -->
      <div class="current-url-container" v-if="hasUrlParam">
        <button class="btn share-current-btn" @click="copyCurrentUrl">复制当前页面链接分享</button>
      </div>
    </div>
  </div>
</template>
<style lang="scss">
$page-indicator: 50px;

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
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
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

* {
  box-sizing: border-box;
}

.book {
  width: 150px;
  height: 200px;
  position: relative;
  margin: 10px;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }

  &-delete {
    position: absolute;
    right: 8px;
    top: 8px;
    cursor: pointer;
    background-color: rgba(255, 0, 0, 0.7);
    color: white;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 0.8em;
  }
}

.cover {
  width: 100%;
  height: 100%;
  background-color: #cf8b5b;
  border-radius: 10px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  color: black;
  padding: 30px;
  position: absolute;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 7;
  display: -webkit-box;
}

.book-page {
  border-radius: 10px;
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: #d9d9d9;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  border-left: 2px solid #000;
}

.booklist {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  overflow-y: auto;
  max-height: calc(100% - 120px);
  padding: 20px;
  margin-bottom: 100px; /* 为底部的URL输入区域留出空间 */
}

/* 远程URL加载相关样式 */
.remote-url-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background-color: var(--color-background);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.url-toggle-btn {
  margin-bottom: 10px;
}

.url-input-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  margin-bottom: 10px;
}

.input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.button-group {
  display: flex;
  justify-content: space-between;
}

.url-input {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  margin-right: 10px;
  background-color: var(--color-background);
  color: var(--color-text);
}

.custom-name-input {
  margin-top: 5px;
}

/* 分享链接相关样式 */
.share-link-container {
  display: flex;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  margin-bottom: 10px;
}

/* 当前页面链接分享按钮 */
.current-url-container {
  margin-top: 10px;
}

.share-current-btn {
  background-color: #4caf50;
  
  &:hover {
    background-color: #45a049;
  }
}

/* 添加一些响应式样式 */
@media (max-width: 768px) {
  .booklist {
    justify-content: space-around;
    padding: 10px;
  }
  
  .book {
    width: 120px;
    height: 160px;
    margin: 8px;
    
    .cover {
      padding: 15px;
      font-size: 0.9em;
      -webkit-line-clamp: 6;
    }
  }
  
  .url-input-container,
  .share-link-container {
    flex-direction: column;
    
    .url-input {
      margin-right: 0;
      margin-bottom: 10px;
    }
    
    .btn {
      margin-bottom: 5px;
    }
  }
  
  .button-group {
    flex-direction: column;
    
    .btn {
      margin-bottom: 5px;
      width: 100%;
    }
  }
}

/* 小屏幕手机适配 */
@media (max-width: 480px) {
  .book {
    width: 100px;
    height: 140px;
    margin: 5px;
    
    .cover {
      padding: 10px;
      font-size: 0.8em;
      -webkit-line-clamp: 5;
    }
    
    &-delete {
      font-size: 0.7em;
      padding: 2px 4px;
    }
  }
  
  .file-placeholder {
    font-size: 0.9em;
    text-align: center;
    padding: 0 20px;
  }
}
</style>
