import { clamp, normalizeText } from './text.js';

const MARKET_ALIASES = {
  AE: ['uae', 'united arab emirates', 'emirates', 'الإمارات', 'الامارات'],
  SA: ['saudi', 'saudi arabia', 'ksa', 'السعودية', 'المملكة العربية السعودية'],
  QA: ['qatar', 'قطر'],
  KW: ['kuwait', 'الكويت'],
  BH: ['bahrain', 'البحرين'],
  OM: ['oman', 'عمان', 'عُمان']
};

const CURRENCY_CODES = ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'];

function convertArabicDigits(value) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const eastern = '۰۱۲۳۴۵۶۷۸۹';
  return String(value)
    .replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(eastern.indexOf(digit)));
}

function detectLanguage(query, requestedLocale) {
  if (requestedLocale === 'ar' || requestedLocale === 'en') return requestedLocale;
  return /[\u0600-\u06FF]/.test(query) ? 'ar' : 'en';
}

function detectBudget(query, fallbackCurrency) {
  const value = convertArabicDigits(query).replace(/,/g, ' ');
  const currencyGroup = CURRENCY_CODES.join('|');
  const keywordPattern = new RegExp(
    `(?:budget(?:\\s*(?:is|of|around|about))?|under|below|max(?:imum)?|up to|less than|around|approximately|about|ميزانيتي|ميزانية|أقل من|اقل من|بحد أقصى|بحد اقصى|حد أقصى|حد اقصى|حوالي|تحت)\\s*(?:${currencyGroup})?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(${currencyGroup})?`,
    'i'
  );
  const currencyFirst = new RegExp(`\\b(${currencyGroup})\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
  const currencyLast = new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*\\b(${currencyGroup})\\b`, 'i');

  let match = value.match(keywordPattern);
  if (match) {
    const amount = Number(match[1]);
    return Number.isFinite(amount) ? { amount, currency: (match[2] || fallbackCurrency).toUpperCase(), explicit: true } : null;
  }

  match = value.match(currencyFirst);
  if (match) {
    const amount = Number(match[2]);
    return Number.isFinite(amount) ? { amount, currency: match[1].toUpperCase(), explicit: true } : null;
  }

  match = value.match(currencyLast);
  if (match) {
    const amount = Number(match[1]);
    return Number.isFinite(amount) ? { amount, currency: match[2].toUpperCase(), explicit: true } : null;
  }

  return null;
}

function detectUrgency(normalized) {
  const rules = [
    { id: 'now', terms: ['asap', 'right now', 'immediately', 'urgent', 'emergency', 'الان', 'الآن', 'فورا', 'فوراً', 'عاجل', 'طارئ'] },
    { id: 'today', terms: ['today', 'same day', 'this afternoon', 'this evening', 'اليوم', 'نفس اليوم', 'هذا المساء', 'بعد ظهر اليوم'] },
    { id: 'tomorrow', terms: ['tomorrow', 'غدا', 'غداً', 'بكرة'] },
    { id: 'weekend', terms: ['weekend', 'this weekend', 'نهاية الاسبوع', 'نهاية الأسبوع', 'عطلة نهاية الاسبوع'] },
    { id: 'this-week', terms: ['this week', 'within a week', 'هذا الاسبوع', 'هذا الأسبوع', 'خلال اسبوع', 'خلال أسبوع'] }
  ];

  for (const rule of rules) {
    if (rule.terms.some((term) => normalized.includes(normalizeText(term)))) {
      return { value: rule.id, explicit: true };
    }
  }
  return { value: 'flexible', explicit: false };
}

function containsTerm(normalized, term) {
  return ` ${normalized} `.includes(` ${term} `);
}

function detectCategory(normalized, categories) {
  let best = null;
  for (const category of categories) {
    let score = 0;
    for (const keyword of category.keywords || []) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;
      if (containsTerm(normalized, normalizedKeyword)) score += normalizedKeyword.includes(' ') ? 3 : 1;
    }
    if (!best || score > best.score) best = { category, score };
  }
  return best && best.score > 0 ? best.category : categories.find((category) => category.id === 'general') || null;
}

function findExplicitLocation(normalized, markets) {
  for (const market of markets) {
    for (const city of market.cities || []) {
      const aliases = new Set([city.name, city.nameAr, ...(city.aliases || [])]);
      for (const alias of aliases) {
        if (normalized.includes(normalizeText(alias))) {
          return { market, city, explicitCity: true, explicitMarket: true };
        }
      }
    }
  }

  for (const market of markets) {
    const aliases = [market.name, market.nameAr, ...(MARKET_ALIASES[market.code] || [])];
    if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return { market, city: null, explicitCity: false, explicitMarket: true };
    }
  }

  return null;
}

export function extractIntent(query, context, catalogue) {
  const originalQuery = String(query || '').trim().slice(0, 800);
  const normalized = normalizeText(convertArabicDigits(originalQuery));
  const language = detectLanguage(originalQuery, context.locale);
  const explicitLocation = findExplicitLocation(normalized, catalogue.markets);

  let market = explicitLocation?.market || catalogue.markets.find((item) => item.code === context.market);
  if (!market) market = catalogue.markets[0];

  let city = explicitLocation?.city || (market.cities || []).find((item) => normalizeText(item.name) === normalizeText(context.city));
  if (!city) city = market.cities?.[0] || null;

  const category = detectCategory(normalized, catalogue.categories);
  const urgency = detectUrgency(normalized);
  const budget = detectBudget(originalQuery, market.currency);

  let confidence = 0.35;
  if (category && category.id !== 'general') confidence += 0.2;
  if (explicitLocation?.explicitCity) confidence += 0.15;
  else if (explicitLocation?.explicitMarket) confidence += 0.08;
  if (budget) confidence += 0.15;
  if (urgency.explicit) confidence += 0.1;
  if (originalQuery.length >= 12) confidence += 0.03;

  const detected = [];
  if (category && category.id !== 'general') detected.push('category');
  if (explicitLocation?.explicitCity) detected.push('city');
  if (explicitLocation?.explicitMarket) detected.push('market');
  if (budget) detected.push('budget');
  if (urgency.explicit) detected.push('urgency');

  return {
    query: originalQuery,
    language,
    category: category?.id || 'general',
    categoryLabel: language === 'ar' ? category?.labelAr : category?.label,
    market: market.code,
    marketName: language === 'ar' ? market.nameAr : market.name,
    city: city?.name || context.city || null,
    cityLabel: language === 'ar' ? city?.nameAr || city?.name : city?.name,
    budget: budget?.amount || null,
    currency: budget?.currency || market.currency,
    urgency: urgency.value,
    confidence: Math.round(clamp(confidence, 0, 0.98) * 100),
    detected,
    usedContext: {
      market: !explicitLocation?.explicitMarket,
      city: !explicitLocation?.explicitCity,
      locale: context.locale || null
    }
  };
}
