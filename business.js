import {
  api,
  closeDialog,
  escapeHtml,
  formatDate,
  formatMoney,
  getLocale,
  icon,
  openDialog,
  selectedValues,
  setBusy,
  setLocale,
  showToast
} from './shared.js';

const copy = {
  en: {
    authEyebrow: 'Provider network', authTitle: 'Turn demand into revenue.', authCopy: 'Register your real service profile and receive qualified opportunities matched by category and service area. Network policy determines whether activation is immediate or reviewed.',
    signIn: 'Sign in', register: 'Register business', create: 'Create business account', creating: 'Creating…', signingIn: 'Signing in…',
    dashboardEyebrow: 'Business performance', pipeline: 'Your pipeline.', pipelineCopy: 'Qualified NAYL opportunities matched to your approved profile.',
    accountStatus: 'Account status', pendingCopy: 'An administrator must verify the profile before it appears in search or receives opportunities.', verifiedCopy: 'Your profile is live and receiving matching demand.', suspendedCopy: 'Your profile has been suspended. Contact NAYL operations.',
    opportunities: 'Qualified opportunities', profile: 'Marketplace profile', accepting: 'Accept new opportunities', save: 'Save profile', saving: 'Saving…', logout: 'Sign out',
    openOpportunities: 'Open opportunities', quotesSubmitted: 'Quotes submitted', wins: 'Wins', winRate: 'Win rate', noOpportunities: 'No matching opportunities yet. Keep your profile active and service areas accurate.', pendingOpportunities: 'Your profile is waiting for admin verification. Opportunities will appear after approval.',
    budget: 'Budget', noBudget: 'No stated budget', quoteCount: 'quotes', created: 'Created', quoteNow: 'Quote now', editQuote: 'Edit quote', won: 'Won', bookedElsewhere: 'Booked',
    sendQuote: 'Send quote', updatingQuote: 'Updating quote', sending: 'Sending…', quoteSent: 'Quote submitted successfully.', profileSaved: 'Profile updated.', accountCreated: 'Business account created.',
    loginFailed: 'Could not sign in', registrationFailed: 'Could not register', refresh: 'Refresh', customerContact: 'Confirmed customer contact'
  },
  ar: {
    authEyebrow: 'شبكة المزودين', authTitle: 'حوّل الطلب إلى إيراد.', authCopy: 'سجّل ملف خدمتك الحقيقي، أكمل تحقق الإدارة، ثم استقبل فرصاً مؤهلة حسب الفئة ومنطقة الخدمة.',
    signIn: 'تسجيل الدخول', register: 'تسجيل شركة', create: 'إنشاء حساب شركة', creating: 'جارٍ الإنشاء…', signingIn: 'جارٍ الدخول…',
    dashboardEyebrow: 'أداء الأعمال', pipeline: 'خط الفرص.', pipelineCopy: 'فرص NAYL المؤهلة والمطابقة لملفك المعتمد.',
    accountStatus: 'حالة الحساب', pendingCopy: 'يجب أن تتحقق الإدارة من الملف قبل ظهوره في البحث أو استلام الفرص.', verifiedCopy: 'ملفك مباشر ويستقبل الطلبات المطابقة.', suspendedCopy: 'تم إيقاف ملفك. تواصل مع عمليات NAYL.',
    opportunities: 'الفرص المؤهلة', profile: 'ملف السوق', accepting: 'استقبال فرص جديدة', save: 'حفظ الملف', saving: 'جارٍ الحفظ…', logout: 'تسجيل الخروج',
    openOpportunities: 'فرص مفتوحة', quotesSubmitted: 'العروض المرسلة', wins: 'الفوز', winRate: 'نسبة الفوز', noOpportunities: 'لا توجد فرص مطابقة حالياً. حافظ على دقة مناطق الخدمة.', pendingOpportunities: 'ملفك بانتظار تحقق الإدارة. ستظهر الفرص بعد الموافقة.',
    budget: 'الميزانية', noBudget: 'لا توجد ميزانية محددة', quoteCount: 'عروض', created: 'أُنشئ', quoteNow: 'أرسل عرضاً', editQuote: 'عدّل العرض', won: 'فزت', bookedElsewhere: 'تم الحجز',
    sendQuote: 'إرسال العرض', updatingQuote: 'تحديث العرض', sending: 'جارٍ الإرسال…', quoteSent: 'تم إرسال العرض بنجاح.', profileSaved: 'تم تحديث الملف.', accountCreated: 'تم إنشاء حساب الشركة.',
    loginFailed: 'تعذر تسجيل الدخول', registrationFailed: 'تعذر التسجيل', refresh: 'تحديث', customerContact: 'بيانات العميل المؤكدة'
  }
};

