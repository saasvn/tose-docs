<script setup>
// "Copy as Markdown" and "Send to" an AI assistant for the current page. The build publishes each page's Markdown source next to
// its HTML (see buildEnd in config.js), so the copy keeps code blocks and links exactly as written.
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'

const { page, lang } = useData()
const vi = computed(() => lang.value === 'vi')
const mdUrl = computed(() => withBase('/' + page.value.relativePath))
const state = ref('idle')

// "Send to ChatGPT / Claude / Gemini": open the assistant with a prompt that points at this page's Markdown.
// ChatGPT and Claude take the prompt in ?q=; Gemini has no such parameter, so the prompt is copied first.
const absoluteMdUrl = computed(() => 'https://docs.tose.sh/' + page.value.relativePath)
const prompt = computed(() =>
  vi.value
    ? `Đọc tài liệu TOSE ở ${absoluteMdUrl.value} và giúp tôi trả lời câu hỏi về nó.`
    : `Read the TOSE documentation at ${absoluteMdUrl.value} and help me with questions about it.`
)
const chatgptUrl = computed(() => 'https://chatgpt.com/?q=' + encodeURIComponent(prompt.value))
const claudeUrl = computed(() => 'https://claude.ai/new?q=' + encodeURIComponent(prompt.value))
const geminiState = ref('idle')

async function openGemini() {
  const win = window.open('https://gemini.google.com/app', '_blank', 'noopener')
  try {
    await navigator.clipboard.writeText(prompt.value)
    geminiState.value = 'copied'
  } catch {
    geminiState.value = 'failed'
  }
  if (!win) geminiState.value = 'blocked'
  setTimeout(() => (geminiState.value = 'idle'), 3000)
}

const geminiLabel = computed(() => {
  if (geminiState.value === 'copied') return vi.value ? 'Đã chép lời nhắc, dán vào Gemini' : 'Prompt copied, paste it in Gemini'
  if (geminiState.value === 'failed') return vi.value ? 'Không chép được lời nhắc' : 'Could not copy the prompt'
  if (geminiState.value === 'blocked') return vi.value ? 'Trình duyệt chặn cửa sổ mới' : 'Pop-up blocked'
  return vi.value ? 'Gửi sang Gemini' : 'Send to Gemini'
})

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
    <a :href="chatgptUrl" target="_blank" rel="noopener">{{ vi ? 'Gửi sang ChatGPT' : 'Send to ChatGPT' }}</a>
    <a :href="claudeUrl" target="_blank" rel="noopener">{{ vi ? 'Gửi sang Claude' : 'Send to Claude' }}</a>
    <button type="button" @click="openGemini" aria-live="polite">{{ geminiLabel }}</button>
  </div>
</template>

<style scoped>
.copy-page-markdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
