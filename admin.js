import { api, escapeHtml, formatDate, formatMoney, getLocale, icon, setBusy, setLocale, showToast } from './shared.js';

const copy = {
  en: {
    authEyebrow: 'Restricted operations', authTitle: 'Control the network.', authCopy: 'Use the admin credentials configured in Render environment variables. Credentials never appear in the browser bundle.', signIn: 'Sign in', signingIn: 'Signing in…', logout: 'Sign out',
    dashboardEyebrow: 'Network operations', dashboardTitle: 'Truth at a glance.', dashboardCopy: 'Connector health, business verification, marketplace demand, quotes, and confirmed bookings.', generated: 'Last generated',
    businesses: 'Business verification', requests: 'Quote requests', connectors: 'Connector health', audit: 'Recent operations',
    searchesToday: 'Searches today', quoteRequests: 'Quote requests', quotesSubmitted: 'Quotes submitted', bookings: 'Bookings',
    noBusinesses: 'No businesses have registered yet.', noRequests: 'No quote requests yet.', noAudit: 'No operational events yet.',
    verify: 'Verify', suspend: 'Suspend', setPending: 'Set pending', statusUpdated: 'Business status updated.', refresh: 'Refresh',
    storagePostgres: 'Persistent PostgreSQL storage is active.', storageLocal: 'Local JSON storage is active; configure SUPABASE_URL and SUPABASE_SECRET_KEY for public use.'
  },
  ar: {
    authEyebrow: 'عمليات مقيدة', authTitle: 'تحكّم بالشبكة.', authCopy: 'استخدم بيانات الإدارة المحفوظة في متغيرات بيئة Render. لا تظهر البيانات السرية في المتصفح.', signIn: 'تسجيل الدخول', signingIn: 'جارٍ الدخول…', logout: 'تسجيل الخروج',
    dashboardEyebrow: 'عمليات الشبكة', dashboardTitle: 'الحقيقة بنظرة واحدة.', dashboardCopy: 'صحة الموصلات، تحقق الشركات، الطلبات، عروض الأسعار، والحجوزات المؤكدة.', generated: 'آخر تحديث',
    businesses: 'تحقق الشركات', requests: 'طلبات عروض السعر', connectors: 'صحة الموصلات', audit: 'آخر العمليات',
    searchesToday: 'عمليات البحث اليوم', quoteRequests: 'طلبات السعر', quotesSubmitted: 'العروض المرسلة', bookings: 'الحجوزات',
    noBusinesses: 'لم تسجل أي شركة بعد.', noRequests: 'لا توجد طلبات بعد.', noAudit: 'لا توجد أحداث تشغيلية بعد.',
    verify: 'اعتماد', suspend: 'إيقاف', setPending: 'قيد المراجعة', statusUpdated: 'تم تحديث حالة الشركة.', refresh: 'تحديث',
    storagePostgres: 'التخزين الدائم في PostgreSQL مفعّل.', storageLocal: 'التخزين المحلي مفعّل؛ أضف SUPABASE_URL وSUPABASE_SECRET_KEY للاستخدام العام.'
  }
};

const el = (id) => document.getElementById(id);
const state = {
  locale: getLocale(),
  token: sessionStorage.getItem('nayl-admin-token') || '',
  config: null,
  overview: null,
  businesses: [],
  requests: []
};
function t(key) { return copy[state.locale][key] ?? copy.en[key] ?? key; }

function translateStatic() {
  setLocale(state.locale);
  el('language-button').textContent = state.locale === 'en' ? 'العربية' : 'English';
  el('auth-eyebrow').textContent = t('authEyebrow');
  el('auth-title').textContent = t('authTitle');
  el('auth-copy').textContent = t('authCopy');
  el('login-submit').textContent = t('signIn');
  el('logout-button').innerHTML = `${icon('logout', 15)} ${t('logout')}`;
  el('dashboard-eyebrow').textContent = t('dashboardEyebrow');
  el('dashboard-title').textContent = t('dashboardTitle');
  el('dashboard-copy').textContent = t('dashboardCopy');
  el('generated-label').textContent = t('generated');
  el('businesses-title').textContent = t('businesses');
  el('requests-title').textContent = t('requests');
  el('connectors-title').textContent = t('connectors');
  el('audit-title').textContent = t('audit');
  render();
}

