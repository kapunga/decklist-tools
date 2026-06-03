<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useData } from 'vitepress'

interface ThemeDef {
  id: string
  name: string
  dark: boolean
}

// Mirrors the app's six themes (packages/electron-app/src/lib/themes.ts),
// using the same set-evocative display names.
const THEMES: ThemeDef[] = [
  { id: 'library', name: 'Strixhaven', dark: false },
  { id: 'fantasy', name: 'Dominaria', dark: false },
  { id: 'steampunk', name: 'Kaladesh', dark: false },
  { id: 'ukiyoe', name: 'Kamigawa', dark: false },
  { id: 'cyberpunk', name: 'Neo Kamigawa', dark: true },
  { id: 'gothic', name: 'Innistrad', dark: true },
]

const STORAGE_KEY = 'docsite-theme'

const { isDark } = useData()
const current = ref('library')
const open = ref(false)

const currentName = computed(
  () => THEMES.find((t) => t.id === current.value)?.name ?? 'Theme',
)

function applyClass(id: string) {
  const html = document.documentElement
  THEMES.forEach((t) => html.classList.remove(`dt-${t.id}`))
  html.classList.add(`dt-${id}`)
}

function select(theme: ThemeDef) {
  current.value = theme.id
  applyClass(theme.id)
  isDark.value = theme.dark
  localStorage.setItem(STORAGE_KEY, theme.id)
  open.value = false
}

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const initial =
    stored && THEMES.some((t) => t.id === stored)
      ? stored
      : isDark.value
        ? 'cyberpunk'
        : 'library'

  current.value = initial
  applyClass(initial)
  const def = THEMES.find((t) => t.id === initial)!
  if (def.dark !== isDark.value) isDark.value = def.dark

  // If the user flips VitePress's own light/dark toggle, snap to that mode's
  // default theme so palette and appearance never disagree.
  watch(isDark, (dark) => {
    const active = THEMES.find((t) => t.id === current.value)
    if (active && active.dark !== dark) {
      const fallback = THEMES.find((t) => t.dark === dark)!
      current.value = fallback.id
      applyClass(fallback.id)
    }
  })
})
</script>

<template>
  <div class="theme-picker" :class="{ open }">
    <button
      class="theme-picker-button"
      type="button"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <span class="theme-picker-label">Theme</span>
      <span class="theme-picker-current">{{ currentName }}</span>
    </button>

    <div v-if="open" class="theme-picker-backdrop" @click="open = false" />

    <ul v-if="open" class="theme-picker-menu" role="listbox">
      <li
        v-for="theme in THEMES"
        :key="theme.id"
        role="option"
        :aria-selected="theme.id === current"
        class="theme-picker-item"
        :class="{ active: theme.id === current }"
        @click="select(theme)"
      >
        <span class="theme-picker-item-name">{{ theme.name }}</span>
        <span class="theme-picker-item-mode">{{ theme.dark ? 'dark' : 'light' }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.theme-picker {
  position: relative;
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.theme-picker-button {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.2s;
}

.theme-picker-button:hover {
  border-color: var(--vp-c-brand-1);
}

.theme-picker-label {
  font-family: var(--vp-font-family-base);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.theme-picker-current {
  font-family: var(--docsite-font-tagline);
  font-style: italic;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.theme-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.theme-picker-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  min-width: 180px;
  margin: 0;
  padding: 5px;
  list-style: none;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0;
  box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.3);
}

.theme-picker-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 10px;
  border-radius: 0;
  cursor: pointer;
}

.theme-picker-item:hover {
  background: var(--vp-c-bg-soft);
}

.theme-picker-item.active {
  background: var(--vp-c-brand-soft);
}

.theme-picker-item-name {
  font-family: var(--docsite-font-display);
  font-style: italic;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.theme-picker-item-mode {
  font-family: var(--vp-font-family-base);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

/* On narrow screens VitePress hides nav content; keep the picker compact. */
@media (max-width: 768px) {
  .theme-picker-label {
    display: none;
  }
}
</style>
