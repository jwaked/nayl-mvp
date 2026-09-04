import { api, escapeHtml, formatDate, formatMoney, getLocale, icon, setBusy, setLocale, showToast } from './shared.js';

const copy = {
  en: {
    authEyebrow: 'Restricted operations', authTitle: 'Control the network.', authCopy: 'Sign in to manage providers, demand, live connectors, and bookings.', signIn: 'Sign in', signingIn: 'Signing in…', logout: 'Sign out',
    setupTitle: 'First launch', setupCopy: 'Create the owner account now. This setup closes permanently after the first owner is created.', setupSubmit: 'Create owner account', settingUp: 'Creating owner…',
    dashboardEyebrow: 'Network operations', dashboardTitle: 'Truth at a glance.', dashboardCopy: 'Configure live search, verify businesses, and monitor the full buyer-to-booking loop.', generated: 'Last generated',
    businesses: 'Business verification', requests: 'Quote requests', connectors: 'Runtime health', audit: 'Recent operations',
    searchesToday: 'Searches today', quoteRequests: 'Quote requests', quotesSubmitted: 'Quotes submitted', bookings: 'Bookings',
    noBusinesses: 'No businesses have registered yet.', noRequests: 'No quote requests yet.', noAudit: 'No operational events yet.',
    verify: 'Verify', suspend: 'Suspend', setPending: 'Set pending', statusUpdated: 'Business status updated.',
    storagePostgres: 'Persistent Supabase PostgreSQL storage is active.', storageLocal: 'Persistent JSON storage is active on this server. Add a disk or Supabase before scaling to multiple instances.',
    saved: 'Connector configuration saved.', testing: 'Testing…', testPassed: 'Connection passed.', testFailed: 'Connection failed.',
    configured: 'Configured', setupRequired: 'Setup required', environment: 'Environment', vault: 'Admin vault', notTested: 'Not tested yet.'
  },
  ar: {
    authEyebrow: 'عمليات مقيدة', authTitle: 'تحكّم بالشبكة.', authCopy: 'سجّل الدخول لإدارة المزودين والطلب والموصلات المباشرة والحجوزات.', signIn: 'تسجيل الدخول', signingIn: 'جارٍ الدخول…', logout: 'تسجيل الخروج',
    setupTitle: 'التشغيل الأول', setupCopy: 'أنشئ حساب المالك الآن. يُغلق الإعداد نهائياً بعد إنشاء أول مالك.', setupSubmit: 'إنشاء حساب المالك', settingUp: 'جارٍ إنشاء الحساب…',
    dashboardEyebrow: 'عمليات الشبكة', dashboardTitle: 'الحقيقة بنظرة واحدة.', dashboardCopy: 'فعّل البحث المباشر واعتمد الشركات وراقب رحلة الطلب حتى الحجز.', generated: 'آخر تحديث',
    businesses: 'تحقق الشركات', requests: 'طلبات عروض السعر', connectors: 'حالة التشغيل', audit: 'آخر العمليات',
    searchesToday: 'عمليات البحث اليوم', quoteRequests: 'طلبات السعر', quotesSubmitted: 'العروض المرسلة', bookings: 'الحجوزات',
    noBusinesses: 'لم تسجل أي شركة بعد.', noRequests: 'لا توجد طلبات بعد.', noAudit: 'لا توجد أحداث تشغيلية بعد.',
    verify: 'اعتماد', suspend: 'إيقاف', setPending: 'قيد المراجعة', statusUpdated: 'تم تحديث حالة الشركة.',
    storagePostgres: 'التخزين الدائم في Supabase PostgreSQL مفعّل.', storageLocal: 'تخزين JSON الدائم مفعّل على هذا الخادم. أضف قرصاً أو Supabase قبل تشغيل أكثر من نسخة.',
    saved: 'تم حفظ إعدادات الموصلات.', testing: 'جارٍ الاختبار…', testPassed: 'نجح الاتصال.', testFailed: 'فشل الاتصال.',
    configured: 'مُعدّ', setupRequired: 'يحتاج إعداداً', environment: 'متغيرات البيئة', vault: 'خزنة الإدارة', notTested: 'لم يتم الاختبار بعد.'
  }
};

const el = (id) => document.getElementById(id);
const state = {
  locale: getLocale(),
  token: sessionStorage.getItem('nayl-admin-token') || '',
  config: null,
  overview: null,
  businesses: [],
  requests: [],
  connectorSettings: null
};
function t(key) { return copy[state.locale][key] ?? copy.en[key] ?? key; }

function translateStatic() {
  setLocale(state.locale);
  el('language-button').textContent = state.locale === 'en' ? 'العربية' : 'English';
  el('auth-eyebrow').textContent = t('authEyebrow');
  el('auth-title').textContent = t('authTitle');
  el('auth-copy').textContent = t('authCopy');
  el('login-submit').textContent = t('signIn');
  el('setup-notice-title').textContent = t('setupTitle');
  el('setup-notice-copy').textContent = t('setupCopy');
  el('setup-submit').textContent = t('setupSubmit');
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
  const setupRequired = Boolean(state.config?.setupRequired);
  el('setup-form').classList.toggle('hidden', !setupRequired);
  el('login-form').classList.toggle('hidden', setupRequired);
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
  el('connector-grid').innerHTML = connectors.map((connector) => `<article class="connector-card" data-mode="${escapeHtml(connector.mode)}"><span class="connector-card__dot"></span><div><strong>${escapeHtml(connector.name)}</strong><p>${escapeHtml(connector.status || connector.mode)} · ${escapeHtml(connector.description || '')}</p></div></article>`).join('');
}

