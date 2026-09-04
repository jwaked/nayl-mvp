import { translations } from './i18n.js';

const app = document.querySelector('#app');
const nav = document.querySelector('#portal-nav');
const headerActions = document.querySelector('#header-actions');
const footer = document.querySelector('#app-footer');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const brandCaption = document.querySelector('#brand-caption');

const allowedRoutes = new Set(['consumer', 'business', 'admin']);
const consumerId = localStorage.getItem('nayl-consumer-id') || 'demo-consumer';
localStorage.setItem('nayl-consumer-id', consumerId);

const state = {
  route: getRoute(),
  locale: localStorage.getItem('nayl-locale') === 'ar' ? 'ar' : 'en',
  config: null,
  market: null,
  city: null,
  query: localStorage.getItem('nayl-last-query') || '',
  search: null,
  searchLoading: false,
  sourceFilter: 'all',
  saved: readJsonStorage('nayl-saved-results', []),
  requests: [],
  requestsLoading: true,
  business: {
    profile: null,
    kpis: null,
    opportunities: [],
    loading: false
  },
  admin: {
    overview: null,
    loading: false
  }
};

const iconPaths = {
  search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.4-3.4"></path>',
  globe: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  wallet: '<path d="M4 7a3 3 0 0 1 3-3h12v16H7a3 3 0 0 1-3-3V7Z"></path><path d="M4 8h15M15 12h6v4h-6a2 2 0 0 1 0-4Z"></path>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  spark: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"></path><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"></path>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"></path>',
  external: '<path d="M14 4h6v6M10 14 20 4"></path><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"></path>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"></path>',
  source: '<path d="M5 5h14v14H5z"></path><path d="M8 9h8M8 13h5"></path>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path>',
  check: '<path d="m5 12 4 4L19 6"></path>',
  close: '<path d="m6 6 12 12M18 6 6 18"></path>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"></path>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
  shield: '<path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-5"></path>',
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
  edit: '<path d="m4 16-1 5 5-1L19 9l-4-4L4 16Z"></path><path d="m13 7 4 4"></path>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"></path><path d="M6.1 9A7 7 0 0 1 18 6l2 6M17.9 15A7 7 0 0 1 6 18l-2-6"></path>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"></path><path d="M12 9v5M12 17h.01"></path>',
  info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"></path>',
  chevron: '<path d="m9 18 6-6-6-6"></path>'
};

