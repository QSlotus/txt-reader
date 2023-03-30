<script setup lang="ts">

import { ref } from 'vue'
import { store } from '@/store'
// store
const emit = defineEmits<{
  (e: 'upload', fl?: FileList): void
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
    <div class="file-placeholder">
      点按上传或将txt文件拖到此处
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

* {
  box-sizing: border-box;
}

.book {
  width: 150px;
  height: 200px;
  position: relative;
  margin-right: 20px;

  &-delete {
    position: absolute;
    right: 8px;
    top: 8px;
    cursor: pointer;
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
}

</style>
