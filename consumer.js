import {
  api,
  closeDialog,
  ensureConsumerSession,
  escapeHtml,
  formatDate,
  formatMoney,
  getLocale,
  icon,
  openDialog,
  setBusy,
  setLocale,
  showToast
} from './shared.js';

const copy = {
  en: {
    heroEyebrow: 'GCC AI buyer · live sources',
    heroTitle: 'Buy the <span>outcome.</span><br>Skip the hunt.',
    heroCopy: 'Describe what you need. NAYL interprets the request, checks configured live sources, and opens one quote request that businesses can answer.',
    placeholder: 'I need a reliable AC technician in Dubai today under AED 350',
    deep: 'Deep search',
    buyerSignal: 'Buyer signal',
    ready: 'Ready', signalClarity: 'Signal clarity', options: 'Options', liveSources: 'Live sources', requests: 'Requests',
    resultsEyebrow: 'Sourced options', resultsTitle: 'Best paths found',
    requestsEyebrow: 'Live marketplace loop', requestsTitle: 'Your quote requests', refresh: 'Refresh',
    liveNetwork: 'Live buyer network', localStorage: 'Local storage mode',
    category: 'Category', city: 'City', budget: 'Budget', urgency: 'Urgency', confidence: 'Confidence',
    requestQuote: 'Request quote', openSource: 'Open source', source: 'Source', match: 'match',
    noResults: 'No live source returned a direct result. You can still open a request and route it to matching NAYL businesses.',
    openRequest: 'Open quote request', noRequests: 'Your real quote requests will appear here. Search above and press Request quote to start.',
    open: 'Open', quoted: 'Quotes received', booked: 'Booked', cancelled: 'Cancelled',
    matched: 'matched businesses', quote: 'quote', quotes: 'quotes', created: 'Created',
    accept: 'Accept quote', accepting: 'Confirming…', cancelRequest: 'Cancel request',
    requestCreated: 'Request created and routed to matching businesses.', requestCancelled: 'Request cancelled.', bookingConfirmed: 'Booking confirmed.',
    dialogEyebrow: 'Open a real request', dialogTitle: 'Get competing quotes',
    name: 'Your name', email: 'Email', phone: 'Phone (optional)', details: 'Extra details',
    detailsPlaceholder: 'Scope, preferred timing, property size, or anything a provider should know',
    cancel: 'Cancel', create: 'Create request', creating: 'Creating…',
    from: 'From', checkAvailability: 'Check availability', flexible: 'Flexible', now: 'Now', today: 'Today', tomorrow: 'Tomorrow', weekend: 'Weekend', 'this-week': 'This week',
    disclosure: 'External results open their original source. Quote requests are handled by registered NAYL businesses.',
    search: 'Searching…', deepSearching: 'Researching live web…', searchError: 'Search failed',
    notConfigured: 'not configured', skipped: 'not used', live: 'live', error: 'error', local: 'local',
    provider: 'Provider', availability: 'Availability', validUntil: 'Valid until', bookingId: 'Booking',
    requestId: 'Request', pendingQuotes: 'Waiting for businesses to reply', sourceResult: 'Started from', researchSources: 'Research sources',
    marketplaceRouting: 'This verified NAYL business is prioritized, and the demand is also available to other matching verified NAYL businesses.',
    externalRouting: 'This external source is reference context only. NAYL sends the request to matching registered NAYL businesses; the external provider is not contacted unless it is registered with NAYL.',
    generalRouting: 'NAYL sends this request to matching registered and verified NAYL businesses.'
  },
  ar: {
    heroEyebrow: 'مشتري ذكي للخليج · مصادر مباشرة',
    heroTitle: 'اشترِ <span>النتيجة.</span><br>واترك البحث لنا.',
    heroCopy: 'اكتب ما تحتاجه. يفهم NAYL الطلب، يبحث في المصادر المفعلة، ويفتح طلب عرض سعر حقيقي يمكن للشركات الرد عليه.',
    placeholder: 'أحتاج فني تكييف موثوق في دبي اليوم بميزانية 350 درهم',
    deep: 'بحث معمّق',
    buyerSignal: 'وضوح الطلب', ready: 'جاهز', signalClarity: 'وضوح الإشارة', options: 'الخيارات', liveSources: 'مصادر مباشرة', requests: 'الطلبات',
    resultsEyebrow: 'خيارات موثقة المصدر', resultsTitle: 'أفضل المسارات',
    requestsEyebrow: 'دورة السوق المباشرة', requestsTitle: 'طلبات عروض السعر', refresh: 'تحديث',
    liveNetwork: 'شبكة شراء مباشرة', localStorage: 'تخزين محلي',
    category: 'الفئة', city: 'المدينة', budget: 'الميزانية', urgency: 'الوقت', confidence: 'الثقة',
    requestQuote: 'اطلب عرض سعر', openSource: 'افتح المصدر', source: 'المصدر', match: 'تطابق',
    noResults: 'لم يُرجع أي مصدر مباشر نتيجة محددة. يمكنك مع ذلك فتح طلب وإرساله إلى شركات NAYL المطابقة.',
    openRequest: 'افتح طلب عرض سعر', noRequests: 'ستظهر طلباتك الحقيقية هنا. ابحث أعلاه ثم اضغط اطلب عرض سعر.',
    open: 'مفتوح', quoted: 'وصلت عروض', booked: 'تم الحجز', cancelled: 'ملغي',
    matched: 'شركة مطابقة', quote: 'عرض', quotes: 'عروض', created: 'أُنشئ',
    accept: 'اقبل العرض', accepting: 'جارٍ التأكيد…', cancelRequest: 'إلغاء الطلب',
    requestCreated: 'تم إنشاء الطلب وإرساله إلى الشركات المطابقة.', requestCancelled: 'تم إلغاء الطلب.', bookingConfirmed: 'تم تأكيد الحجز.',
    dialogEyebrow: 'افتح طلباً حقيقياً', dialogTitle: 'احصل على عروض منافسة',
    name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف (اختياري)', details: 'تفاصيل إضافية',
    detailsPlaceholder: 'النطاق، الوقت المفضل، حجم العقار، أو أي معلومة يحتاجها المزود',
    cancel: 'إلغاء', create: 'إنشاء الطلب', creating: 'جارٍ الإنشاء…',
    from: 'ابتداءً من', checkAvailability: 'تحقق من التوفر', flexible: 'مرن', now: 'الآن', today: 'اليوم', tomorrow: 'غداً', weekend: 'نهاية الأسبوع', 'this-week': 'هذا الأسبوع',
    disclosure: 'تفتح النتائج الخارجية مصدرها الأصلي. تعالج شركات NAYL المسجلة طلبات عروض السعر.',
    search: 'جارٍ البحث…', deepSearching: 'جارٍ البحث المعمّق…', searchError: 'تعذر البحث',
    notConfigured: 'غير مفعّل', skipped: 'لم يُستخدم', live: 'مباشر', error: 'خطأ', local: 'محلي',
    provider: 'المزود', availability: 'التوفر', validUntil: 'صالح حتى', bookingId: 'الحجز',
    requestId: 'الطلب', pendingQuotes: 'بانتظار رد الشركات', sourceResult: 'بدأ من', researchSources: 'مصادر البحث',
    marketplaceRouting: 'ستُعطى هذه الشركة الموثقة في NAYL الأولوية، وسيكون الطلب متاحاً أيضاً للشركات الموثقة المطابقة الأخرى.',
    externalRouting: 'هذا المصدر الخارجي مرجع فقط. يرسل NAYL الطلب إلى الشركات المسجلة والموثقة المطابقة، ولا يتواصل مع المزود الخارجي ما لم يكن مسجلاً في NAYL.',
    generalRouting: 'يرسل NAYL هذا الطلب إلى الشركات المسجلة والموثقة المطابقة.'
  }
};

