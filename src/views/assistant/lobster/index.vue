<template>
  <div class="chat-shell">
    <!-- 顶部栏 -->
    <header class="chat-topbar">
      <div class="topbar-left">
        <div class="lobster-logo">
          <span>🤖</span>
        </div>
        <div class="topbar-info">
          <span class="topbar-title">{{ agentName }}</span>
          <span class="topbar-subtitle">你的个人 AI 助手</span>
        </div>
      </div>
      <div class="topbar-right">
        <span class="conn-badge" :class="openclawReady ? 'live' : 'dead'" :title="statusDetail">
          <span class="conn-dot"></span>
          {{ openclawReady ? '已连接' : '未连接' }}
        </span>
        <button v-if="messages.length > 0" class="btn-clear" title="清空聊天记录" @click="clearChat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    </header>

    <!-- 消息区域 -->
    <main class="chat-main" ref="msgContainer" @scroll="onScroll">
      <!-- 空状态 -->
      <div v-if="messages.length === 0 && !generating" class="welcome">
        <div class="welcome-glow"></div>
        <div class="welcome-icon">🤖</div>
        <h2>你好，我是{{ agentName }}</h2>
        <p>基于 DeepSeek v4，随时回答你的问题</p>
        <div class="welcome-chips">
          <span v-for="q in suggestQuestions" :key="q" class="welcome-chip" @click="quickSend(q)">{{ q }}</span>
        </div>
      </div>

      <template v-for="(msg, idx) in messages">
        <!-- 系统通知 -->
        <div v-if="msg.role === 'system'" :key="'s'+idx" class="sys-note">
          <span class="sys-note-icon">🔔</span>
          <span class="sys-note-time" v-if="msg.time">{{ msg.time }}</span>
          <div class="sys-note-body" v-html="renderContent(msg.content)"></div>
        </div>

        <!-- 聊天消息 -->
        <div v-else :key="idx" class="chat-msg" :class="msg.role">
          <div v-if="msg.role === 'assistant'" class="msg-avatar">
            <span>🤖</span>
          </div>

          <div class="msg-card">
            <div class="msg-meta">
              <span v-if="msg.role === 'assistant'" class="msg-sender">{{ agentName }}</span>
              <span class="msg-time">{{ formatTime(msg.ts) }}</span>
            </div>
            <div class="msg-bubble">
              <div class="msg-text" v-html="renderContent(msg.content)"></div>
              <div v-if="msg.role === 'assistant' && generating && idx === messages.length - 1" class="typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <div v-if="msg.role === 'user'" class="msg-avatar user-avatar">
            <img v-if="userAvatar" :src="userAvatar" class="avatar-img" />
            <span v-else>👤</span>
          </div>
        </div>
      </template>

      <!-- 滚动到底部按钮 -->
      <button v-if="showScrollBtn" class="btn-scroll-bottom" @click="scrollToBottom(true)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </main>

    <!-- 输入区域 -->
    <footer class="chat-footer">
      <div v-if="!openclawReady" class="footer-warn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        OpenClaw 未连接，暂时无法发送消息
      </div>
      <div class="input-row">
        <textarea
          ref="inputEl"
          v-model="inputText"
          class="msg-input"
          rows="1"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          :disabled="generating || !openclawReady"
          @keydown.enter.exact.prevent="handleSend"
          @input="autoResize"
        ></textarea>
        <button
          v-if="generating"
          class="btn-stop"
          @click="handleAbort"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          <span>停止</span>
        </button>
        <button
          v-else
          class="btn-send"
          :disabled="!inputText.trim() || !openclawReady"
          @click="handleSend"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </footer>
  </div>
</template>

<script>
import { getChatHistory, sendChatMessage, abortChat, getOpenClawConfig, getCurrentAgent } from '@/api/assistant/lobster'
import { marked } from 'marked'

marked.use({ breaks: true, gfm: true })

