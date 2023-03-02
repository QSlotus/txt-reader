<script setup lang="ts">
import { store } from '@/store'

const emit = defineEmits<{
  (e: 'chapter-change', index: number): void,
}>()
</script>
<template>
  <div class="chapters" ref="chaptersElement" :class="{ show: store.showChapters }">
    <div class="chapters-content">
      <div class="chapters-list">
        <h2>目录</h2>
        <div v-for="(chapter,index) in store.chapters" :class="{ active: index === store.currentChapterIndex }" class="chapters-item" @click.stop="emit('chapter-change',index)">
          {{ chapter }}
        </div>
      </div>
      <button class="chapters-button" @click.stop="store.switchShowChapters()">
        <span style="writing-mode: tb-rl;line-height: 18px;">{{ store.showChapters ? '隐 藏' : '目 录' }}</span>
      </button>
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
  box-shadow: 0 5px 5px rgba(0, 0, 0, .3);

  &.show {
    transform: translateX(0%);
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
    border-top: 1px solid #EBEBEB;
    cursor: pointer;

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

</style>
