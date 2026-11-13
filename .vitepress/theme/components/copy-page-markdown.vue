<script setup>
// Page actions: one "Copy page" button plus a menu to view the Markdown or open the page in an AI assistant.
// The build publishes each page's Markdown source next to its HTML (see buildEnd in config.js), so the copy keeps
// code blocks and links exactly as written.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData, withBase } from 'vitepress'

const { page, lang } = useData()
const vi = computed(() => lang.value === 'vi')
const t = (en, viText) => (vi.value ? viText : en)
const mdUrl = computed(() => withBase('/' + page.value.relativePath))

// ChatGPT and Claude take the prompt in ?q=; Gemini has no such parameter, so its prompt is copied first.
const absoluteMdUrl = computed(() => 'https://docs.tose.sh/' + page.value.relativePath)
const prompt = computed(() =>
  t(
    `Read the TOSE documentation at ${absoluteMdUrl.value} and help me with questions about it.`,
    `Đọc tài liệu TOSE ở ${absoluteMdUrl.value} và giúp tôi trả lời câu hỏi về nó.`
  )
)
const chatgptUrl = computed(() => 'https://chatgpt.com/?q=' + encodeURIComponent(prompt.value))
const claudeUrl = computed(() => 'https://claude.ai/new?q=' + encodeURIComponent(prompt.value))

const open = ref(false)
const root = ref(null)
const status = ref('') // short feedback shown on the main button
let timer

function flash(text) {
  status.value = text
  clearTimeout(timer)
  timer = setTimeout(() => (status.value = ''), 2500)
}

async function copyPage() {
  open.value = false
  try {
    const res = await fetch(mdUrl.value)
    if (!res.ok) throw new Error(String(res.status))
    await navigator.clipboard.writeText(await res.text())
    flash(t('Copied', 'Đã sao chép'))
  } catch {
    flash(t('Copy failed', 'Không sao chép được'))
  }
}

async function openGemini() {
  open.value = false
  const win = window.open('https://gemini.google.com/app', '_blank', 'noopener')
  try {
    await navigator.clipboard.writeText(prompt.value)
    flash(win ? t('Prompt copied, paste it in Gemini', 'Đã chép lời nhắc, dán vào Gemini') : t('Pop-up blocked', 'Trình duyệt chặn cửa sổ mới'))
  } catch {
    flash(t('Could not copy the prompt', 'Không chép được lời nhắc'))
  }
}

function onDocClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
  clearTimeout(timer)
})
</script>

<template>
  <div ref="root" class="page-actions">
    <div class="split">
      <button type="button" class="main" @click="copyPage" aria-live="polite">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
        <span>{{ status || t('Copy page', 'Sao chép trang') }}</span>
      </button>
      <button
        type="button"
        class="toggle"
        :aria-expanded="open"
        aria-haspopup="menu"
        :aria-label="t('More page actions', 'Thêm thao tác')"
        @click="open = !open"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ flip: open }"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>

    <div v-if="open" class="menu" role="menu">
      <button type="button" role="menuitem" @click="copyPage">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
        <span><b>{{ t('Copy page', 'Sao chép trang') }}</b><small>{{ t('Markdown for LLMs', 'Markdown cho LLM') }}</small></span>
      </button>
      <a role="menuitem" :href="mdUrl" target="_blank" rel="noopener" @click="open = false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
        <span><b>{{ t('View as Markdown', 'Xem dạng Markdown') }}</b><small>{{ t('Open the plain-text source', 'Mở bản văn bản thuần') }}</small></span>
      </a>
      <div class="sep" role="separator"></div>
      <a role="menuitem" :href="chatgptUrl" target="_blank" rel="noopener" @click="open = false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
        <span><b>{{ t('Open in ChatGPT', 'Mở trong ChatGPT') }}</b><small>{{ t('Ask questions about this page', 'Hỏi về trang này') }}</small></span>
        <svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </a>
      <a role="menuitem" :href="claudeUrl" target="_blank" rel="noopener" @click="open = false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /></svg>
        <span><b>{{ t('Open in Claude', 'Mở trong Claude') }}</b><small>{{ t('Ask questions about this page', 'Hỏi về trang này') }}</small></span>
        <svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </a>
      <button type="button" role="menuitem" @click="openGemini">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.6 4.8 4.2 8.4 9 9-4.8.6-8.4 4.2-9 9-.6-4.8-4.2-8.4-9-9 4.8-.6 8.4-4.2 9-9z" /></svg>
        <span><b>{{ t('Open in Gemini', 'Mở trong Gemini') }}</b><small>{{ t('Copies the prompt first', 'Chép sẵn lời nhắc để dán') }}</small></span>
        <svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.page-actions {
  position: relative;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
  font-size: 13px;
  z-index: 20;
}
svg {
  width: 15px;
  height: 15px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.split {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  overflow: hidden;
  transition: border-color 0.2s;
}
.split:hover {
  border-color: var(--vp-c-gray-1);
}
.split button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  color: var(--vp-c-text-2);
  font-weight: 500;
  transition: color 0.2s, background-color 0.2s;
}
.split button:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}
.main {
  padding: 0 10px;
}
.toggle {
  padding: 0 7px;
  border-left: 1px solid var(--vp-c-divider);
}
.toggle svg {
  transition: transform 0.2s;
}
.toggle svg.flip {
  transform: rotate(180deg);
}
.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: min(280px, calc(100vw - 32px));
  padding: 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
}
.menu a,
.menu button {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--vp-c-text-1);
  text-align: left;
  text-decoration: none;
  transition: background-color 0.15s;
}
.menu a:hover,
.menu button:hover,
.menu a:focus-visible,
.menu button:focus-visible {
  background: var(--vp-c-default-soft);
}
.menu svg {
  margin-top: 2px;
  color: var(--vp-c-text-2);
}
.menu span {
  display: flex;
  flex: 1;
  flex-direction: column;
  line-height: 1.35;
}
.menu b {
  font-weight: 500;
}
.menu small {
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.menu .ext {
  width: 13px;
  height: 13px;
  color: var(--vp-c-text-3);
}
.sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--vp-c-divider);
}
</style>
