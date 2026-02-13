// zerox.technology — Admin Panel JS

const API_BASE = '/admin/api';

// === Auth ===

function getToken() {
  return localStorage.getItem('admin_token');
}

function setToken(token) {
  localStorage.setItem('admin_token', token);
}

function clearToken() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/admin/';
  }
}

function logout() {
  clearToken();
  window.location.href = '/admin/';
}

// === API helpers ===

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/admin/';
    return null;
  }

  return res.json();
}

async function apiGet(path) {
  return api(path);
}

async function apiPost(path, body) {
  return api(path, { method: 'POST', body: JSON.stringify(body) });
}

// === Toast ===

function showToast(message, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// === Login ===

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(API_BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      setToken(data.token);
      localStorage.setItem('admin_username', data.username);
      window.location.href = '/admin/dashboard.html';
    } else {
      showToast(data.error || 'Login fallito', true);
    }
  } catch (err) {
    showToast('Errore di connessione', true);
  }
}

// === Dashboard ===

async function loadDashboard() {
  requireAuth();
  const stats = await apiGet('/stats');
  if (!stats) return;

  document.getElementById('stat-messages-today').textContent = stats.messagesToday || 0;
  document.getElementById('stat-active-today').textContent = stats.activeToday || 0;
  document.getElementById('stat-total-conversations').textContent = stats.totalConversations || 0;
  document.getElementById('stat-total-messages').textContent = stats.totalMessages || 0;

  const statusDot = document.getElementById('evolution-status');
  if (stats.evolutionConnected) {
    statusDot.className = 'status-dot connected';
    statusDot.nextElementSibling.textContent = 'Connesso';
  } else {
    statusDot.className = 'status-dot disconnected';
    statusDot.nextElementSibling.textContent = 'Disconnesso';
  }

  // Load recent conversations
  const response = await apiGet('/conversations?limit=5');
  if (!response) return;
  const convs = response.data || response;
  const list = document.getElementById('recent-conversations');
  list.innerHTML = '';
  convs.forEach(c => {
    const li = document.createElement('li');
    li.className = 'conv-item';
    li.onclick = () => window.location.href = `/admin/conversations.html?phone=${encodeURIComponent(c.phone)}`;
    li.innerHTML = `
      <div>
        <div class="phone">+${escapeHtml(c.phone)}</div>
        <div class="preview">${escapeHtml(c.lastMessage || '')}</div>
      </div>
      <div class="meta">
        <span class="count">${escapeHtml(String(c.messageCount))}</span>
        <div>${formatDate(c.lastTimestamp)}</div>
      </div>
    `;
    list.appendChild(li);
  });
}

// === Settings ===

async function loadSettings() {
  requireAuth();
  const config = await apiGet('/settings');
  if (!config) return;

  // Fill form fields
  for (const [key, value] of Object.entries(config)) {
    const el = document.getElementById('cfg-' + key);
    if (el) {
      if (el.tagName === 'SELECT') {
        el.value = value;
      } else {
        el.value = value;
      }
    }
  }

  // Update model dropdown based on provider
  updateModelOptions(config.llm_provider);
}

function updateModelOptions(provider) {
  const select = document.getElementById('cfg-llm_model');
  if (!select) return;
  const current = select.value;

  const models = {
    claude: [
      { value: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    ],
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  };

  select.innerHTML = '';
  (models[provider] || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    select.appendChild(opt);
  });

  // Try to restore previous value
  if ([...select.options].some(o => o.value === current)) {
    select.value = current;
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  const fields = form.querySelectorAll('input, select, textarea');
  fields.forEach(f => {
    const key = f.id?.replace('cfg-', '');
    if (key) data[key] = f.value;
  });

  const result = await apiPost('/settings', data);
  if (result?.success) {
    showToast('Impostazioni salvate');
  } else {
    showToast('Errore nel salvataggio', true);
  }
}

// === Conversations ===

async function loadConversations() {
  requireAuth();

  // Check if we need to load a specific conversation
  const params = new URLSearchParams(window.location.search);
  const phone = params.get('phone');
  if (phone) {
    loadChat(phone);
    return;
  }

  const response = await apiGet('/conversations');
  if (!response) return;
  const convs = response.data || response;

  const list = document.getElementById('conversation-list');
  list.innerHTML = '';
  convs.forEach(c => {
    const li = document.createElement('li');
    li.className = 'conv-item';
    li.onclick = () => {
      window.history.pushState({}, '', `?phone=${encodeURIComponent(c.phone)}`);
      loadChat(c.phone);
    };
    li.innerHTML = `
      <div>
        <div class="phone">+${escapeHtml(c.phone)}</div>
        <div class="preview">${escapeHtml(c.lastMessage || '')}</div>
      </div>
      <div class="meta">
        <span class="count">${escapeHtml(String(c.messageCount))}</span>
        <div>${formatDate(c.lastTimestamp)}</div>
      </div>
    `;
    list.appendChild(li);
  });
}

async function loadChat(phone) {
  const messages = await apiGet(`/conversations/${phone}`);
  if (!messages) return;

  const listEl = document.getElementById('conversation-list');
  const chatEl = document.getElementById('chat-view');
  if (listEl) listEl.style.display = 'none';
  if (chatEl) {
    chatEl.style.display = 'block';
    const header = chatEl.querySelector('.chat-header');
    if (header) header.innerHTML = `<a href="/admin/conversations.html">&lt; Indietro</a> &nbsp; <strong>+${escapeHtml(phone)}</strong>`;

    const container = chatEl.querySelector('.chat-messages');
    container.innerHTML = '';
    messages.forEach(m => {
      const div = document.createElement('div');
      div.className = 'chat-msg ' + (m.role === 'assistant' ? 'assistant' : 'user');
      div.innerHTML = `
        <div class="bubble">${escapeHtml(m.content)}</div>
        <div class="time">${m.media_type ? `[${escapeHtml(m.media_type)}] ` : ''}${formatTime(m.timestamp)}</div>
      `;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  }
}

async function searchConversations() {
  const query = document.getElementById('search-input')?.value;
  if (!query) { loadConversations(); return; }

  const response = await apiGet(`/search?q=${encodeURIComponent(query)}`);
  if (!response) return;
  const results = response.data || response;

  const list = document.getElementById('conversation-list');
  list.innerHTML = '';
  if (results.length === 0) {
    list.innerHTML = '<li style="padding:20px;color:var(--text-dim)">Nessun risultato</li>';
    return;
  }
  results.forEach(m => {
    const li = document.createElement('li');
    li.className = 'conv-item';
    li.onclick = () => {
      window.history.pushState({}, '', `?phone=${encodeURIComponent(m.phone)}`);
      loadChat(m.phone);
    };
    li.innerHTML = `
      <div>
        <div class="phone">+${escapeHtml(m.phone)} <span style="color:var(--text-dim);font-size:11px">[${escapeHtml(m.role)}]</span></div>
        <div class="preview">${escapeHtml(m.content)}</div>
      </div>
      <div class="meta">${formatDate(m.timestamp)}</div>
    `;
    list.appendChild(li);
  });
}

// === Utilities ===

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts + 'Z');
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts + 'Z');
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