export default {
  name: 'LobsterChat',
  data() {
    return {
      messages: [],
      inputText: '',
      generating: false,
      abortController: null,
      openclawReady: false,
      statusDetail: '',
      statusTimer: null,
      lastSeenAlertId: null,
      currentEventType: '',
      showScrollBtn: false,
      agentName: '龙虾助手',
      suggestQuestions: [
        '帮我总结今天的工作',
        '怎么写一个 Python 装饰器',
        '解释一下 HTTPS 的工作原理',
        '帮我写一段 SQL 查询'
      ]
    }
  },
  mounted() {
    this.checkStatus()
    this.statusTimer = setInterval(() => this.checkStatus(), 10000)
    this.loadHistory()
    this.fetchAgentInfo()
    this.$nextTick(() => this.scrollBottom())
  },
  beforeDestroy() {
    if (this.statusTimer) clearInterval(this.statusTimer)
  },
  computed: {
    sessionKey() {
      return 'user-' + (this.$store.state.user.id || 'anonymous')
    },
    userAvatar() {
      return this.$store.state.user.avatar || ''
    }
  },
  methods: {
    async checkStatus() {
      try {
        const res = await getOpenClawConfig()
        if (res && res.code === 200 && res.data) {
          const d = res.data
          this.openclawReady = d.rpcReady === 'true' || d.rpcReady === true
          this.statusDetail = 'deviceId=' + (d.deviceId || 'N/A') + ' connId=' + (d.connId || 'N/A')
          if (d.lastError && d.lastError !== 'N/A') {
            this.statusDetail += ' err=' + d.lastError
          }
          if (d.lastAlert && d.lastAlert !== 'N/A' && d.lastAlertId && d.lastAlertId !== this.lastSeenAlertId) {
            this.lastSeenAlertId = d.lastAlertId
            this.messages.push({
              role: 'system',
              content: d.lastAlert,
              time: d.alertTime ? new Date(d.alertTime).toLocaleTimeString() : ''
            })
            this.$nextTick(() => this.scrollBottom())
          }
        }
      } catch (e) {
        this.openclawReady = false
        this.statusDetail = '无法获取状态: ' + (e.message || '网络错误')
      }
    },

    async fetchAgentInfo() {
      try {
        const res = await getCurrentAgent()
        if (res && res.code === 200 && res.data) {
          this.agentName = res.data.displayName || res.data.agentId || '龙虾助手'
        }
      } catch (e) {
        // 获取失败保持默认名称
      }
    },

    async loadHistory() {
      try {
        const res = await getChatHistory(this.sessionKey)
        if (res && res.code === 200) {
          const data = res.data
          if (data && data.messages && data.messages.length > 0) {
            this.messages = data.messages
              .filter(m => {
                if (m.role !== 'user' && m.role !== 'assistant') return false
                if (this.isNoReply(m.content)) return false
                return this.hasDisplayableContent(m.content)
              })
              .map(m => ({
                role: m.role,
                content: m.content,
                ts: m.timestamp
              }))
          }
        }
      } catch (e) {
        console.warn('加载聊天记录失败，将使用空白会话:', e.message || e)
      }
      this.$nextTick(() => this.scrollBottom())
    },

    quickSend(question) {
      this.inputText = question
      this.handleSend()
    },

    handleSend() {
      if (!this.inputText.trim() || this.generating || !this.openclawReady) return
      const text = this.inputText.trim()
      this.inputText = ''
      this.autoResize()
      this.messages.push({ role: 'user', content: text, ts: Date.now() })
      this.messages.push({ role: 'assistant', content: '', ts: Date.now() })
      this.$nextTick(() => this.scrollBottom())
      this.generating = true
      this.startStream(text)
    },

    autoResize() {
      const el = this.$refs.inputEl
      if (el) {
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 150) + 'px'
      }
    },

    async startStream(message) {
      this.abortController = new AbortController()
      try {
        const response = await sendChatMessage(this.sessionKey, message, this.abortController.signal)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('event:')) {
              this.currentEventType = line.substring(6).trim()
            } else if (line.startsWith('data:') && this.currentEventType === 'delta') {
              const deltaText = line.substring(5).trim()
              const idx = this.messages.length - 1
              const last = this.messages[idx]
              if (last && last.role === 'assistant') {
                this.$set(this.messages, idx, { ...last, content: last.content + deltaText })
              }
              this.$nextTick(() => this.scrollBottom())
            } else if (line.startsWith('data:') && this.currentEventType === 'final') {
              const last = this.messages[this.messages.length - 1]
              if (last && last.role === 'assistant') {
                if (this.isNoReply(last.content)) {
                  this.messages.pop()
                } else {
                  last.ts = Date.now()
                }
              }
              this.generating = false
              this.fetchAgentInfo()
              this.$nextTick(() => this.scrollBottom())
            } else if (line.startsWith('data:') && this.currentEventType === 'error') {
              const dataText = line.substring(5).trim()
              const idx = this.messages.length - 1
              const last = this.messages[idx]
              if (last && last.role === 'assistant') {
                this.$set(this.messages, idx, { ...last, content: last.content || '请求失败: ' + dataText })
              }
              this.generating = false
              this.fetchAgentInfo()
            }
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          const idx = this.messages.length - 1
          const last = this.messages[idx]
          if (last && last.role === 'assistant' && !last.content) {
            this.$set(this.messages, idx, { ...last, content: '已停止生成' })
          }
          this.fetchAgentInfo()
        } else {
          console.error('Stream error', e)
          this.fetchAgentInfo()
        }
        this.generating = false
      }
    },

    async handleAbort() {
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
      try { await abortChat(this.sessionKey) } catch (e) { /* ignore */ }
      this.generating = false
    },

    clearChat() {
      this.messages = []
    },

    formatTime(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const h = String(d.getHours()).padStart(2, '0')
      const m = String(d.getMinutes()).padStart(2, '0')
      return h + ':' + m
    },

    onScroll() {
      const el = this.$refs.msgContainer
      if (!el) return
      this.showScrollBtn = el.scrollHeight - el.scrollTop - el.clientHeight > 200
    },

    scrollToBottom(smooth) {
      const el = this.$refs.msgContainer
      if (!el) return
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    },

    hasDisplayableContent(content) {
      if (!content) return false
      if (typeof content === 'string') return content.trim().length > 0
      if (Array.isArray(content)) {
        return content.some(c => c.type === 'text' && c.text && c.text.trim().length > 0)
      }
      return false
    },

    isNoReply(content) {
      if (!content) return false
      let text = ''
      if (typeof content === 'string') {
        text = content
      } else if (Array.isArray(content)) {
        text = content.map(c => c.type === 'text' ? c.text : '').join('')
      }
      return text.trim() === 'NO_REPLY'
    },

    renderContent(content) {
      if (!content) return ''
      let text = ''
      if (typeof content === 'string') {
        text = content
      } else if (Array.isArray(content)) {
        text = content.map(c => {
          if (c.type === 'text') return c.text
          if (c.type === 'tool_use') return ''
          return ''
        }).join('\n')
      }
      if (text.trim() === 'NO_REPLY') return ''
      return marked.parse(text)
    },

    scrollBottom() {
      this.scrollToBottom(false)
    }
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   龙虾助手 — 聊天界面样式
   ═══════════════════════════════════════════════ */