const el = (id) => document.getElementById(id);
const state = {
  locale: getLocale(),
  config: null,
  token: localStorage.getItem('nayl-business-token') || '',
  business: null,
  kpis: null,
  opportunities: [],
  selectedOpportunity: null,
  authMode: 'login'
};
function t(key) { return copy[state.locale][key] ?? copy.en[key] ?? key; }

function translateStatic() {
  setLocale(state.locale);
  el('language-button').textContent = state.locale === 'en' ? 'العربية' : 'English';
  el('auth-eyebrow').textContent = t('authEyebrow');
  el('auth-title').textContent = t('authTitle');
  el('auth-copy').textContent = t('authCopy');
  el('login-tab').textContent = t('signIn');
  el('register-tab').textContent = t('register');
  el('login-submit').textContent = t('signIn');
  el('register-submit').textContent = t('create');
  el('dashboard-eyebrow').textContent = t('dashboardEyebrow');
  el('business-heading').textContent = state.business?.name || t('pipeline');
  el('business-subheading').textContent = t('pipelineCopy');
  el('opportunities-title').textContent = t('opportunities');
  el('profile-title').textContent = t('profile');
  el('accepting-leads-label').textContent = t('accepting');
  el('profile-submit').textContent = t('save');
  el('logout-button').innerHTML = `${icon('logout', 15)} ${t('logout')}`;
  renderDashboard();
}

function showAuth(mode = 'login') {
  state.authMode = mode;
  el('auth-view').classList.remove('hidden');
  el('dashboard-view').classList.add('hidden');
  el('logout-button').classList.add('hidden');
  el('login-form').classList.toggle('hidden', mode !== 'login');
  el('register-form').classList.toggle('hidden', mode !== 'register');
  el('login-tab').classList.toggle('is-active', mode === 'login');
  el('register-tab').classList.toggle('is-active', mode === 'register');
}

function showDashboard() {
  el('auth-view').classList.add('hidden');
  el('dashboard-view').classList.remove('hidden');
  el('logout-button').classList.remove('hidden');
}

function renderRegistrationOptions() {
  if (!state.config) return;
  el('business-market').innerHTML = state.config.markets.map((market) => `<option value="${market.code}">${escapeHtml(state.locale === 'ar' ? market.nameAr : market.name)} · ${market.currency}</option>`).join('');
  el('business-market').value = state.config.defaults.market;
  renderRegistrationCities();
  el('business-categories').innerHTML = state.config.categories.map((category) => `<option value="${category.id}">${escapeHtml(state.locale === 'ar' ? category.labelAr : category.label)}</option>`).join('');
}

function renderRegistrationCities() {
  const market = state.config?.markets.find((item) => item.code === el('business-market').value) || state.config?.markets[0];
  if (!market) return;
  el('business-cities').innerHTML = market.cities.map((city) => `<option value="${escapeHtml(city.name)}">${escapeHtml(state.locale === 'ar' ? city.nameAr : city.name)}</option>`).join('');
}

function renderMetrics() {
  const k = state.kpis || { openOpportunities: 0, quotesSubmitted: 0, wins: 0, winRate: 0 };
  el('metric-grid').innerHTML = [
    [t('openOpportunities'), k.openOpportunities, 'live demand'],
    [t('quotesSubmitted'), k.quotesSubmitted, formatMoney(k.quotedValue || 0, k.currency || state.business?.currency, state.locale)],
    [t('wins'), k.wins, 'confirmed bookings'],
    [t('winRate'), `${k.winRate || 0}%`, 'accepted / submitted']
  ].map(([label, value, small]) => `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(small)}</small></article>`).join('');
}

function renderProfile() {
  if (!state.business) return;
  el('profile-name').value = state.business.name || '';
  el('profile-phone').value = state.business.phone || '';
  el('profile-website').value = state.business.website || '';
  el('profile-price').value = state.business.priceFrom ?? '';
  el('profile-description').value = state.business.description || '';
  el('profile-accepting').checked = state.business.acceptingLeads !== false;
}