const el = (id) => document.getElementById(id);
const state = {
  locale: getLocale(),
  config: null,
  token: null,
  search: null,
  requests: [],
  selectedResult: null
};

function t(key) { return copy[state.locale][key] ?? copy.en[key] ?? key; }

function translateStatic() {
  setLocale(state.locale);
  el('language-button').textContent = state.locale === 'en' ? 'العربية' : 'English';
  el('hero-eyebrow').textContent = t('heroEyebrow');
  el('hero-title').innerHTML = t('heroTitle');
  el('hero-copy').textContent = t('heroCopy');
  el('query-input').placeholder = t('placeholder');
  el('deep-label').textContent = t('deep');
  el('pulse-label').textContent = t('buyerSignal');
  el('pulse-unit').textContent = t('signalClarity');
  el('pulse-results-label').textContent = t('options');
  el('pulse-live-label').textContent = t('liveSources');
  el('pulse-requests-label').textContent = t('requests');
  el('results-eyebrow').textContent = t('resultsEyebrow');
  el('results-title').textContent = t('resultsTitle');
  el('requests-eyebrow').textContent = t('requestsEyebrow');
  el('requests-title').textContent = t('requestsTitle');
  el('refresh-requests').innerHTML = `${icon('refresh', 15)} ${t('refresh')}`;
  el('dialog-eyebrow').textContent = t('dialogEyebrow');
  el('dialog-title').textContent = t('dialogTitle');
  el('contact-name-label').textContent = t('name');
  el('contact-email-label').textContent = t('email');
  el('contact-phone-label').textContent = t('phone');
  el('request-details-label').textContent = t('details');
  el('request-details').placeholder = t('detailsPlaceholder');
  el('dialog-cancel').textContent = t('cancel');
  el('submit-request').textContent = t('create');
  el('footer-disclosure').textContent = t('disclosure');
  document.title = state.locale === 'ar' ? 'NAYL — اشترِ النتيجة' : 'NAYL — Buy the outcome';
  renderMarketControls();
  renderSearch();
  renderRequests();
}

