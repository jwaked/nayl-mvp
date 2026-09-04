
export const MARKETS = [
  {
    code: 'AE',
    name: 'United Arab Emirates',
    nameAr: 'الإمارات العربية المتحدة',
    currency: 'AED',
    rollout: 'pilot-live',
    rolloutLabel: 'Pilot live',
    cities: [
      { name: 'Dubai', nameAr: 'دبي', aliases: ['dubai', 'دبي'] },
      { name: 'Abu Dhabi', nameAr: 'أبوظبي', aliases: ['abu dhabi', 'abudhabi', 'أبوظبي', 'ابوظبي'] },
      { name: 'Sharjah', nameAr: 'الشارقة', aliases: ['sharjah', 'الشارقة'] },
      { name: 'Ajman', nameAr: 'عجمان', aliases: ['ajman', 'عجمان'] }
    ]
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    nameAr: 'المملكة العربية السعودية',
    currency: 'SAR',
    rollout: 'pilot-ready',
    rolloutLabel: 'Pilot ready',
    cities: [
      { name: 'Riyadh', nameAr: 'الرياض', aliases: ['riyadh', 'الرياض'] },
      { name: 'Jeddah', nameAr: 'جدة', aliases: ['jeddah', 'jedda', 'جدة'] },
      { name: 'Dammam', nameAr: 'الدمام', aliases: ['dammam', 'الدمام'] },
      { name: 'Khobar', nameAr: 'الخبر', aliases: ['khobar', 'al khobar', 'الخبر'] }
    ]
  },
  {
    code: 'QA',
    name: 'Qatar',
    nameAr: 'قطر',
    currency: 'QAR',
    rollout: 'planned',
    rolloutLabel: 'Planned',
    cities: [
      { name: 'Doha', nameAr: 'الدوحة', aliases: ['doha', 'الدوحة'] },
      { name: 'Al Rayyan', nameAr: 'الريان', aliases: ['al rayyan', 'rayyan', 'الريان'] }
    ]
  },
  {
    code: 'KW',
    name: 'Kuwait',
    nameAr: 'الكويت',
    currency: 'KWD',
    rollout: 'planned',
    rolloutLabel: 'Planned',
    cities: [
      { name: 'Kuwait City', nameAr: 'مدينة الكويت', aliases: ['kuwait city', 'مدينة الكويت', 'الكويت'] },
      { name: 'Hawally', nameAr: 'حولي', aliases: ['hawally', 'hawalli', 'حولي'] }
    ]
  },
  {
    code: 'BH',
    name: 'Bahrain',
    nameAr: 'البحرين',
    currency: 'BHD',
    rollout: 'discovery',
    rolloutLabel: 'Discovery',
    cities: [
      { name: 'Manama', nameAr: 'المنامة', aliases: ['manama', 'المنامة'] },
      { name: 'Riffa', nameAr: 'الرفاع', aliases: ['riffa', 'الرفاع'] }
    ]
  },
  {
    code: 'OM',
    name: 'Oman',
    nameAr: 'عُمان',
    currency: 'OMR',
    rollout: 'discovery',
    rolloutLabel: 'Discovery',
    cities: [
      { name: 'Muscat', nameAr: 'مسقط', aliases: ['muscat', 'مسقط'] },
      { name: 'Sohar', nameAr: 'صحار', aliases: ['sohar', 'صحار'] }
    ]
  }
];

export const CATEGORIES = [
  { id: 'cleaning', label: 'Cleaning', labelAr: 'تنظيف', keywords: ['clean', 'cleaner', 'cleaning', 'maid', 'housekeeping', 'deep clean', 'تنظيف', 'منظف', 'عاملة', 'خادمة'] },
  { id: 'ac-repair', label: 'AC repair', labelAr: 'صيانة التكييف', keywords: ['ac', 'a/c', 'air conditioning', 'hvac', 'cooling', 'تكييف', 'مكيف', 'تبريد', 'صيانة المكيف'] },
  { id: 'moving', label: 'Moving', labelAr: 'نقل أثاث', keywords: ['move', 'moving', 'movers', 'relocation', 'packers', 'نقل', 'نقل أثاث', 'اثاث', 'عفش'] },
  { id: 'car-care', label: 'Car care', labelAr: 'خدمات السيارات', keywords: ['car wash', 'car care', 'detailing', 'mechanic', 'vehicle', 'سيارة', 'غسيل سيارة', 'ميكانيكي', 'تلميع'] },
  { id: 'plumbing', label: 'Plumbing', labelAr: 'سباكة', keywords: ['plumber', 'plumbing', 'leak', 'pipe', 'سباك', 'سباكة', 'تسريب', 'مواسير'] },
  { id: 'beauty', label: 'Beauty at home', labelAr: 'تجميل منزلي', keywords: ['beauty', 'salon', 'makeup', 'hair', 'nails', 'تجميل', 'صالون', 'مكياج', 'شعر', 'أظافر'] },
  { id: 'tutoring', label: 'Tutoring', labelAr: 'دروس خصوصية', keywords: ['tutor', 'teacher', 'lessons', 'math tutor', 'english tutor', 'مدرس', 'معلم', 'دروس', 'خصوصي'] },
  { id: 'photography', label: 'Photography', labelAr: 'تصوير', keywords: ['photographer', 'photography', 'photo shoot', 'event photos', 'مصور', 'تصوير', 'جلسة تصوير'] },
  { id: 'catering', label: 'Catering', labelAr: 'ضيافة وتموين', keywords: ['catering', 'buffet', 'party food', 'event food', 'ضيافة', 'تموين', 'بوفيه', 'طعام حفلة'] },
  { id: 'general', label: 'Local services', labelAr: 'خدمات محلية', keywords: ['service', 'provider', 'help', 'خدمة', 'مزود', 'مساعدة'] }
];


export function createSeedData() {
  const now = new Date().toISOString();
  return structuredClone({
    version: 2,
    createdAt: now,
    updatedAt: now,
    markets: MARKETS,
    categories: CATEGORIES,
    businesses: [],
    opportunities: [],
    bookings: [],
    searchEvents: [],
    auditEvents: [
      {
        id: `audit-system-${Date.now()}`,
        type: 'system.initialized',
        actor: 'system',
        summary: 'NAYL persistent state initialized without mock providers or opportunities.',
        entityId: null,
        createdAt: now
      }
    ]
  });
}