function renderOpportunities() {
  const root = el('opportunity-list');
  if (!state.business) return;
  if (state.business.status !== 'verified') {
    root.innerHTML = `<div class="empty-state">${escapeHtml(t('pendingOpportunities'))}</div>`;
    return;
  }
  if (!state.opportunities.length) {
    root.innerHTML = `<div class="empty-state">${escapeHtml(t('noOpportunities'))}</div>`;
    return;
  }
  root.innerHTML = state.opportunities.map((opportunity, index) => {
    const amount = opportunity.budget ? formatMoney(opportunity.budget, opportunity.currency, state.locale) : t('noBudget');
    let action;
    if (opportunity.won) action = `<span class="status-badge" data-status="verified">${escapeHtml(t('won'))}</span>`;
    else if (opportunity.status === 'booked') action = `<span class="status-badge" data-status="booked">${escapeHtml(t('bookedElsewhere'))}</span>`;
    else action = `<button class="primary-button button--small" type="button" data-action="open-quote" data-index="${index}">${icon('quote', 15)} ${escapeHtml(opportunity.ownQuote ? t('editQuote') : t('quoteNow'))}</button>`;
    return `<article class="opportunity-row">
      <div><span class="request-card__id">${escapeHtml(opportunity.id)} · ${escapeHtml(opportunity.category)} · ${escapeHtml(opportunity.city)}</span><h3>${escapeHtml(opportunity.query)}</h3><p>${escapeHtml(opportunity.details || opportunity.sourceResult?.subtitle || '')}</p><div class="opportunity-row__meta"><span class="meta-pill">${icon('wallet', 13)} ${escapeHtml(amount)}</span><span class="meta-pill">${icon('clock', 13)} ${escapeHtml(opportunity.urgency)}</span><span class="meta-pill">${opportunity.quoteCount} ${escapeHtml(t('quoteCount'))}</span><span class="meta-pill">${escapeHtml(t('created'))} ${escapeHtml(formatDate(opportunity.createdAt, state.locale))}</span></div>${opportunity.consumerContact ? `<div class="request-card" style="margin-top:14px"><strong>${escapeHtml(t('customerContact'))}</strong><p>${escapeHtml(opportunity.consumerContact.name)} · ${escapeHtml(opportunity.consumerContact.email)} · ${escapeHtml(opportunity.consumerContact.phone || '')}</p></div>` : ''}</div>
      <div class="opportunity-row__action"><strong class="lime">${escapeHtml(amount)}</strong>${action}</div>
    </article>`;
  }).join('');
}

function renderDashboard() {
  if (!state.business) return;
  el('business-heading').textContent = state.business.name;
  const status = state.business.status;
  el('account-status').innerHTML = `<span class="status-badge" data-status="${escapeHtml(status)}">${escapeHtml(status)}</span>`;
  el('account-status-copy').textContent = status === 'verified' ? t('verifiedCopy') : status === 'suspended' ? t('suspendedCopy') : t('pendingCopy');
  renderMetrics();
  renderProfile();
  renderOpportunities();
}

async function loadDashboard({ quiet = false } = {}) {
  if (!state.token) return showAuth();
  try {
    const me = await api('/api/business/me', { token: state.token });
    state.business = me.business;
    const kpis = await api('/api/business/kpis', { token: state.token });
    state.kpis = kpis.kpis;
    if (state.business.status === 'verified') {
      const opportunities = await api('/api/business/opportunities', { token: state.token });
      state.opportunities = opportunities.opportunities || [];
    } else {
      state.opportunities = [];
    }
    showDashboard();
    renderDashboard();
  } catch (error) {
    if (error.status === 401) {
      localStorage.removeItem('nayl-business-token');
      state.token = '';
      state.business = null;
      showAuth();
    } else if (!quiet) showToast(error.message, 'error');
  }
}

async function login(event) {
  event.preventDefault();
  const button = el('login-submit');
  setBusy(button, true, t('signingIn'));
  try {
    const output = await api('/api/business/login', { method: 'POST', body: { email: el('login-email').value, password: el('login-password').value } });
    state.token = output.token;
    localStorage.setItem('nayl-business-token', state.token);
    await loadDashboard();
  } catch (error) {
    showToast(`${t('loginFailed')}: ${error.message}`, 'error');
  } finally { setBusy(button, false); }
}