function marketName(market) { return state.locale === 'ar' ? market.nameAr : market.name; }
function cityName(city) { return state.locale === 'ar' ? city.nameAr : city.name; }
function categoryName(id) {
  const item = state.config?.categories.find((category) => category.id === id);
  return item ? (state.locale === 'ar' ? item.labelAr : item.label) : id;
}
function urgencyName(value) { return t(value || 'flexible'); }
function statusName(value) { return t(value) || value; }

function renderMarketControls() {
  if (!state.config) return;
  const marketSelect = el('market-select');
  const previousMarket = marketSelect.value || state.config.defaults.market;
  marketSelect.innerHTML = state.config.markets.map((market) => `<option value="${market.code}">${escapeHtml(marketName(market))} · ${market.currency}</option>`).join('');
  marketSelect.value = state.config.markets.some((market) => market.code === previousMarket) ? previousMarket : state.config.defaults.market;
  renderCities();
}

function renderCities() {
  if (!state.config) return;
  const market = state.config.markets.find((item) => item.code === el('market-select').value) || state.config.markets[0];
  const citySelect = el('city-select');
  const previous = citySelect.value || state.config.defaults.city;
  citySelect.innerHTML = market.cities.map((city) => `<option value="${escapeHtml(city.name)}">${escapeHtml(cityName(city))}</option>`).join('');
  citySelect.value = market.cities.some((city) => city.name === previous) ? previous : market.cities[0]?.name;
}

function connectorStatusLabel(status) {
  if (status === 'live' || status === 'ready') return t('live');
  if (status === 'error') return t('error');
  if (status === 'skipped') return t('skipped');
  if (status === 'local-only') return t('local');
  return t('notConfigured');
}

function updateTopStatus() {
  if (!state.config) return;
  const storageLocal = state.config.storageMode !== 'supabase-postgres';
  el('live-status').className = `status-pill${storageLocal ? ' status-pill--warning' : ''}`;
  el('live-status').innerHTML = `<span class="status-pill__dot"></span><span>${storageLocal ? t('localStorage') : t('liveNetwork')}</span>`;
}

