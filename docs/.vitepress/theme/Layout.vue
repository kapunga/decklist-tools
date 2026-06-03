<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ThemePicker from '../components/ThemePicker.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <ThemePicker />
    </template>
  </Layout>
</template>
