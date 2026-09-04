export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function api(path, { token, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.details = payload?.error?.details;
    throw error;
  }
  return payload;
}

export function formatMoney(value, currency = 'AED', locale = 'en') {
  if (value == null || value === '') return '—';
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency,
      maximumFractionDigits: ['BHD', 'KWD', 'OMR'].includes(currency) ? 3 : 0
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export function formatDate(value, locale = 'en', options = {}) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getLocale() {
  return localStorage.getItem('nayl-locale') === 'ar' ? 'ar' : 'en';
}

export function setLocale(locale) {
  localStorage.setItem('nayl-locale', locale === 'ar' ? 'ar' : 'en');
  document.documentElement.lang = locale === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function showToast(message, type = 'success') {
  let root = document.querySelector('#toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    document.body.appendChild(root);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><p>${escapeHtml(message)}</p>`;
  root.appendChild(toast);
  setTimeout(() => toast.classList.add('toast--visible'), 10);
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 250);
  }, 4400);
}

export function setBusy(button, busy, label = 'Working…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span>${escapeHtml(label)}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalLabel) button.innerHTML = button.dataset.originalLabel;
  }
}

export function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

export function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

export function icon(name, size = 18) {
  const paths = {
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    wallet: '<path d="M4 6h14v14H6a2 2 0 0 1-2-2V6Z"/><path d="M4 9h14M15 12h6v5h-6a2.5 2.5 0 0 1 0-5Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    external: '<path d="M14 4h6v6M10 14 20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
    quote: '<path d="M5 5h14v11H9l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    building: '<path d="M4 21V5l8-3 8 3v16"/><path d="M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"/>',
    shield: '<path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-3l2 6M18 15a7 7 0 0 1-12 3l-2-6"/>',
    logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    inbox: '<path d="M4 4h16v16H4z"/><path d="M4 14h5l2 2h2l2-2h5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'
  };
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.bolt}</svg>`;
}

export async function ensureConsumerSession() {
  let token = localStorage.getItem('nayl-consumer-token');
  if (token) return token;
  const session = await api('/api/consumer/session', { method: 'POST', body: {} });
  token = session.token;
  localStorage.setItem('nayl-consumer-token', token);
  return token;
}

export function selectedValues(select) {
  return [...select.selectedOptions].map((option) => option.value);
}