function renderPulse() {
  const confidence = state.search?.intent?.confidence || 72;
  const results = state.search?.resultCount || 0;
  const live = state.search?.connectors?.filter((item) => item.status === 'live').length
    || state.config?.connectors?.filter((item) => item.mode === 'live').length
    || 0;
  el('pulse-ring').style.setProperty('--value', confidence);
  el('pulse-value').textContent = confidence;
  el('pulse-results').textContent = results;
  el('pulse-live').textContent = live;
  el('pulse-requests').textContent = state.requests.length;
  el('pulse-mode').textContent = state.search?.intent?.aiEnhanced ? 'OPENAI' : t('ready');
}

function renderSearch() {
  renderPulse();
  if (!state.search) return;
  el('results-section').classList.remove('hidden');
  el('search-summary').textContent = state.search.summary || '';
  const intent = state.search.intent;
  el('intent-strip').innerHTML = `
    <div class="intent-cell"><span>${t('category')}</span><strong>${escapeHtml(categoryName(intent.category))}</strong></div>
    <div class="intent-cell"><span>${t('city')}</span><strong>${escapeHtml(intent.cityLabel || intent.city)}</strong></div>
    <div class="intent-cell"><span>${t('budget')}</span><strong>${intent.budget ? formatMoney(intent.budget, intent.currency, state.locale) : '—'}</strong></div>
    <div class="intent-cell"><span>${t('urgency')}</span><strong>${escapeHtml(urgencyName(intent.urgency))}</strong></div>
    <div class="intent-cell"><span>${t('confidence')}</span><strong>${intent.confidence}%</strong></div>`;
  el('connector-rail').innerHTML = state.search.connectors.map((connector) => `
    <span class="connector-chip" data-status="${escapeHtml(connector.status)}" title="${escapeHtml(connector.message || connector.description || '')}">
      ${escapeHtml(connector.name)} · ${escapeHtml(connectorStatusLabel(connector.status))}${connector.durationMs ? ` · ${connector.durationMs}ms` : ''}
    </span>`).join('');

  const sourceList = el('deep-source-list');
  const sources = (state.search.sources || []).filter((source) => source.url).slice(0, 12);
  sourceList.classList.toggle('hidden', sources.length === 0);
  sourceList.innerHTML = sources.length
    ? `<strong>${escapeHtml(t('researchSources'))}</strong><div>${sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title || source.domain || source.url)}</a>`).join('')}</div>`
    : '';

  const results = state.search.results || [];
  if (!results.length) {
    el('result-grid').innerHTML = `<div class="empty-state"><p>${escapeHtml(t('noResults'))}</p><button class="primary-button" type="button" data-action="request-empty">${icon('quote')} ${escapeHtml(t('openRequest'))}</button></div>`;
    return;
  }
  el('result-grid').innerHTML = results.map((result, index) => {
    const meta = [
      result.rating ? `${result.rating.toFixed(1)} ★${result.reviews ? ` · ${result.reviews}` : ''}` : '',
      result.availability || '',
      result.priceLabel || ''
    ].filter(Boolean);
    return `<article class="result-card">
      <div class="result-card__top"><span class="source-tag">${escapeHtml(result.source)}</span><strong class="match-score">${result.score}%</strong></div>
      <h3>${escapeHtml(result.title)}</h3>
      <p class="result-card__description">${escapeHtml(result.subtitle || '')}</p>
      <div class="result-card__meta">${meta.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join('')}</div>
      <div class="result-card__price"><div><span class="muted">${escapeHtml(result.attribution || result.source)}</span><strong>${result.price ? formatMoney(result.price, result.currency, state.locale) : (result.priceLabel || t('checkAvailability'))}</strong></div><span class="source-tag">${result.sourceType}</span></div>
      <div class="result-card__actions">
        <button class="primary-button" type="button" data-action="request-result" data-index="${index}">${icon('quote')} ${escapeHtml(t('requestQuote'))}</button>
        ${result.url ? `<a class="icon-button" href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t('openSource'))}" title="${escapeHtml(t('openSource'))}">${icon('external')}</a>` : ''}
      </div>
    </article>`;
  }).join('');
}

function renderRequests() {
  renderPulse();
  const root = el('request-list');
  if (!state.requests.length) {
    root.innerHTML = `<div class="empty-state">${escapeHtml(t('noRequests'))}</div>`;
    return;
  }
  root.innerHTML = state.requests.map((request) => {
    const quoteLabel = `${request.quotes.length} ${request.quotes.length === 1 ? t('quote') : t('quotes')}`;
    const quotes = request.quotes.length ? `<div class="quote-list">${request.quotes.map((quote) => `
      <article class="quote-card">
        <div><strong>${escapeHtml(quote.providerName)}</strong><p>${escapeHtml(quote.message)}<br>${escapeHtml(t('availability'))}: ${escapeHtml(quote.availableAt)}${quote.validUntil ? ` · ${escapeHtml(t('validUntil'))}: ${escapeHtml(formatDate(quote.validUntil, state.locale))}` : ''}</p></div>
        <div class="quote-card__amount"><strong>${formatMoney(quote.amount, quote.currency, state.locale)}</strong>${request.status !== 'booked' && quote.status === 'submitted' ? `<button class="primary-button button--small" type="button" data-action="accept-quote" data-request="${request.id}" data-quote="${quote.id}">${escapeHtml(t('accept'))}</button>` : `<span class="status-badge" data-status="${quote.status}">${escapeHtml(quote.status)}</span>`}</div>
      </article>`).join('')}</div>` : `<p class="muted">${escapeHtml(t('pendingQuotes'))}</p>`;
    return `<article class="request-card">
      <div class="request-card__header"><div><span class="request-card__id">${escapeHtml(t('requestId'))} · ${escapeHtml(request.id)}</span><h3>${escapeHtml(request.query)}</h3></div><span class="status-badge" data-status="${escapeHtml(request.status)}">${escapeHtml(statusName(request.status))}</span></div>
      <div class="request-card__facts"><span>${escapeHtml(categoryName(request.category))}</span><span>${escapeHtml(request.city)}</span><span>${request.budget ? formatMoney(request.budget, request.currency, state.locale) : '—'}</span><span>${quoteLabel}</span><span>${escapeHtml(t('created'))} ${escapeHtml(formatDate(request.createdAt, state.locale))}</span></div>
      ${request.sourceResult?.title ? `<p class="muted">${escapeHtml(t('sourceResult'))}: ${escapeHtml(request.sourceResult.title)} · ${escapeHtml(request.sourceResult.source || '')}</p>` : ''}
      ${quotes}
      <div class="inline-actions" style="margin-top:16px">${!['booked','cancelled'].includes(request.status) ? `<button class="danger-button button--small" type="button" data-action="cancel-request" data-request="${request.id}">${escapeHtml(t('cancelRequest'))}</button>` : ''}${request.bookingId ? `<span class="chip">${escapeHtml(t('bookingId'))}: ${escapeHtml(request.bookingId)}</span>` : ''}</div>
    </article>`;
  }).join('');
}

async function loadRequests({ quiet = false } = {}) {
  if (!state.token) return;
  try {
    const payload = await api('/api/consumer/requests', { token: state.token });
    state.requests = payload.requests || [];
    renderRequests();
  } catch (error) {
    if (error.status === 401) {
      localStorage.removeItem('nayl-consumer-token');
      state.token = await ensureConsumerSession();
      return loadRequests({ quiet });
    }
    if (!quiet) showToast(error.message, 'error');
  }
}

function openQuoteRequest(result) {
  state.selectedResult = result || null;
  const search = state.search;
  el('selected-result-summary').innerHTML = `<span class="source-tag">${escapeHtml(result?.source || 'NAYL demand network')}</span><h3>${escapeHtml(result?.title || search?.query || el('query-input').value)}</h3><p class="muted">${escapeHtml(result?.subtitle || search?.summary || '')}</p>`;
  el('quote-routing-disclosure').textContent = result?.sourceType === 'marketplace'
    ? t('marketplaceRouting')
    : result
      ? t('externalRouting')
      : t('generalRouting');
  const contact = JSON.parse(localStorage.getItem('nayl-contact') || '{}');
  el('contact-name').value = contact.name || '';
  el('contact-email').value = contact.email || '';
  el('contact-phone').value = contact.phone || '';
  openDialog(el('quote-dialog'));
}

async function submitSearch(event) {
  event.preventDefault();
  const query = el('query-input').value.trim();
  if (!query) return;
  const button = el('search-button');
  setBusy(button, true, el('deep-toggle').checked ? t('deepSearching') : t('search'));
  try {
    state.search = await api('/api/search', {
      method: 'POST',
      body: {
        query,
        market: el('market-select').value,
        city: el('city-select').value,
        locale: state.locale,
        deep: el('deep-toggle').checked
      }
    });
    renderSearch();
    el('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showToast(`${t('searchError')}: ${error.message}`, 'error');
  } finally {
    setBusy(button, false);
  }
}

async function createRequest(event) {
  event.preventDefault();
  if (!state.search) return;
  const button = el('submit-request');
  setBusy(button, true, t('creating'));
  const contact = { name: el('contact-name').value.trim(), email: el('contact-email').value.trim(), phone: el('contact-phone').value.trim() };
  try {
    const intent = state.search.intent;
    await api('/api/consumer/requests', {
      token: state.token,
      method: 'POST',
      body: {
        contact,
        query: state.search.query,
        category: intent.category,
        market: intent.market,
        city: intent.city,
        budget: intent.budget,
        urgency: intent.urgency,
        details: el('request-details').value.trim(),
        sourceResult: state.selectedResult
      }
    });
    localStorage.setItem('nayl-contact', JSON.stringify(contact));
    closeDialog(el('quote-dialog'));
    el('request-details').value = '';
    await loadRequests();
    showToast(t('requestCreated'));
    el('requests').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setBusy(button, false);
  }
}

async function acceptQuote(requestId, quoteId, button) {
  setBusy(button, true, t('accepting'));
  try {
    await api(`/api/consumer/requests/${encodeURIComponent(requestId)}/accept`, { token: state.token, method: 'POST', body: { quoteId } });
    await loadRequests();
    showToast(t('bookingConfirmed'));
  } catch (error) {
    showToast(error.message, 'error');
    setBusy(button, false);
  }
}

async function cancelRequest(requestId, button) {
  if (!confirm(t('cancelRequest') + '?')) return;
  setBusy(button, true, t('cancel'));
  try {
    await api(`/api/consumer/requests/${encodeURIComponent(requestId)}/cancel`, { token: state.token, method: 'POST', body: {} });
    await loadRequests();
    showToast(t('requestCancelled'));
  } catch (error) {
    showToast(error.message, 'error');
    setBusy(button, false);
  }
}

async function init() {
  state.locale = getLocale();
  setLocale(state.locale);
  el('search-button').innerHTML = icon('arrow', 22);
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.innerHTML ||= icon('close');
    button.addEventListener('click', () => closeDialog(el('quote-dialog')));
  });
  el('search-form').addEventListener('submit', submitSearch);
  el('quote-request-form').addEventListener('submit', createRequest);
  el('market-select').addEventListener('change', renderCities);
  el('language-button').addEventListener('click', () => {
    state.locale = state.locale === 'en' ? 'ar' : 'en';
    translateStatic();
  });
  el('refresh-requests').addEventListener('click', () => loadRequests());
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'request-result') openQuoteRequest(state.search?.results?.[Number(target.dataset.index)]);
    if (action === 'request-empty') openQuoteRequest(null);
    if (action === 'accept-quote') acceptQuote(target.dataset.request, target.dataset.quote, target);
    if (action === 'cancel-request') cancelRequest(target.dataset.request, target);
  });

  try {
    [state.config, state.token] = await Promise.all([api('/api/config'), ensureConsumerSession()]);
    updateTopStatus();
    translateStatic();
    await loadRequests();
    if (location.hash === '#requests') el('requests').scrollIntoView();
    setInterval(() => loadRequests({ quiet: true }), 20_000);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

init();