function showAuth() {
  el('auth-view').classList.remove('hidden');
  el('dashboard-view').classList.add('hidden');
  el('logout-button').classList.add('hidden');
}
function showDashboard() {
  el('auth-view').classList.add('hidden');
  el('dashboard-view').classList.remove('hidden');
  el('logout-button').classList.remove('hidden');
}

function renderMetrics() {
  const k = state.overview?.kpis || {};
  const cards = [
    [t('searchesToday'), k.searchesToday || 0, `${k.totalSearches || 0} total`],
    [t('quoteRequests'), k.quoteRequests || 0, `${k.openRequests || 0} open`],
    [t('quotesSubmitted'), k.quotesSubmitted || 0, `${k.registeredBusinesses || 0} businesses`],
    [t('bookings'), k.bookings || 0, Object.entries(k.gmvByCurrency || {}).map(([currency, value]) => formatMoney(value, currency, state.locale)).join(' · ') || 'No GMV yet']
  ];
  el('metric-grid').innerHTML = cards.map(([label, value, small]) => `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(small)}</small></article>`).join('');
}

function renderConnectors() {
  const connectors = state.overview?.connectors || state.config?.connectors || [];
  el('connector-grid').innerHTML = connectors.map((connector) => `<article class="connector-card" data-mode="${escapeHtml(connector.mode)}"><span class="connector-card__dot"></span><div><strong>${escapeHtml(connector.name)}</strong><p>${escapeHtml(connector.mode)} · ${escapeHtml(connector.description || '')}</p></div></article>`).join('');
}

function renderBusinesses() {
  const root = el('business-table');
  if (!state.businesses.length) {
    root.innerHTML = `<div class="empty-state">${escapeHtml(t('noBusinesses'))}</div>`;
    return;
  }
  root.innerHTML = `<table class="data-table"><thead><tr><th>Business</th><th>Market / areas</th><th>Services</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.businesses.map((business) => `<tr>
    <td><strong>${escapeHtml(business.name)}</strong><small>${escapeHtml(business.email)} · ${escapeHtml(business.phone || 'No phone')}</small></td>
    <td><strong>${escapeHtml(business.market)}</strong><small>${escapeHtml(business.serviceAreas.join(', '))}</small></td>
    <td><strong>${escapeHtml(business.categories.join(', '))}</strong><small>${business.priceFrom ? `From ${escapeHtml(formatMoney(business.priceFrom, business.currency, state.locale))}` : 'No starting price'}</small></td>
    <td><span class="status-badge" data-status="${escapeHtml(business.status)}">${escapeHtml(business.status)}</span></td>
    <td><div class="inline-actions">${business.status !== 'verified' ? `<button class="primary-button button--small" data-action="business-status" data-id="${business.id}" data-status="verified" type="button">${escapeHtml(t('verify'))}</button>` : ''}${business.status !== 'suspended' ? `<button class="danger-button button--small" data-action="business-status" data-id="${business.id}" data-status="suspended" type="button">${escapeHtml(t('suspend'))}</button>` : `<button class="secondary-button button--small" data-action="business-status" data-id="${business.id}" data-status="pending" type="button">${escapeHtml(t('setPending'))}</button>`}</div></td>
  </tr>`).join('')}</tbody></table>`;
}