.chat-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0 -20px -20px -20px;
  background: #faf8f6;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* ── 滚动条 ── */
.chat-main::-webkit-scrollbar { width: 5px; }
.chat-main::-webkit-scrollbar-track { background: transparent; }
.chat-main::-webkit-scrollbar-thumb { background: #e0d6cc; border-radius: 10px; }
.chat-main::-webkit-scrollbar-thumb:hover { background: #c8bdb2; }

/* ── 顶部栏 ── */
.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 12px 24px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
  z-index: 10;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lobster-logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.25);
  transition: transform 0.2s;
}
.lobster-logo:hover {
  transform: scale(1.05);
}
.topbar-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.topbar-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e1b18;
  letter-spacing: -0.3px;
}
.topbar-subtitle {
  font-size: 11px;
  color: #a39b92;
  font-weight: 500;
}

/* 连接状态 */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.conn-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.3s;
}
.conn-badge.live {
  background: #ebf7ef;
  color: #3b8257;
}
.conn-badge.dead {
  background: #fdf0ed;
  color: #c7584c;
}
.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.conn-badge.live .conn-dot { background: #40c463; box-shadow: 0 0 6px rgba(64,196,99,0.5); }
.conn-badge.dead .conn-dot { background: #e87b6e; }

.btn-clear {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #a39b92;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-clear:hover {
  background: #f5f0eb;
  color: #7a6a5c;
  border-color: #e8ddd0;
}

/* ── 消息区域 ── */
.chat-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 8px 24px;
  scroll-behavior: smooth;
  position: relative;
}

/* ── 滚动到底部按钮 ── */
.btn-scroll-bottom {
  position: sticky;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #e8ddd0;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7a6a5c;
  transition: all 0.2s;
  z-index: 5;
}
.btn-scroll-bottom:hover {
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transform: translateX(-50%) translateY(-2px);
}

/* 欢迎页 */
.welcome {
  text-align: center;
  padding: 48px 20px 20px;
  position: relative;
}
.welcome-glow {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.welcome-icon {
  font-size: 64px;
  margin-bottom: 12px;
  animation: floatUp 3s ease-in-out infinite;
  position: relative;
}
@keyframes floatUp {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(-2deg); }
}
.welcome h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1e1b18;
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}
.welcome p {
  color: #a39b92;
  font-size: 14px;
  margin: 0 0 32px;
}
.welcome-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 520px;
  margin: 0 auto;
}
.welcome-chip {
  padding: 9px 18px;
  background: #fff;
  border: 1px solid #ebe3d9;
  border-radius: 20px;
  font-size: 13px;
  color: #6b5e4f;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.welcome-chip:hover {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(240, 101, 59, 0.25);
  transform: translateY(-2px);
}

