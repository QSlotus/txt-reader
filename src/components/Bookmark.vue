<script setup lang="ts">
import { store, currentBookMarks } from '@/store'

const go = (bookmark: WatchHistory) => {
  store.page = bookmark.page
  store.currentChapterIndex = bookmark.chapterIndex
}
</script>
<template>
  <div class="bookmarks" ref="bookmarksElement" :class="{ show: store.showBookmarks }">
    <div class="bookmarks-content">
      <div class="bookmarks-list">
        <h2>书签</h2>
        <div v-for="(bookmark) in currentBookMarks" class="bookmarks-item" @click.stop="go(bookmark)">
          {{ store.chapters[bookmark.chapterIndex] }} - 第{{ bookmark.page + 1 }}页
          <a @click.stop="store.removeBookmark(bookmark)">&times;</a>
        </div>
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

* {
  box-sizing: border-box;
}

.bookmarks {
  top: 0;
  position: fixed;
  right: 0;
  width: 300px;
  transform: translateX(100%);
  transition: .3s;
  z-index: 1;
  background-color: var(--color-background-soft);
  height: 100vh;
  box-shadow: 0 5px 5px rgba(0, 0, 0, .3);

  &.show {
    transform: translateX(0);
  }

  h2 {
    padding: 10px 20px;

  }

  &-item {
    display: flex;
    //align-items: center;
    //justify-content: center;
    width: 100%;
    padding: 10px 20px;
    line-height: 18px;
    border-top: 1px solid #EBEBEB;
    cursor: pointer;
  }

  &-list {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
}
</style>