async function register(event) {
  event.preventDefault();
  const button = el('register-submit');
  setBusy(button, true, t('creating'));
  try {
    const output = await api('/api/business/register', {
      method: 'POST',
      body: {
        name: el('business-name').value,
        nameAr: el('business-name-ar').value,
        email: el('register-email').value,
        password: el('register-password').value,
        phone: el('business-phone').value,
        website: el('business-website').value,
        market: el('business-market').value,
        priceFrom: el('business-price').value || null,
        serviceAreas: selectedValues(el('business-cities')),
        categories: selectedValues(el('business-categories')),
        description: el('business-description').value
      }
    });
    state.token = output.token;
    localStorage.setItem('nayl-business-token', state.token);
    showToast(t('accountCreated'));
    await loadDashboard();
  } catch (error) {
    showToast(`${t('registrationFailed')}: ${error.message}`, 'error');
  } finally { setBusy(button, false); }
}

function openQuote(opportunity) {
  state.selectedOpportunity = opportunity;
  el('quote-opportunity').innerHTML = `<span class="request-card__id">${escapeHtml(opportunity.id)} · ${escapeHtml(opportunity.city)}</span><h3>${escapeHtml(opportunity.query)}</h3><p class="muted">${escapeHtml(opportunity.details || '')}</p>`;
  el('quote-currency').value = opportunity.currency;
  el('quote-amount').value = opportunity.ownQuote?.amount ?? '';
  el('quote-available').value = opportunity.ownQuote?.availableAt || '';
  el('quote-message').value = opportunity.ownQuote?.message || '';
  el('quote-valid').value = opportunity.ownQuote?.validUntil ? new Date(opportunity.ownQuote.validUntil).toISOString().slice(0,16) : '';
  el('quote-submit').textContent = opportunity.ownQuote ? t('updatingQuote') : t('sendQuote');
  openDialog(el('quote-dialog'));
}

async function submitQuote(event) {
  event.preventDefault();
  const button = el('quote-submit');
  setBusy(button, true, t('sending'));
  try {
    await api(`/api/business/opportunities/${encodeURIComponent(state.selectedOpportunity.id)}/quotes`, {
      token: state.token,
      method: 'POST',
      body: {
        amount: el('quote-amount').value,
        currency: el('quote-currency').value,
        availableAt: el('quote-available').value,
        validUntil: el('quote-valid').value ? new Date(el('quote-valid').value).toISOString() : null,
        message: el('quote-message').value
      }
    });
    closeDialog(el('quote-dialog'));
    showToast(t('quoteSent'));
    await loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  } finally { setBusy(button, false); }
}

async function saveProfile(event) {
  event.preventDefault();
  const button = el('profile-submit');
  setBusy(button, true, t('saving'));
  try {
    const output = await api('/api/business/me', {
      token: state.token,
      method: 'PUT',
      body: {
        name: el('profile-name').value,
        phone: el('profile-phone').value,
        website: el('profile-website').value,
        priceFrom: el('profile-price').value || null,
        description: el('profile-description').value,
        acceptingLeads: el('profile-accepting').checked
      }
    });
    state.business = output.business;
    renderDashboard();
    showToast(t('profileSaved'));
  } catch (error) {
    showToast(error.message, 'error');
  } finally { setBusy(button, false); }
}

async function init() {
  setLocale(state.locale);
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.innerHTML ||= icon('close');
    button.addEventListener('click', () => closeDialog(el('quote-dialog')));
  });
  el('refresh-business').innerHTML = icon('refresh');
  el('login-tab').addEventListener('click', () => showAuth('login'));
  el('register-tab').addEventListener('click', () => showAuth('register'));
  el('login-form').addEventListener('submit', login);
  el('register-form').addEventListener('submit', register);
  el('business-market').addEventListener('change', renderRegistrationCities);
  el('quote-form').addEventListener('submit', submitQuote);
  el('profile-form').addEventListener('submit', saveProfile);
  el('refresh-business').addEventListener('click', () => loadDashboard());
  el('language-button').addEventListener('click', () => {
    state.locale = state.locale === 'en' ? 'ar' : 'en';
    translateStatic();
    renderRegistrationOptions();
  });
  el('logout-button').addEventListener('click', () => {
    localStorage.removeItem('nayl-business-token');
    state.token = '';
    state.business = null;
    showAuth();
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="open-quote"]');
    if (target) openQuote(state.opportunities[Number(target.dataset.index)]);
  });

  try {
    state.config = await api('/api/config');
    renderRegistrationOptions();
    translateStatic();
    if (state.token) await loadDashboard();
    else showAuth();
    setInterval(() => state.token && loadDashboard({ quiet: true }), 25_000);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

init();
