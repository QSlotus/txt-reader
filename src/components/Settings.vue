<script lang="ts" setup>
import { ref, watch } from 'vue'
import { store } from '@/store'

const fields = ref([
  { field: 'fontSize', label: '字体大小', type: 'number' },
  { field: 'lineHeight', label: '行高', type: 'number' },
  { field: 'theme', label: '主题', type: 'theme' }
])
const themes = ref([
  { value: 'default', label: '默认(跟随系统)' },
  { value: 'theme-dark', label: '暗黑' },
  { value: 'theme-light', label: '明亮' },
  { value: 'theme-book', label: '书本' },
  { value: 'theme-paper', label: '纸张' }
])
const form = ref<{ [key: string]: any }>(Object.assign({}, store.settings))
watch(() => store.settings.theme, function () {
  for (const theme of themes.value) {
    document.documentElement.classList.remove(theme.value)
  }
  document.documentElement.classList.add(store.settings.theme)
}, { immediate: true })

function save() {
  Object.keys(form.value).forEach(value => {
    console.log(value,form.value[value])
    store.settings[value] = form.value[value]
  })
  // Object.assign(store.settings, form)
}
</script>
<template>
  <div class="settings" @click.stop :class="{show:store.showSettings}">
    <div class="form-item" v-for="field in fields" :key="field.field">
      <label :for="`form-item-${field.field}`" class="form-label">{{ field.label }}</label>
      <template v-if="field.type==='text'">
        <input :id="`form-item-${field.field}`" type="text" v-model="form[field.field]" @keydown.stop class="form-input">
      </template>
      <template v-if="field.type==='number'">
        <input :id="`form-item-${field.field}`" type="number" v-model="form[field.field]" @keydown.stop class="form-input">
      </template>
      <template v-if="field.type==='theme'">
        <select :id="`form-item-${field.field}`" v-model="form[field.field]" @keydown.stop class="form-input">
          <option v-for="theme in themes" :value="theme.value">{{ theme.label }}</option>
        </select>
      </template>
    </div>
    <div class="form-item">
      <button class="btn" @click="save">保存</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings {
  padding: 20px;
  position: fixed;
  top: 0;
  max-width: 500px;
  width: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-100%);
  background-color: var(--color-background-mute);
  transition: .3s;

  &.show {
    transform: translateX(-50%) translateY(0);
    box-shadow: 0 5px 5px rgba(0, 0, 0, .3);
  }

  //right: 0;
}

.form-item {
  display: flex;
  padding: 10px 20px;
}

.form-label {
  width: 120px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
}
</style>