function providerStatus(provider) {
  const item = state.connectorSettings?.[provider];
  if (!item) return;
  const status = el(`${provider}-status`);
  if (status) {
    status.textContent = item.configured ? t('configured') : t('setupRequired');
    status.classList.toggle('integration-state--live', item.configured);
  }
  const input = el(`${provider}-key`);
  if (input) input.placeholder = item.keyHint ? `Stored securely: ${item.keyHint}` : input.dataset.defaultPlaceholder || input.placeholder;
  const output = el(`${provider}-test`);
  if (output) {
    const test = item.lastTest;
    output.textContent = test
      ? `${test.ok ? '✓' : '×'} ${test.message} · ${formatDate(test.testedAt, state.locale)}`
      : t('notTested');
    output.dataset.ok = test ? String(Boolean(test.ok)) : '';
  }
}

function renderConnectorSettings() {
  if (!state.connectorSettings) return;
  const openai = state.connectorSettings.openai || {};
  el('openai-model').value = openai.model || 'gpt-5.6-luna';
  el('openai-deep-model').value = openai.deepModel || 'gpt-5.6-terra';
  el('email-from').value = state.connectorSettings.resend?.emailFrom || '';
  el('auto-verify-businesses').checked = Boolean(state.connectorSettings.marketplace?.autoVerifyBusinesses);
  ['openai', 'google', 'brave', 'resend'].forEach(providerStatus);
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
  renderConnectorSettings();
  renderBusinesses();
  renderRequests();
  renderAudit();
}

async function loadAdmin({ quiet = false } = {}) {
  if (!state.token) return showAuth();
  try {
    const [overview, businesses, requests, connectorResponse] = await Promise.all([
      api('/api/admin/overview', { token: state.token }),
      api('/api/admin/businesses', { token: state.token }),
      api('/api/admin/requests', { token: state.token }),
      api('/api/admin/connectors', { token: state.token })
    ]);
    state.overview = overview;
    state.businesses = businesses.businesses || [];
    state.requests = requests.requests || [];
    state.connectorSettings = connectorResponse.connectors || null;
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

async function setupOwner(event) {
  event.preventDefault();
  const button = el('setup-submit');
  setBusy(button, true, t('settingUp'));
  try {
    const output = await api('/api/admin/setup', {
      method: 'POST',
      body: { name: el('setup-name').value, email: el('setup-email').value, password: el('setup-password').value }
    });
    state.token = output.token;
    sessionStorage.setItem('nayl-admin-token', state.token);
    state.config = await api('/api/config');
    await loadAdmin();
  } catch (error) {
    showToast(error.message, 'error');
  } finally { setBusy(button, false); }
}

function connectorPayload() {
  return {
    openai: {
      apiKey: el('openai-key').value.trim(),
      clearApiKey: el('openai-clear').checked,
      model: el('openai-model').value.trim(),
      deepModel: el('openai-deep-model').value.trim()
    },
    google: { apiKey: el('google-key').value.trim(), clearApiKey: el('google-clear').checked },
    brave: { apiKey: el('brave-key').value.trim(), clearApiKey: el('brave-clear').checked },
    resend: { apiKey: el('resend-key').value.trim(), clearApiKey: el('resend-clear').checked, emailFrom: el('email-from').value.trim() },
    marketplace: { autoVerifyBusinesses: el('auto-verify-businesses').checked }
  };
}

async function saveConnectors(event, { silent = false } = {}) {
  if (event) event.preventDefault();
  const button = el('save-connectors');
  setBusy(button, true, 'Saving…');
  try {
    const output = await api('/api/admin/connectors', { token: state.token, method: 'PUT', body: connectorPayload() });
    state.connectorSettings = output.connectors;
    ['openai', 'google', 'brave', 'resend'].forEach((provider) => {
      el(`${provider}-key`).value = '';
      el(`${provider}-clear`).checked = false;
    });
    renderConnectorSettings();
    if (!silent) showToast(t('saved'));
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  } finally { setBusy(button, false); }
}

async function testProvider(provider, button) {
  const saved = await saveConnectors(null, { silent: true });
  if (!saved) return;
  setBusy(button, true, t('testing'));
  try {
    const output = await api(`/api/admin/connectors/${encodeURIComponent(provider)}/test`, { token: state.token, method: 'POST', body: {} });
    if (output.result?.ok) showToast(`${t('testPassed')} ${output.result.message}`);
    else showToast(`${t('testFailed')} ${output.result?.message || ''}`, 'error');
    const connectors = await api('/api/admin/connectors', { token: state.token });
    state.connectorSettings = connectors.connectors;
    renderConnectorSettings();
    await loadAdmin({ quiet: true });
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
  ['openai', 'google', 'brave', 'resend'].forEach((provider) => {
    const input = el(`${provider}-key`);
    if (input) input.dataset.defaultPlaceholder = input.placeholder;
  });
  el('refresh-admin').innerHTML = icon('refresh');
  el('login-form').addEventListener('submit', login);
  el('setup-form').addEventListener('submit', setupOwner);
  el('connector-settings-form').addEventListener('submit', saveConnectors);
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
    const statusTarget = event.target.closest('[data-action="business-status"]');
    if (statusTarget) setBusinessStatus(statusTarget.dataset.id, statusTarget.dataset.status, statusTarget);
    const testTarget = event.target.closest('[data-test-provider]');
    if (testTarget) testProvider(testTarget.dataset.testProvider, testTarget);
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
