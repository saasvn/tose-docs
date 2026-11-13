<script setup>
// "Copy as Markdown" for the current page. The build publishes each page's Markdown source next to
// its HTML (see buildEnd in config.js), so the copy keeps code blocks and links exactly as written.
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'

const { page, lang } = useData()
const vi = computed(() => lang.value === 'vi')
const mdUrl = computed(() => withBase('/' + page.value.relativePath))
const state = ref('idle')

async function copy() {
  try {
    const res = await fetch(mdUrl.value)
    if (!res.ok) throw new Error(String(res.status))
    await navigator.clipboard.writeText(await res.text())
    state.value = 'copied'
  } catch {
    state.value = 'failed'
  }
  setTimeout(() => (state.value = 'idle'), 2000)
}

const label = computed(() => {
  if (state.value === 'copied') return vi.value ? 'Đã sao chép' : 'Copied'
  if (state.value === 'failed') return vi.value ? 'Không sao chép được' : 'Copy failed'
  return vi.value ? 'Sao chép dạng Markdown' : 'Copy as Markdown'
})
</script>

<template>
  <div class="copy-page-markdown">
    <button type="button" @click="copy" aria-live="polite">{{ label }}</button>
    <a :href="mdUrl" target="_blank" rel="noopener">{{ vi ? 'Xem Markdown' : 'View Markdown' }}</a>
  </div>
</template>

<style scoped>
.copy-page-markdown {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-bottom: 16px;
  font-size: 13px;
}
.copy-page-markdown button,
.copy-page-markdown a {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 4px 10px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
}
.copy-page-markdown button:hover,
.copy-page-markdown a:hover {
  border-color: var(--vp-c-brand-1);
}
</style>
