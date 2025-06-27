<script lang="ts" setup>
import { store } from '@/store.js'
import { onMounted, watch, computed } from 'vue'

let hiddenTimer: number | null = null
watch(() => store.showMenu, (newVal) => {
  if (newVal) {
    hiddenTimer && clearTimeout(hiddenTimer)
    hiddenTimer = setTimeout(() => {
      store.showMenu = false
    }, 3000)
  }
})

// 检查URL是否包含url参数
const hasUrlParam = computed(() => {
  return window.location.search.includes('url=')
})

// 复制当前页面URL
const copyCurrentUrl = () => {
  const currentUrl = window.location.href
  
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

</script>
<template>
  <div :class="{ show: store.showMenu }" class="toolbar">
    <button class="btn" @click.stop="store.switchShowChapters()">打开目录(c)</button>
    <button class="btn" @click.stop="store.switchColumnMode()">{{ store.singleColumnMode ? '双列模式' : '单列模式' }}(q)</button>
    <button class="btn" @click.stop="store.switchShowBookmarks()">打开书签(z)</button>
    <button class="btn" @click.stop="store.addBookmark()">添加书签(a)</button>
    <button class="btn" @click.stop="store.backToBookshelf()">回到书架(b)</button>
    <button class="btn" @click.stop="store.switchSettings()">打开设置(s)</button>
    <button v-if="hasUrlParam" class="btn share-btn" @click.stop="copyCurrentUrl()">分享链接</button>
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

* {
  box-sizing: border-box;
}

.toolbar {
  position: fixed;
  bottom: $page-indicator;
  left: 0;
  text-align: center;
  transition: .2s;
  transform: translateY(calc(100% + $page-indicator));
  display: flex;
  justify-content: space-between;
  padding: 20px;
  background-color: var(--color-background-soft);
  width: 100%;

  &.show {
    transform: translateX(0%);
    box-shadow: 0 -5px 5px rgba(0, 0, 0, .3);
  }

  .btn {
    margin: 0 4px;
    flex: 1;
    height: 100%;
  }
  
  .share-btn {
    background-color: #4caf50;
    
    &:hover {
      background-color: #45a049;
    }
  }
}

</style>
