<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style lang="scss">

.btn {
  background: hsla(160, 100%, 37%, 1);
  border: none;
  padding: 10px 15px;
  color: #fff;
  transition: .3s;
  cursor: pointer;

  &:hover, &:focus {
    background: hsl(160, 80%, 48%);
    //outline: 1px solid #181818;
  }
  &.small{
    padding: 5px 10px;
    font-size: 12px;
  }
}

</style>
