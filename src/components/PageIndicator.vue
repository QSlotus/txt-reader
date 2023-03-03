<script setup lang="ts">
import { store, currentChapterTitle } from '@/store'

const onPageInput = (e: Event) => {
  let targetPage = Number((e.target as HTMLInputElement).value) - 1
  if (Number.isNaN(targetPage)) {
    targetPage = store.page
  }
  // console.log(e)
  if (targetPage > store.maxPage) {
    targetPage = store.maxPage
  }

  store.page = targetPage
}
</script>
<template>
  <div @click.stop class="page-indicator" v-if="store.txtContent.length>0">
    <div>
      <a @click="store.switchShowChapters()">{{ currentChapterTitle }}({{ store.currentChapterIndex + 1 }}/{{ store.chapters.length + 1 }})</a>
    </div>
    <div><input type="text" :value="store.page + 1" @input="onPageInput" class="input">/{{ store.maxPage + 1 }}</div>
  </div>
</template>
<style lang="scss">
$page-indicator: 50px;
.input {
  width: 20px;
  background: none;
  border: none;
  color: var(--color-text);
  min-width: 0;
  text-align: right;
}

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

.page-indicator {
  border-top: 1px solid var(--color-border);
  height: $page-indicator;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  display: flex;
  flex-direction: column;

}

</style>