/* 消息行 */
.chat-msg {
  display: flex;
  align-items: flex-end;
  margin-bottom: 20px;
  gap: 8px;
  animation: msgIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.chat-msg.user { flex-direction: row-reverse; }
.chat-msg.assistant { flex-direction: row; }

/* 头像 */
.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
  align-self: flex-end;
}
.msg-avatar.user-avatar {
  background: linear-gradient(135deg, #5b7edb, #4468c2);
  box-shadow: 0 2px 8px rgba(91, 126, 219, 0.2);
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
}

/* 消息卡片 */
.msg-card {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.chat-msg.user .msg-card { align-items: flex-end; }

.msg-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
}
.msg-sender {
  font-size: 11px;
  color: #a39b92;
  font-weight: 600;
}
.msg-time {
  font-size: 10px;
  color: #c8bdb2;
}
.chat-msg.user .msg-meta { flex-direction: row-reverse; }

/* 气泡 */
.msg-bubble {
  padding: 10px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
  transition: box-shadow 0.2s;
  position: relative;
}
.chat-msg.assistant .msg-bubble {
  background: #fff;
  color: #332d26;
  border-bottom-left-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.chat-msg.user .msg-bubble {
  background: linear-gradient(135deg, #5b7edb 0%, #4468c2 100%);
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: 0 2px 8px rgba(91, 126, 219, 0.2);
}

/* ── Markdown ── */
.msg-text ::v-deep p { margin: 4px 0; }
.msg-text ::v-deep p:first-child { margin-top: 0; }
.msg-text ::v-deep p:last-child { margin-bottom: 0; }
.msg-text ::v-deep pre {
  background: #1b1e24;
  color: #e1e4e8;
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
  font-size: 12.5px;
  line-height: 1.6;
  margin: 10px 0;
  position: relative;
}
.msg-text ::v-deep code {
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
  font-size: 0.88em;
}
.msg-text ::v-deep :not(pre) > code {
  background: #f3ede6;
  color: #5b5fcf;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
.chat-msg.user .msg-text ::v-deep :not(pre) > code {
  background: rgba(255,255,255,0.18);
  color: #fff;
}
.chat-msg.user .msg-text ::v-deep pre {
  background: rgba(0,0,0,0.2);
  color: rgba(255,255,255,0.9);
}
.msg-text ::v-deep blockquote {
  border-left: 3px solid #6366f1;
  margin: 10px 0;
  padding: 4px 14px;
  color: #6b5e4f;
  background: #fdf8f5;
  border-radius: 0 8px 8px 0;
}
.msg-text ::v-deep table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  font-size: 13px;
}
.msg-text ::v-deep th, .msg-text ::v-deep td {
  border: 1px solid #e8ddd0;
  padding: 7px 12px;
  text-align: left;
}
.msg-text ::v-deep th {
  background: #faf6f1;
  font-weight: 600;
  color: #4d3f33;
}
.msg-text ::v-deep tr:nth-child(even) td {
  background: #fdfaf7;
}
.msg-text ::v-deep ul, .msg-text ::v-deep ol { padding-left: 20px; margin: 6px 0; }
.msg-text ::v-deep li { margin: 3px 0; }
.msg-text ::v-deep h1, .msg-text ::v-deep h2, .msg-text ::v-deep h3 {
  margin: 12px 0 6px;
  font-weight: 700;
  color: #1e1b18;
}
.msg-text ::v-deep h1 { font-size: 1.25em; }
.msg-text ::v-deep h2 { font-size: 1.12em; }
.msg-text ::v-deep h3 { font-size: 1.04em; }
.msg-text ::v-deep hr { border: none; border-top: 1px solid #ede4db; margin: 14px 0; }
.msg-text ::v-deep a {
  color: #6366f1;
  text-decoration: none;
  border-bottom: 1px solid rgba(99,102,241,0.2);
  transition: border-color 0.2s;
}
.msg-text ::v-deep a:hover {
  border-color: #6366f1;
}
.msg-text ::v-deep img {
  max-width: 100%;
  border-radius: 8px;
  margin: 6px 0;
}

/* 打字动画 */
.typing {
  display: inline-flex;
  gap: 3px;
  padding: 2px 0 0;
}
.typing span {
  width: 5px;
  height: 5px;
  background: #d4c8ba;
  border-radius: 50%;
  animation: dotPop 1.2s infinite ease-in-out;
}
.typing span:nth-child(2) { animation-delay: 0.18s; }
.typing span:nth-child(3) { animation-delay: 0.36s; }
@keyframes dotPop {
  0%, 60%, 100% { transform: scale(0.6); opacity: 0.3; }
  30% { transform: scale(1); opacity: 1; }
}

/* ── 输入区域 ── */
.chat-footer {
  flex-shrink: 0;
  padding: 10px 20px 16px;
  background: linear-gradient(180deg, transparent 0%, rgba(250,248,246,0.95) 20%);
}
.footer-warn {
  color: #d4863b;
  font-size: 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding-left: 4px;
}
.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #e8ddd0;
  border-radius: 18px;
  padding: 6px 6px 6px 16px;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.input-row:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(240, 101, 59, 0.06);
}
.msg-input {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: #332d26;
  background: transparent;
  padding: 7px 0;
  font-family: inherit;
  min-height: 24px;
  max-height: 150px;
}
.msg-input::placeholder { color: #cfc4b8; }
.msg-input:disabled { opacity: 0.5; }

.btn-send, .btn-stop {
  flex-shrink: 0;
  border: none;
  border-radius: 12px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
  font-family: inherit;
}
.btn-send {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  box-shadow: 0 2px 8px rgba(240, 101, 59, 0.25);
}
.btn-send:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.04);
  box-shadow: 0 4px 16px rgba(240, 101, 59, 0.35);
}
.btn-send:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.btn-send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.btn-stop {
  width: auto;
  padding: 0 12px;
  background: #f0effe;
  color: #5b5fcf;
  gap: 4px;
  font-size: 12px;
}
.btn-stop:hover {
  background: #e3e0fc;
  transform: translateY(-1px);
}

/* ── 系统通知 ── */
.sys-note {
  text-align: center;
  padding: 8px 20px;
  margin: 4px 0 16px;
  background: #fefaf4;
  border: 1px solid #f0e3c8;
  border-radius: 12px;
  font-size: 13px;
  color: #8c6e2e;
  animation: msgIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.sys-note-icon { margin-right: 4px; }
.sys-note-time { font-size: 11px; color: #c8a86a; margin-left: 6px; }
.sys-note-body { margin-top: 4px; text-align: left; line-height: 1.5; }
</style>