function renderRequests() {
  const root = el('request-table');
  if (!state.requests.length) {
    root.innerHTML = `<div class="empty-state">${escapeHtml(t('noRequests'))}</div>`;
    return;
  }
  root.innerHTML = `<table class="data-table"><thead><tr><th>Demand</th><th>Context</th><th>Quotes</th><th>Status</th><th>Customer</th></tr></thead><tbody>${state.requests.map((request) => `<tr>
    <td><strong>${escapeHtml(request.query)}</strong><small>${escapeHtml(request.id)} · ${escapeHtml(formatDate(request.createdAt, state.locale))}</small></td>
    <td><strong>${escapeHtml(request.city)}, ${escapeHtml(request.market)}</strong><small>${escapeHtml(request.category)} · ${request.budget ? escapeHtml(formatMoney(request.budget, request.currency, state.locale)) : 'No budget'}</small></td>
    <td><strong>${request.quoteCount}</strong><small>${request.matchedBusinessCount || 0} matched at creation</small></td>
    <td><span class="status-badge" data-status="${escapeHtml(request.status)}">${escapeHtml(request.status)}</span></td>
    <td><strong>${escapeHtml(request.contact?.name || '')}</strong><small>${escapeHtml(request.contact?.email || '')}</small></td>
  </tr>`).join('')}</tbody></table>`;
}

function renderAudit() {
  const events = state.overview?.recentAudit || [];
  el('audit-list').innerHTML = events.length ? events.map((event) => `<article><span class="request-card__id">${escapeHtml(event.type)} · ${escapeHtml(formatDate(event.createdAt, state.locale))}</span><p style="margin:6px 0 0;color:var(--muted);line-height:1.45">${escapeHtml(event.summary)}</p></article>`).join('') : `<div class="empty-state">${escapeHtml(t('noAudit'))}</div>`;
}

function render() {
  if (!state.overview) return;
  el('generated-at').textContent = formatDate(state.overview.generatedAt, state.locale);
  el('storage-copy').textContent = state.config?.storageMode === 'supabase-postgres' ? t('storagePostgres') : t('storageLocal');
  renderMetrics();
  renderConnectors();
  renderBusinesses();
  renderRequests();
  renderAudit();
}

async function loadAdmin({ quiet = false } = {}) {
  if (!state.token) return showAuth();
  try {
    const [overview, businesses, requests] = await Promise.all([
      api('/api/admin/overview', { token: state.token }),
      api('/api/admin/businesses', { token: state.token }),
      api('/api/admin/requests', { token: state.token })
    ]);
    state.overview = overview;
    state.businesses = businesses.businesses || [];
    state.requests = requests.requests || [];
    showDashboard();
    render();
  } catch (error) {
    if (error.status === 401) {
      sessionStorage.removeItem('nayl-admin-token');
      state.token = '';
      showAuth();
    } else if (!quiet) showToast(error.message, 'error');
  }
}

async function login(event) {
  event.preventDefault();
  const button = el('login-submit');
  setBusy(button, true, t('signingIn'));
  try {
    const output = await api('/api/admin/login', { method: 'POST', body: { email: el('admin-email').value, password: el('admin-password').value } });
    state.token = output.token;
    sessionStorage.setItem('nayl-admin-token', state.token);
    await loadAdmin();
  } catch (error) {
    showToast(error.message, 'error');
  } finally { setBusy(button, false); }
}

async function setBusinessStatus(id, status, button) {
  setBusy(button, true, status);
  try {
    await api(`/api/admin/businesses/${encodeURIComponent(id)}/status`, { token: state.token, method: 'PATCH', body: { status } });
    showToast(t('statusUpdated'));
    await loadAdmin();
  } catch (error) {
    showToast(error.message, 'error');
    setBusy(button, false);
  }
}

async function init() {
  setLocale(state.locale);
  el('refresh-admin').innerHTML = icon('refresh');
  el('login-form').addEventListener('submit', login);
  el('refresh-admin').addEventListener('click', () => loadAdmin());
  el('language-button').addEventListener('click', () => {
    state.locale = state.locale === 'en' ? 'ar' : 'en';
    translateStatic();
  });
  el('logout-button').addEventListener('click', () => {
    sessionStorage.removeItem('nayl-admin-token');
    state.token = '';
    state.overview = null;
    showAuth();
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="business-status"]');
    if (target) setBusinessStatus(target.dataset.id, target.dataset.status, target);
  });

  try {
    state.config = await api('/api/config');
    translateStatic();
    if (state.token) await loadAdmin();
    else showAuth();
    setInterval(() => state.token && loadAdmin({ quiet: true }), 30_000);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

init();