function icon(name, size = 18) {
  const path = iconPaths[name] || iconPaths.info;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function getRoute() {
  const route = window.location.hash.replace(/^#/, '').split('?')[0] || 'consumer';
  return allowedRoutes.has(route) ? route : 'consumer';
}

function readJsonStorage(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function t(key) {
  return translations[state.locale]?.[key] ?? translations.en[key] ?? key;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNumber(value, options = {}) {
  return new Intl.NumberFormat(state.locale === 'ar' ? 'ar-AE' : 'en-AE', options).format(value ?? 0);
}

function formatMoney(amount, currency) {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(state.locale === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency,
      maximumFractionDigits: ['KWD', 'BHD', 'OMR'].includes(currency) ? 3 : 0
    }).format(amount);
  } catch {
    return `${currency} ${formatNumber(amount)}`;
  }
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(state.locale === 'ar' ? 'ar-AE' : 'en-AE', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function categoryLabel(categoryId) {
  const category = state.config?.categories.find((item) => item.id === categoryId);
  if (!category) return categoryId || '—';
  return state.locale === 'ar' ? category.labelAr : category.label;
}

function marketLabel(marketCode) {
  const market = state.config?.markets.find((item) => item.code === marketCode);
  if (!market) return marketCode || '—';
  return state.locale === 'ar' ? market.nameAr : market.name;
}

function cityLabel(marketCode, cityName) {
  const market = state.config?.markets.find((item) => item.code === marketCode);
  const city = market?.cities.find((item) => item.name === cityName);
  if (!city) return cityName || '—';
  return state.locale === 'ar' ? city.nameAr : city.name;
}

function urgencyLabel(value) {
  const keys = {
    now: 'now',
    today: 'today',
    tomorrow: 'tomorrow',
    weekend: 'weekend',
    'this-week': 'thisWeek',
    flexible: 'flexible'
  };
  return t(keys[value] || 'flexible');
}

function modeLabel(value) {
  const labels = {
    live: t('live'),
    'live-mvp': t('liveMvp'),
    demo: t('demo'),
    'not-configured': t('notConfigured'),
    error: t('error'),
    ready: t('live')
  };
  return labels[value] || value;
}

function requestStatusLabel(value) {
  if (value === 'booked') return t('booked');
  if (value === 'quoted') return t('quoted');
  return t('open');
}

function rolloutLabel(value) {
  const labels = {
    'live-mvp': t('rolloutLive'),
    'pilot-ready': t('rolloutPilot'),
    planned: t('rolloutPlanned'),
    discovery: t('rolloutDiscovery')
  };
  return labels[value] || value;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed with status ${response.status}`);
  }
  return payload;
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' is-error' : ''}`;
  toast.innerHTML = `
    <div class="toast-icon">${icon(isError ? 'alert' : 'check', 15)}</div>
    <p>${escapeHtml(message)}</p>
  `;
  toastRoot.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function renderChrome() {
  document.documentElement.lang = state.locale;
  document.documentElement.dir = state.locale === 'ar' ? 'rtl' : 'ltr';
  document.title = `NAYL — ${t(state.route)}`;
  brandCaption.textContent = t('brandCaption');

  nav.innerHTML = ['consumer', 'business', 'admin'].map((route) => `
    <button class="nav-button${state.route === route ? ' is-active' : ''}" type="button" data-action="navigate" data-route="${route}">
      ${escapeHtml(t(route))}
    </button>
  `).join('');

  const nextLocaleLabel = state.locale === 'en' ? t('arabic') : t('english');
  headerActions.innerHTML = `
    <button class="language-button" type="button" data-action="toggle-language" aria-label="${escapeHtml(nextLocaleLabel)}">
      <span class="language-icon">${state.locale === 'en' ? 'ع' : 'EN'}</span>
      <span>${escapeHtml(nextLocaleLabel)}</span>
    </button>
  `;
  footer.textContent = t('footer');
}

function currentMarket() {
  return state.config?.markets.find((market) => market.code === state.market) || state.config?.markets[0];
}

function marketOptions() {
  return state.config.markets.map((market) => `
    <option value="${market.code}"${market.code === state.market ? ' selected' : ''}>
      ${escapeHtml(state.locale === 'ar' ? market.nameAr : market.name)} · ${market.currency}
    </option>
  `).join('');
}

function cityOptions() {
  const market = currentMarket();
  return (market?.cities || []).map((city) => `
    <option value="${escapeHtml(city.name)}"${city.name === state.city ? ' selected' : ''}>
      ${escapeHtml(state.locale === 'ar' ? city.nameAr : city.name)}
    </option>
  `).join('');
}

function renderConsumer() {
  const query = state.query || t('searchPromptCleaning');
  const searchSection = renderConsumerResults();

  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">${escapeHtml(t('consumerEyebrow'))}</p>
        <h1>${escapeHtml(t('consumerTitle'))}</h1>
        <p class="hero-description">${escapeHtml(t('consumerSubtitle'))}</p>

        <form id="search-form" class="search-console">
          <div class="search-row">
            <textarea id="search-query" class="search-input" name="query" rows="2" maxlength="800" placeholder="${escapeHtml(t('searchPlaceholder'))}">${escapeHtml(query)}</textarea>
            <button class="search-button" type="submit"${state.searchLoading ? ' disabled' : ''}>
              ${state.searchLoading ? '<span class="spinner"></span>' : icon('search', 20)}
              <span>${escapeHtml(t('searchButton'))}</span>
            </button>
          </div>
          <div class="context-row">
            <div class="context-control">
              <label for="market-select">${escapeHtml(t('market'))}</label>
              <select id="market-select" name="market">${marketOptions()}</select>
            </div>
            <div class="context-control">
              <label for="city-select">${escapeHtml(t('city'))}</label>
              <select id="city-select" name="city">${cityOptions()}</select>
            </div>
          </div>
        </form>

        <div class="quick-prompts">
          <span class="quick-label">${escapeHtml(t('quickStarts'))}</span>
          ${['searchPromptCleaning', 'searchPromptAc', 'searchPromptMove', 'searchPromptPhoto'].map((key) => `
            <button type="button" class="prompt-chip" data-action="quick-search" data-prompt-key="${key}">${escapeHtml(t(key))}</button>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="content-grid">
      <div class="main-column">${searchSection}</div>
      <aside class="side-column">
        ${renderRequestsPanel()}
        ${renderSavedPanel()}
      </aside>
    </section>
  `;
}

function renderConsumerResults() {
  if (state.searchLoading) {
    return `
      <section class="panel connector-strip" aria-label="${escapeHtml(t('sourceHealth'))}">
        ${state.config.connectors.map((connector) => renderConnectorChip({ ...connector, status: connector.mode })).join('')}
      </section>
      <div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
    `;
  }

  if (!state.search) {
    return `
      <section class="panel empty-state">
        <div class="empty-icon">${icon('spark', 22)}</div>
        <h3>${escapeHtml(t('consumerTitle'))}</h3>
        <p>${escapeHtml(t('consumerSubtitle'))}</p>
      </section>
    `;
  }

  const intent = state.search.intent;
  const availableTypes = [...new Set(state.search.results.map((result) => result.sourceType))];
  const filtered = state.sourceFilter === 'all'
    ? state.search.results
    : state.search.results.filter((result) => result.sourceType === state.sourceFilter);

  return `
    <section class="panel intent-panel">
      <div class="intent-topline">
        <h2>${escapeHtml(t('interpretedAs'))}</h2>
        <div class="confidence-meter">
          <span>${escapeHtml(t('confidence'))}: ${formatNumber(intent.confidence)}%</span>
          <span class="meter-track"><span class="meter-fill" style="width:${Math.max(0, Math.min(100, intent.confidence))}%"></span></span>
        </div>
      </div>
      <div class="intent-chips">
        <span class="intent-chip">${icon('spark', 14)} ${escapeHtml(t('category'))}: <strong>${escapeHtml(categoryLabel(intent.category))}</strong></span>
        <span class="intent-chip">${icon('pin', 14)} ${escapeHtml(t('city'))}: <strong>${escapeHtml(cityLabel(intent.market, intent.city))}</strong></span>
        <span class="intent-chip">${icon('wallet', 14)} ${escapeHtml(t('budget'))}: <strong>${intent.budget ? escapeHtml(formatMoney(intent.budget, intent.currency)) : escapeHtml(t('flexible'))}</strong></span>
        <span class="intent-chip">${icon('clock', 14)} ${escapeHtml(t('urgency'))}: <strong>${escapeHtml(urgencyLabel(intent.urgency))}</strong></span>
      </div>
    </section>

    <section class="panel connector-strip" aria-label="${escapeHtml(t('sourceHealth'))}">
      ${state.search.connectors.map(renderConnectorChip).join('')}
    </section>

    <section>
      <div class="results-toolbar">
        <div>
          <h2>${formatNumber(filtered.length)} ${escapeHtml(t('results'))}</h2>
          <span class="result-count">${escapeHtml(marketLabel(intent.market))} · ${escapeHtml(cityLabel(intent.market, intent.city))}</span>
        </div>
        <div class="filter-row">
          <button class="filter-button${state.sourceFilter === 'all' ? ' is-active' : ''}" type="button" data-action="filter-source" data-source="all">${escapeHtml(t('allSources'))}</button>
          ${availableTypes.map((sourceType) => `
            <button class="filter-button${state.sourceFilter === sourceType ? ' is-active' : ''}" type="button" data-action="filter-source" data-source="${sourceType}">${escapeHtml(sourceTypeLabel(sourceType))}</button>
          `).join('')}
        </div>
      </div>
      ${filtered.length > 0
        ? `<div class="results-grid">${filtered.map(renderResultCard).join('')}</div>`
        : renderEmptyState(t('noResultsTitle'), t('noResultsText'), 'search')}
    </section>
  `;
}

function renderConnectorChip(connector) {
  const status = connector.status || connector.mode;
  return `
    <span class="connector-chip" title="${escapeHtml(connector.message || connector.description || '')}">
      <span class="status-dot ${escapeHtml(status)}"></span>
      <span>${escapeHtml(connector.name)}</span>
      <strong>${escapeHtml(modeLabel(status === 'ready' ? connector.mode : status))}</strong>
    </span>
  `;
}

function sourceTypeLabel(sourceType) {
  const labels = state.locale === 'ar'
    ? { marketplace: 'سوق NAYL', places: 'أماكن محلية', web: 'الويب المفتوح', partner: 'تطبيقات الشركاء' }
    : { marketplace: 'NAYL Marketplace', places: 'Local Places', web: 'Open Web', partner: 'Partner Apps' };
  return labels[sourceType] || sourceType;
}

function renderResultCard(result) {
  const isSaved = state.saved.some((item) => item.id === result.id);
  const isDemo = result.sourceMode === 'demo' || result.actionType === 'demo-disabled';
  const priceText = result.priceLabel || (state.locale === 'ar' ? 'السعر لدى المصدر' : 'Price on source');
  const ratingText = result.rating
    ? `${formatNumber(result.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${formatNumber(result.reviews || 0)} ${t('reviews')}`
    : (state.locale === 'ar' ? 'غير متاح' : 'Not provided');
  const availabilityText = result.availability || (state.locale === 'ar' ? 'تحقق من المصدر' : 'Check source');

  return `
    <article class="result-card${isDemo ? ' is-demo' : ''}">
      <div class="result-card-top">
        <div class="source-cluster">
          <span class="source-badge ${escapeHtml(result.sourceType)}">${escapeHtml(result.source)}</span>
          <span class="mode-badge ${escapeHtml(result.sourceMode)}">${escapeHtml(modeLabel(result.sourceMode))}</span>
        </div>
        <span class="score-badge" title="NAYL rank score">${formatNumber(result.score)}</span>
      </div>
      <h3>${escapeHtml(result.title)}</h3>
      <p class="result-subtitle">${escapeHtml(result.subtitle || '')}</p>
      <div class="result-metrics">
        <div class="metric-tile"><span>${escapeHtml(t('budget'))}</span><strong>${escapeHtml(priceText)}</strong></div>
        <div class="metric-tile"><span>${escapeHtml(t('rating'))}</span><strong>${escapeHtml(ratingText)}</strong></div>
        <div class="metric-tile"><span>${escapeHtml(t('availability'))}</span><strong>${escapeHtml(availabilityText)}</strong></div>
        <div class="metric-tile"><span>${escapeHtml(t('source'))}</span><strong>${escapeHtml(result.attribution || result.source)}</strong></div>
      </div>
      <div class="result-footer">
        <div class="attribution">${icon('source', 14)} <span>${escapeHtml(result.attribution || result.source)}</span></div>
        <div class="card-actions">
          <button class="save-button${isSaved ? ' is-saved' : ''}" type="button" data-action="toggle-save" data-result-id="${escapeHtml(result.id)}" title="${escapeHtml(isSaved ? t('saved') : t('save'))}">
            ${icon('bookmark', 18)}
          </button>
          <button class="${result.actionType === 'marketplace-request' ? 'primary-button is-teal' : 'secondary-button'}" type="button" data-action="result-action" data-result-id="${escapeHtml(result.id)}"${isDemo ? ' disabled' : ''}>
            <span>${escapeHtml(result.action)}</span>
            ${result.actionType === 'external-link' ? icon('external', 17) : icon('arrow', 17)}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderSavedPanel() {
  const items = state.saved.slice(0, 8);
  return `
    <section class="panel">
      <div class="panel-header">
        <div><h3>${escapeHtml(t('savedResults'))}</h3><p>${formatNumber(state.saved.length)} ${escapeHtml(t('saved').toLowerCase())}</p></div>
        ${icon('bookmark', 18)}
      </div>
      <div class="panel-body">
        ${items.length > 0 ? `<div class="side-list">${items.map((item) => `
          <div class="saved-item">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.source)} · ${escapeHtml(item.priceLabel || item.availability || '')}</small>
            </div>
            <button class="icon-button" type="button" data-action="remove-saved" data-result-id="${escapeHtml(item.id)}" aria-label="Remove">${icon('trash', 15)}</button>
          </div>
        `).join('')}</div>` : renderMiniEmpty(t('noSaved'), 'bookmark')}
      </div>
    </section>
  `;
}

function renderRequestsPanel() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div><h3>${escapeHtml(t('myRequests'))}</h3><p>${formatNumber(state.requests.length)} ${escapeHtml(t('marketplaceRequests').toLowerCase())}</p></div>
        ${icon('briefcase', 18)}
      </div>
      <div class="panel-body">
        ${state.requestsLoading
          ? `<div class="loading-screen" style="min-height:140px"><span class="spinner"></span><p>${escapeHtml(t('loading'))}</p></div>`
          : state.requests.length > 0
            ? `<div class="side-list">${state.requests.slice(0, 6).map(renderRequestCard).join('')}</div>`
            : renderMiniEmpty(t('noRequests'), 'briefcase')}
      </div>
    </section>
  `;
}

function renderRequestCard(request) {
  const bookedQuote = request.quotes?.find((quote) => quote.id === request.bookedQuoteId);
  return `
    <article class="request-card">
      <div class="request-head">
        <strong>${escapeHtml(request.query)}</strong>
        <span class="status-pill ${escapeHtml(request.status)}">${escapeHtml(requestStatusLabel(request.status))}</span>
      </div>
      <div class="request-meta">
        <span class="tag">${escapeHtml(categoryLabel(request.category))}</span>
        <span class="tag">${escapeHtml(cityLabel(request.market, request.city))}</span>
        <span class="tag">${request.budget ? escapeHtml(formatMoney(request.budget, request.currency)) : escapeHtml(t('flexible'))}</span>
      </div>
      ${request.quotes?.length
        ? `<div class="quote-stack">${request.quotes.map((quote) => renderConsumerQuote(request, quote)).join('')}</div>`
        : `<p class="my-quote-summary" style="margin-top:12px">${state.locale === 'ar' ? 'بانتظار عروض الأعمال المؤهلة.' : 'Waiting for qualified businesses to quote.'}</p>`}
      ${bookedQuote ? `<p class="my-quote-summary" style="margin-top:10px"><strong>${escapeHtml(t('bookedWith'))}:</strong> ${escapeHtml(bookedQuote.providerName)}</p>` : ''}
    </article>
  `;
}

function renderConsumerQuote(request, quote) {
  const selected = request.bookedQuoteId === quote.id;
  return `
    <div class="quote-card${selected ? ' is-selected' : ''}">
      <div class="quote-card-top">
        <strong>${escapeHtml(quote.providerName)}</strong>
        <span class="quote-price">${escapeHtml(formatMoney(quote.amount, quote.currency))}</span>
      </div>
      <p>${escapeHtml(quote.message)}</p>
      <span class="quote-availability">${icon('clock', 13)} ${escapeHtml(quote.availableAt)}</span>
      ${request.status !== 'booked'
        ? `<button class="ghost-button" type="button" data-action="book-quote" data-request-id="${escapeHtml(request.id)}" data-quote-id="${escapeHtml(quote.id)}">${escapeHtml(t('book'))}</button>`
        : selected ? `<span class="status-pill accepted">${escapeHtml(t('booked'))}</span>` : ''}
    </div>
  `;
}

function renderMiniEmpty(message, iconName) {
  return `
    <div class="empty-state" style="min-height:130px;padding:12px">
      <div class="empty-icon">${icon(iconName, 19)}</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderEmptyState(title, text, iconName) {
  return `
    <div class="panel empty-state">
      <div class="empty-icon">${icon(iconName, 22)}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

async function performSearch({ useCurrentInput = true } = {}) {
  if (state.searchLoading) return;
  const input = document.querySelector('#search-query');
  if (useCurrentInput && input) state.query = input.value.trim();
  if (!state.query) state.query = t('searchPromptCleaning');
  localStorage.setItem('nayl-last-query', state.query);

  state.searchLoading = true;
  if (state.route === 'consumer') renderConsumer();

  try {
    state.search = await api('/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: state.query,
        market: state.market,
        city: state.city,
        locale: state.locale
      })
    });
    state.market = state.search.intent.market;
    state.city = state.search.intent.city;
    localStorage.setItem('nayl-market', state.market);
    localStorage.setItem('nayl-city', state.city);
    state.sourceFilter = 'all';
  } catch (error) {
    showToast(error.message, true);
  } finally {
    state.searchLoading = false;
    if (state.route === 'consumer') renderConsumer();
  }
}

async function loadConsumerRequests() {
  state.requestsLoading = true;
  if (state.route === 'consumer') renderConsumer();
  try {
    const payload = await api(`/api/marketplace/requests?consumerId=${encodeURIComponent(consumerId)}`);
    state.requests = payload.requests || [];
  } catch (error) {
    showToast(error.message, true);
  } finally {
    state.requestsLoading = false;
    if (state.route === 'consumer') renderConsumer();
  }
}

async function requestQuote(result) {
  if (!state.search) return;
  const intent = state.search.intent;
  await api('/api/marketplace/requests', {
    method: 'POST',
    body: JSON.stringify({
      consumerId,
      query: state.query,
      category: intent.category,
      market: intent.market,
      city: intent.city,
      budget: intent.budget,
      currency: intent.currency,
      urgency: intent.urgency,
      sourceResult: result
    })
  });
  await loadConsumerRequests();
  showToast(t('quoteRequested'));
}

async function bookQuote(requestId, quoteId) {
  await api(`/api/marketplace/requests/${encodeURIComponent(requestId)}/book`, {
    method: 'POST',
    body: JSON.stringify({ consumerId, quoteId })
  });
  await loadConsumerRequests();
  showToast(t('bookingCreated'));
}

function toggleSaved(result) {
  const index = state.saved.findIndex((item) => item.id === result.id);
  if (index >= 0) state.saved.splice(index, 1);
  else {
    state.saved.unshift({
      id: result.id,
      source: result.source,
      sourceType: result.sourceType,
      sourceMode: result.sourceMode,
      title: result.title,
      subtitle: result.subtitle,
      priceLabel: result.priceLabel,
      availability: result.availability,
      url: result.url,
      savedAt: new Date().toISOString()
    });
  }
  state.saved = state.saved.slice(0, 40);
  writeJsonStorage('nayl-saved-results', state.saved);
  renderConsumer();
}

function renderBusiness() {
  const { profile, kpis, opportunities, loading } = state.business;
  if (loading || !profile || !kpis) {
    app.innerHTML = renderPortalLoading('business');
    return;
  }

  app.innerHTML = `
    <section class="portal-heading">
      <div class="portal-heading-content">
        <div>
          <p class="eyebrow">${escapeHtml(t('businessEyebrow'))}</p>
          <h1>${escapeHtml(t('businessTitle'))}</h1>
          <p>${escapeHtml(t('businessSubtitle'))}</p>
        </div>
        <div class="business-identity">
          <strong>${escapeHtml(state.locale === 'ar' ? profile.nameAr || profile.name : profile.name)}</strong>
          <small>${escapeHtml(marketLabel(profile.market))} · ${profile.categories.map(categoryLabel).map(escapeHtml).join(', ')}</small>
          <div class="toggle-row">
            <small>${escapeHtml(t('acceptingLeads'))}</small>
            <span class="switch${profile.profile.acceptingLeads ? ' is-on' : ''}" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    </section>

    <section class="kpi-grid">
      ${renderKpi(t('qualifiedOpportunities'), kpis.qualifiedOpportunities, `${kpis.responseRate}% ${t('responseRate').toLowerCase()}`)}
      ${renderKpi(t('quotesSubmitted'), kpis.quotesSubmitted, `${kpis.avgResponseMinutes} min ${t('responseTime').toLowerCase()}`)}
      ${renderKpi(t('wins'), kpis.wins, `${formatNumber(profile.completedJobs)} ${t('completedJobs').toLowerCase()}`)}
      ${renderKpi(t('quotedValue'), formatMoney(kpis.quotedValue, kpis.currency), `${formatNumber(kpis.rating, { minimumFractionDigits: 1 })} ${t('rating').toLowerCase()}`)}
    </section>

    <section class="workspace-grid">
      <div class="panel">
        <div class="panel-header">
          <div><h2>${escapeHtml(t('qualifiedOpportunities'))}</h2><p>${formatNumber(opportunities.length)} ${escapeHtml(t('openOpportunities').toLowerCase())}</p></div>
          <button class="ghost-button" type="button" data-action="refresh-business">${icon('refresh', 16)} ${escapeHtml(t('retry'))}</button>
        </div>
        <div class="opportunity-list">
          ${opportunities.length > 0
            ? opportunities.map(renderOpportunityCard).join('')
            : renderMiniEmpty(state.locale === 'ar' ? 'لا توجد فرص مطابقة حالياً.' : 'No matching opportunities right now.', 'briefcase')}
        </div>
      </div>
      <aside class="panel profile-card">
        ${renderBusinessProfile(profile)}
      </aside>
    </section>
  `;
}

function renderPortalLoading(route) {
  return `
    <section class="portal-heading">
      <p class="eyebrow">${escapeHtml(t(route === 'business' ? 'businessEyebrow' : 'adminEyebrow'))}</p>
      <h1>${escapeHtml(t(route === 'business' ? 'businessTitle' : 'adminTitle'))}</h1>
      <p>${escapeHtml(t('loading'))}</p>
    </section>
    <div class="kpi-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
  `;
}

function renderKpi(label, value, note = '') {
  return `
    <article class="kpi-card">
      <span class="kpi-label">${escapeHtml(label)}</span>
      <strong class="kpi-value">${escapeHtml(String(value))}</strong>
      ${note ? `<small class="kpi-note">${escapeHtml(note)}</small>` : ''}
    </article>
  `;
}

function renderOpportunityCard(opportunity) {
  const quote = opportunity.myQuote;
  return `
    <article class="opportunity-card">
      <div class="opportunity-top">
        <div>
          <div class="tag-row">
            ${opportunity.isPreferred ? `<span class="status-pill quoted">${escapeHtml(t('preferred'))}</span>` : ''}
            <span class="status-pill ${escapeHtml(opportunity.status)}">${escapeHtml(requestStatusLabel(opportunity.status))}</span>
          </div>
          <h3 class="opportunity-title">${escapeHtml(opportunity.query)}</h3>
        </div>
        <span class="budget-badge">${opportunity.budget ? escapeHtml(formatMoney(opportunity.budget, opportunity.currency)) : escapeHtml(t('flexible'))}</span>
      </div>
      <div class="opportunity-context">
        <span class="tag">${icon('spark', 13)} ${escapeHtml(categoryLabel(opportunity.category))}</span>
        <span class="tag">${icon('pin', 13)} ${escapeHtml(cityLabel(opportunity.market, opportunity.city))}</span>
        <span class="tag">${icon('clock', 13)} ${escapeHtml(urgencyLabel(opportunity.urgency))}</span>
        <span class="tag">${formatNumber(opportunity.quoteCount)} ${escapeHtml(t('quoteCount'))}</span>
      </div>
      <div class="opportunity-footer">
        <div class="my-quote-summary">
          ${quote
            ? `<strong>${escapeHtml(t('yourQuote'))}:</strong> ${escapeHtml(formatMoney(quote.amount, quote.currency))} · ${escapeHtml(quote.availableAt)}`
            : escapeHtml(state.locale === 'ar' ? 'لم تقدم عرضاً بعد.' : 'You have not quoted yet.')}
        </div>
        ${opportunity.status !== 'booked'
          ? `<button class="primary-button is-teal" type="button" data-action="open-quote" data-opportunity-id="${escapeHtml(opportunity.id)}">${escapeHtml(quote ? t('updateQuote') : t('submitQuote'))}</button>`
          : ''}
      </div>
    </article>
  `;
}

function renderBusinessProfile(profile) {
  const initials = profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return `
    <div class="profile-cover"></div>
    <div class="profile-content">
      <div class="profile-avatar">${escapeHtml(initials)}</div>
      <h3>${escapeHtml(state.locale === 'ar' ? profile.nameAr || profile.name : profile.name)}</h3>
      <p>${escapeHtml(profile.profile.description || '')}</p>
      <div class="profile-stats">
        <div class="profile-stat"><small>${escapeHtml(t('verification'))}</small><strong>${escapeHtml(profile.verification === 'mvp-verified' ? (state.locale === 'ar' ? 'موثق للـMVP' : 'MVP verified') : (state.locale === 'ar' ? 'ملف تجريبي' : 'Seed profile'))}</strong></div>
        <div class="profile-stat"><small>${escapeHtml(t('completedJobs'))}</small><strong>${formatNumber(profile.completedJobs)}</strong></div>
        <div class="profile-stat"><small>${escapeHtml(t('responseRate'))}</small><strong>${formatNumber(profile.responseRate)}%</strong></div>
        <div class="profile-stat"><small>${escapeHtml(t('rating'))}</small><strong>${formatNumber(profile.rating, { minimumFractionDigits: 1 })}</strong></div>
      </div>
      <p><strong>${escapeHtml(t('serviceAreas'))}</strong></p>
      <div class="tag-row" style="margin-top:8px">${profile.serviceAreas.map((area) => `<span class="tag">${escapeHtml(cityLabel(profile.market, area))}</span>`).join('')}</div>
      <button class="secondary-button" style="width:100%;margin-top:16px" type="button" data-action="edit-profile">${icon('edit', 16)} ${escapeHtml(t('editProfile'))}</button>
    </div>
  `;
}

async function loadBusiness() {
  state.business.loading = true;
  renderBusiness();
  const businessId = state.config.defaults.businessId;
  try {
    const [profilePayload, kpiPayload, opportunitiesPayload] = await Promise.all([
      api(`/api/business/profile?businessId=${encodeURIComponent(businessId)}`),
      api(`/api/business/kpis?businessId=${encodeURIComponent(businessId)}`),
      api(`/api/business/opportunities?businessId=${encodeURIComponent(businessId)}`)
    ]);
    state.business.profile = profilePayload.business;
    state.business.kpis = kpiPayload.kpis;
    state.business.opportunities = opportunitiesPayload.opportunities || [];
  } catch (error) {
    showToast(error.message, true);
  } finally {
    state.business.loading = false;
    if (state.route === 'business') renderBusiness();
  }
}

function openQuoteModal(opportunityId) {
  const opportunity = state.business.opportunities.find((item) => item.id === opportunityId);
  if (!opportunity) return;
  const quote = opportunity.myQuote;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="quote-modal-title" data-modal-card>
        <div class="modal-header">
          <div>
            <h2 id="quote-modal-title">${escapeHtml(quote ? t('updateQuote') : t('submitQuote'))}</h2>
            <p>${escapeHtml(opportunity.query)}</p>
          </div>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="${escapeHtml(t('cancel'))}">${icon('close', 17)}</button>
        </div>
        <form id="quote-form" class="modal-body" data-opportunity-id="${escapeHtml(opportunity.id)}">
          <div class="form-grid">
            <div class="form-field">
              <label for="quote-amount">${escapeHtml(t('amount'))} (${escapeHtml(opportunity.currency)})</label>
              <input id="quote-amount" name="amount" type="number" min="0.01" step="0.01" value="${escapeHtml(quote?.amount ?? opportunity.budget ?? '')}" required>
            </div>
            <div class="form-field">
              <label for="quote-availability">${escapeHtml(t('availability'))}</label>
              <input id="quote-availability" name="availableAt" type="text" maxlength="120" value="${escapeHtml(quote?.availableAt || (state.locale === 'ar' ? 'غداً، 9:00 صباحاً' : 'Tomorrow, 9:00 AM'))}" required>
            </div>
            <div class="form-field full">
              <label for="quote-message">${escapeHtml(t('message'))}</label>
              <textarea id="quote-message" name="message" maxlength="800" required>${escapeHtml(quote?.message || (state.locale === 'ar' ? 'يشمل العرض العمالة والمواد وتأكيد النطاق قبل الوصول.' : 'Includes labour, standard materials, and scope confirmation before arrival.'))}</textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button class="secondary-button" type="button" data-action="close-modal">${escapeHtml(t('cancel'))}</button>
            <button class="primary-button is-teal" type="submit">${escapeHtml(t('sendQuote'))}</button>
          </div>
        </form>
      </section>
    </div>
  `;
  modalRoot.querySelector('#quote-amount')?.focus();
}

function openProfileModal() {
  const profile = state.business.profile;
  if (!profile) return;
  const market = state.config.markets.find((item) => item.code === profile.market);
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" data-modal-card>
        <div class="modal-header">
          <div><h2 id="profile-modal-title">${escapeHtml(t('editProfile'))}</h2><p>${escapeHtml(profile.name)}</p></div>
          <button class="icon-button" type="button" data-action="close-modal">${icon('close', 17)}</button>
        </div>
        <form id="profile-form" class="modal-body">
          <div class="form-grid">
            <div class="form-field"><label for="profile-contact">${escapeHtml(t('contactName'))}</label><input id="profile-contact" name="contactName" value="${escapeHtml(profile.profile.contactName || '')}" required></div>
            <div class="form-field"><label for="profile-email">${escapeHtml(t('email'))}</label><input id="profile-email" name="email" type="email" value="${escapeHtml(profile.profile.email || '')}" required></div>
            <div class="form-field"><label for="profile-phone">${escapeHtml(t('phone'))}</label><input id="profile-phone" name="phone" value="${escapeHtml(profile.profile.phone || '')}"></div>
            <div class="form-field"><label>${escapeHtml(t('acceptingLeads'))}</label><span class="checkbox-field"><input id="profile-accepting" name="acceptingLeads" type="checkbox"${profile.profile.acceptingLeads ? ' checked' : ''}><label for="profile-accepting">${escapeHtml(t('acceptingLeads'))}</label></span></div>
            <div class="form-field full"><label for="profile-description">${escapeHtml(t('description'))}</label><textarea id="profile-description" name="description" required>${escapeHtml(profile.profile.description || '')}</textarea></div>
            <div class="form-field full">
              <label>${escapeHtml(t('serviceAreas'))}</label>
              <div class="tag-row">${(market?.cities || []).map((city) => `
                <label class="checkbox-field"><input type="checkbox" name="serviceAreas" value="${escapeHtml(city.name)}"${profile.serviceAreas.includes(city.name) ? ' checked' : ''}><span>${escapeHtml(state.locale === 'ar' ? city.nameAr : city.name)}</span></label>
              `).join('')}</div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="secondary-button" type="button" data-action="close-modal">${escapeHtml(t('cancel'))}</button>
            <button class="primary-button is-teal" type="submit">${escapeHtml(t('saveProfile'))}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

async function submitBusinessQuote(form) {
  const opportunityId = form.dataset.opportunityId;
  const opportunity = state.business.opportunities.find((item) => item.id === opportunityId);
  if (!opportunity) return;
  const data = new FormData(form);
  await api(`/api/business/opportunities/${encodeURIComponent(opportunityId)}/quotes`, {
    method: 'POST',
    body: JSON.stringify({
      businessId: state.config.defaults.businessId,
      amount: Number(data.get('amount')),
      currency: opportunity.currency,
      availableAt: String(data.get('availableAt') || '').trim(),
      message: String(data.get('message') || '').trim()
    })
  });
  modalRoot.innerHTML = '';
  await loadBusiness();
  showToast(t('quoteSent'));
}

async function submitBusinessProfile(form) {
  const data = new FormData(form);
  await api('/api/business/profile', {
    method: 'PUT',
    body: JSON.stringify({
      businessId: state.config.defaults.businessId,
      contactName: String(data.get('contactName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      description: String(data.get('description') || '').trim(),
      acceptingLeads: data.get('acceptingLeads') === 'on',
      serviceAreas: data.getAll('serviceAreas')
    })
  });
  modalRoot.innerHTML = '';
  await loadBusiness();
  showToast(t('profileUpdated'));
}

function renderAdmin() {
  const overview = state.admin.overview;
  if (state.admin.loading || !overview) {
    app.innerHTML = renderPortalLoading('admin');
    return;
  }

  const gmv = Object.entries(overview.kpis.gmvByCurrency || {}).map(([currency, amount]) => formatMoney(amount, currency)).join(' + ') || '—';
  app.innerHTML = `
    <section class="portal-heading">
      <div class="portal-heading-content">
        <div>
          <p class="eyebrow">${escapeHtml(t('adminEyebrow'))}</p>
          <h1>${escapeHtml(t('adminTitle'))}</h1>
          <p>${escapeHtml(t('adminSubtitle'))}</p>
        </div>
      </div>
    </section>

    <section class="kpi-grid">
      ${renderKpi(t('searchesToday'), overview.kpis.searchesToday, `${formatNumber(overview.kpis.totalSearches)} total`)}
      ${renderKpi(t('marketplaceRequests'), overview.kpis.marketplaceRequests, `${formatNumber(overview.kpis.quotesSubmitted)} ${t('quotesSubmitted').toLowerCase()}`)}
      ${renderKpi(t('openOpportunities'), overview.kpis.openOpportunities, `${formatNumber(overview.kpis.bookings)} ${t('bookings').toLowerCase()}`)}
      ${renderKpi(t('conversion'), `${formatNumber(overview.kpis.requestToBookingRate, { maximumFractionDigits: 1 })}%`, gmv)}
    </section>

    <div class="policy-banner"><span class="policy-icon">${icon('shield', 18)}</span><span>${escapeHtml(t('compliantConnectorPolicy'))}</span></div>

    <section class="admin-grid">
      <div class="panel">
        <div class="panel-header"><div><h2>${escapeHtml(t('connectorHealth'))}</h2><p>${formatNumber(overview.connectors.length)} connectors</p></div>${icon('globe', 19)}</div>
        <div class="connector-list">${overview.connectors.map(renderAdminConnector).join('')}</div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>${escapeHtml(t('gccRollout'))}</h2><p>6 GCC markets · local currency seed</p></div>${icon('pin', 19)}</div>
        <div class="market-list">${overview.markets.map(renderMarketCard).join('')}</div>
      </div>
    </section>

    <section class="panel" style="margin-top:20px">
      <div class="panel-header"><div><h2>${escapeHtml(t('recentDemand'))}</h2><p>${formatNumber(overview.recentSearches.length)} recent searches</p></div><button class="ghost-button" type="button" data-action="refresh-admin">${icon('refresh', 16)} ${escapeHtml(t('retry'))}</button></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>${escapeHtml(t('searchQuery'))}</th><th>${escapeHtml(t('detectedIntent'))}</th><th>${escapeHtml(t('market'))}</th><th>${escapeHtml(t('results'))}</th><th>${escapeHtml(t('time'))}</th></tr></thead>
          <tbody>${overview.recentSearches.map((search) => `
            <tr>
              <td class="query-cell">${escapeHtml(search.query)}</td>
              <td>${escapeHtml(categoryLabel(search.category))} · ${escapeHtml(urgencyLabel(search.urgency))}</td>
              <td>${escapeHtml(cityLabel(search.market, search.city))} · ${escapeHtml(search.currency || '')}</td>
              <td>${formatNumber(search.resultCount || 0)}</td>
              <td>${escapeHtml(formatDate(search.createdAt))}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </section>

    <section class="panel" style="margin-top:20px">
      <div class="panel-header"><div><h2>${escapeHtml(t('operationsQueues'))}</h2><p>${state.locale === 'ar' ? 'أساس لوحدات الإنتاج المستقبلية' : 'Foundation for future production modules'}</p></div>${icon('shield', 19)}</div>
      <div class="queue-list">
        ${renderQueue(t('userVerification'), overview.operations.userVerification)}
        ${renderQueue(t('businessVerification'), overview.operations.businessVerification)}
        ${renderQueue(t('disputes'), overview.operations.disputes)}
        ${renderQueue(t('paymentExceptions'), overview.operations.paymentExceptions)}
        ${renderQueue(t('contentReview'), overview.operations.contentReview)}
      </div>
    </section>
  `;
}

function renderAdminConnector(connector) {
  const status = connector.status || connector.mode;
  return `
    <article class="connector-card">
      <div>
        <div class="connector-name"><span class="status-dot ${escapeHtml(status)}"></span>${escapeHtml(connector.name)}</div>
        <p>${escapeHtml(connector.description || '')}</p>
      </div>
      <span class="connector-mode ${escapeHtml(connector.mode)}">${escapeHtml(modeLabel(connector.mode))}</span>
    </article>
  `;
}

function renderMarketCard(market) {
  return `
    <article class="market-card">
      <div class="market-card-top">
        <div><strong>${escapeHtml(state.locale === 'ar' ? market.nameAr : market.name)}</strong><small>${escapeHtml(market.currency)} · ${formatNumber(market.cities.length)} cities seeded</small></div>
        <span class="rollout-pill ${escapeHtml(market.rollout)}">${escapeHtml(rolloutLabel(market.rollout))}</span>
      </div>
      <div class="tag-row" style="margin-top:10px">${market.cities.slice(0, 3).map((city) => `<span class="tag">${escapeHtml(state.locale === 'ar' ? city.nameAr : city.name)}</span>`).join('')}</div>
    </article>
  `;
}

function renderQueue(label, value) {
  return `<article class="queue-card"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></article>`;
}

async function loadAdmin() {
  state.admin.loading = true;
  renderAdmin();
  try {
    state.admin.overview = await api('/api/admin/overview');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    state.admin.loading = false;
    if (state.route === 'admin') renderAdmin();
  }
}

async function activateRoute() {
  state.route = getRoute();
  renderChrome();
  modalRoot.innerHTML = '';

  if (state.route === 'consumer') {
    renderConsumer();
    await loadConsumerRequests();
    if (!state.search) await performSearch({ useCurrentInput: false });
    else renderConsumer();
  } else if (state.route === 'business') {
    await loadBusiness();
  } else {
    await loadAdmin();
  }
}

function handleMarketChange(value) {
  state.market = value;
  const market = currentMarket();
  state.city = market?.cities?.[0]?.name || '';
  localStorage.setItem('nayl-market', state.market);
  localStorage.setItem('nayl-city', state.city);
  renderConsumer();
}

async function init() {
  try {
    state.config = await api('/api/config');
    const storedMarket = localStorage.getItem('nayl-market');
    state.market = state.config.markets.some((market) => market.code === storedMarket)
      ? storedMarket
      : state.config.defaults.market;
    const market = currentMarket();
    const storedCity = localStorage.getItem('nayl-city');
    state.city = market.cities.some((city) => city.name === storedCity)
      ? storedCity
      : (state.config.defaults.city && market.cities.some((city) => city.name === state.config.defaults.city)
        ? state.config.defaults.city
        : market.cities[0].name);
    if (!state.query) state.query = t('searchPromptCleaning');
    renderChrome();
    await activateRoute();
  } catch (error) {
    renderChrome();
    app.innerHTML = `
      <section class="panel error-panel">
        <div class="empty-icon">${icon('alert', 23)}</div>
        <h2>${escapeHtml(t('somethingWentWrong'))}</h2>
        <p>${escapeHtml(error.message)}</p>
        <button class="primary-button" type="button" data-action="reload">${escapeHtml(t('retry'))}</button>
      </section>
    `;
  }
}

window.addEventListener('hashchange', () => {
  activateRoute().catch((error) => showToast(error.message, true));
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalRoot.innerHTML) modalRoot.innerHTML = '';
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'market-select') handleMarketChange(event.target.value);
  if (event.target.id === 'city-select') {
    state.city = event.target.value;
    localStorage.setItem('nayl-city', state.city);
  }
});

document.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    if (event.target.id === 'search-form') await performSearch();
    if (event.target.id === 'quote-form') await submitBusinessQuote(event.target);
    if (event.target.id === 'profile-form') await submitBusinessProfile(event.target);
  } catch (error) {
    showToast(error.message, true);
  }
});

