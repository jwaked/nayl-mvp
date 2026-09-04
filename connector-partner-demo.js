const CATEGORY_LABELS = {
  cleaning: ['Home services partner', 'شريك خدمات منزلية'],
  'ac-repair': ['Maintenance partner', 'شريك صيانة'],
  moving: ['Relocation partner', 'شريك نقل'],
  'car-care': ['Mobility partner', 'شريك خدمات سيارات'],
  plumbing: ['Maintenance partner', 'شريك صيانة'],
  beauty: ['Lifestyle partner', 'شريك أسلوب حياة'],
  tutoring: ['Learning partner', 'شريك تعليمي'],
  photography: ['Events partner', 'شريك فعاليات'],
  catering: ['Hospitality partner', 'شريك ضيافة'],
  general: ['Approved partner', 'شريك معتمد']
};

export function createPartnerDemoConnector({ enabled }) {
  return {
    id: 'partner-demo',
    name: 'Partner Apps',
    sourceType: 'partner',
    mode: enabled ? 'demo' : 'not-configured',
    configured: enabled,
    description: 'Illustrative adapter for approved APIs, feeds, affiliate links, or deep links.',

    async search({ intent }) {
      const labels = CATEGORY_LABELS[intent.category] || CATEGORY_LABELS.general;
      const arabic = intent.language === 'ar';
      return [{
        id: `partner-demo-${intent.category}-${intent.market}`,
        source: 'Partner Apps',
        sourceType: 'partner',
        sourceMode: 'demo',
        title: arabic ? `${labels[1]} — عرض توضيحي` : `${labels[0]} — demo match`,
        subtitle: arabic
          ? 'مثال يوضح مكان تكامل API أو رابط عميق معتمد. لا يوجد تكامل تجاري مفعّل.'
          : 'Illustrative approved API or deep-link result. No commercial integration is active.',
        price: null,
        currency: intent.currency,
        priceLabel: arabic ? 'بيانات تجريبية فقط' : 'Demo data only',
        rating: null,
        reviews: null,
        availability: arabic ? 'غير متاح للحجز' : 'Not available to book',
        score: 0,
        action: arabic ? 'موصل تجريبي' : 'Demo connector',
        actionType: 'demo-disabled',
        url: null,
        attribution: arabic ? 'عرض NAYL التوضيحي' : 'NAYL demonstration',
        meta: {
          categories: intent.category === 'general' ? [] : [intent.category],
          serviceAreas: intent.city ? [intent.city] : []
        }
      }];
    }
  };
}
