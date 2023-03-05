<script lang="ts" setup>
import { store } from '@/store.js'
</script>
<template>
  <div class="toolbar" :class="{ show: store.showMenu }">
    <button class="btn" @click.stop="store.switchShowChapters()">打开目录(c)</button>
    <button class="btn" @click.stop="store.switchColumnMode()">{{ store.singleColumnMode ? '双列模式' : '单列模式' }}(q)</button>
    <button class="btn" @click.stop="store.switchShowBookmarks()">打开书签(z)</button>
    <button class="btn" @click.stop="store.addBookmark()">添加书签(a)</button>
    <button class="btn" @click.stop="store.backToBookshelf()">回到书架(b)</button>
    <button class="btn" @click.stop="store.switchSettings()">打开设置(s)</button>
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
    box-shadow: 0 -5px 5px rgba(0,0,0,.3);
  }

  .btn {
    margin: 0 4px;
    flex: 1;
    height: 100%;
  }
}

</style>