document.addEventListener('click', async (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;

  try {
    if (action === 'navigate') {
      window.location.hash = actionTarget.dataset.route;
      return;
    }
    if (action === 'toggle-language') {
      state.locale = state.locale === 'en' ? 'ar' : 'en';
      localStorage.setItem('nayl-locale', state.locale);
      state.query = state.query || t('searchPromptCleaning');
      renderChrome();
      if (state.route === 'consumer') await performSearch({ useCurrentInput: false });
      else if (state.route === 'business') renderBusiness();
      else renderAdmin();
      return;
    }
    if (action === 'quick-search') {
      state.query = t(actionTarget.dataset.promptKey);
      renderConsumer();
      await performSearch({ useCurrentInput: false });
      return;
    }
    if (action === 'filter-source') {
      state.sourceFilter = actionTarget.dataset.source;
      renderConsumer();
      return;
    }
    if (action === 'toggle-save') {
      const result = state.search?.results.find((item) => item.id === actionTarget.dataset.resultId);
      if (result) toggleSaved(result);
      return;
    }
    if (action === 'remove-saved') {
      state.saved = state.saved.filter((item) => item.id !== actionTarget.dataset.resultId);
      writeJsonStorage('nayl-saved-results', state.saved);
      renderConsumer();
      return;
    }
    if (action === 'result-action') {
      const result = state.search?.results.find((item) => item.id === actionTarget.dataset.resultId);
      if (!result) return;
      if (result.actionType === 'marketplace-request') await requestQuote(result);
      else if (result.actionType === 'external-link' && result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
        showToast(t('externalDisclosure'));
      } else showToast(t('demoDisclosure'));
      return;
    }
    if (action === 'book-quote') {
      await bookQuote(actionTarget.dataset.requestId, actionTarget.dataset.quoteId);
      return;
    }
    if (action === 'refresh-business') {
      await loadBusiness();
      return;
    }
    if (action === 'open-quote') {
      openQuoteModal(actionTarget.dataset.opportunityId);
      return;
    }
    if (action === 'edit-profile') {
      openProfileModal();
      return;
    }
    if (action === 'refresh-admin') {
      await loadAdmin();
      return;
    }
    if (action === 'close-modal') {
      if (event.target.closest('[data-modal-card]') && !event.target.closest('.icon-button, .secondary-button')) return;
      modalRoot.innerHTML = '';
      return;
    }
    if (action === 'reload') window.location.reload();
  } catch (error) {
    showToast(error.message, true);
  }
});

init();
