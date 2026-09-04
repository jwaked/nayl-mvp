const NOW = '2026-09-04T08:00:00.000Z';

export const MARKETS = [
  {
    code: 'AE',
    name: 'United Arab Emirates',
    nameAr: 'الإمارات العربية المتحدة',
    currency: 'AED',
    rollout: 'live-mvp',
    rolloutLabel: 'Live MVP',
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

const PROVIDERS = [
  {
    id: 'provider-baytcare-cleaning',
    businessId: 'biz-baytcare',
    market: 'AE',
    serviceAreas: ['Dubai', 'Sharjah'],
    categories: ['cleaning'],
    title: 'BaytCare Home Cleaning',
    titleAr: 'بيت كير للتنظيف المنزلي',
    description: 'Background-checked home cleaners with same-day slots and eco-friendly supplies.',
    descriptionAr: 'عاملات تنظيف موثوقات مع مواعيد في نفس اليوم ومواد صديقة للبيئة.',
    price: 180,
    currency: 'AED',
    rating: 4.8,
    reviews: 326,
    availability: 'Today, 2:00 PM',
    availabilityAr: 'اليوم، 2:00 مساءً',
    keywords: ['apartment', 'villa', 'deep clean', 'same day', 'cleaning']
  },
  {
    id: 'provider-safa-cleaning',
    businessId: 'biz-safa',
    market: 'AE',
    serviceAreas: ['Dubai', 'Ajman'],
    categories: ['cleaning'],
    title: 'Safa Deep Clean Crew',
    titleAr: 'فريق صفا للتنظيف العميق',
    description: 'Fixed-scope deep cleaning for apartments, villas, and move-in handovers.',
    descriptionAr: 'تنظيف عميق بنطاق واضح للشقق والفلل وتجهيز السكن الجديد.',
    price: 240,
    currency: 'AED',
    rating: 4.7,
    reviews: 188,
    availability: 'Today, 5:30 PM',
    availabilityAr: 'اليوم، 5:30 مساءً',
    keywords: ['deep clean', 'move in', 'villa', 'apartment', 'cleaning']
  },
  {
    id: 'provider-barq-ac',
    businessId: 'biz-barq',
    market: 'AE',
    serviceAreas: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    categories: ['ac-repair'],
    title: 'Barq AC & Maintenance',
    titleAr: 'برق لصيانة التكييف',
    description: 'Rapid diagnostics, split AC servicing, and transparent repair estimates.',
    descriptionAr: 'فحص سريع وصيانة مكيفات سبليت وعروض إصلاح واضحة.',
    price: 220,
    currency: 'AED',
    rating: 4.9,
    reviews: 412,
    availability: 'Technician in 90 minutes',
    availabilityAr: 'فني خلال 90 دقيقة',
    keywords: ['ac', 'hvac', 'repair', 'maintenance', 'urgent']
  },
  {
    id: 'provider-sahl-movers',
    businessId: 'biz-sahl',
    market: 'AE',
    serviceAreas: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    categories: ['moving'],
    title: 'Sahl Movers GCC',
    titleAr: 'سهل لنقل الأثاث',
    description: 'Apartment and villa moves with optional packing, dismantling, and insurance.',
    descriptionAr: 'نقل شقق وفلل مع خيارات التغليف والفك والتركيب والتأمين.',
    price: 650,
    currency: 'AED',
    rating: 4.6,
    reviews: 274,
    availability: 'Survey today; move tomorrow',
    availabilityAr: 'معاينة اليوم والنقل غداً',
    keywords: ['moving', 'movers', 'packing', 'relocation', 'villa']
  },
  {
    id: 'provider-autodoor',
    businessId: 'biz-autodoor',
    market: 'AE',
    serviceAreas: ['Dubai'],
    categories: ['car-care'],
    title: 'AutoDoor Mobile Car Care',
    titleAr: 'أوتودور للعناية المتنقلة بالسيارات',
    description: 'Mobile wash and detailing delivered to home or office parking.',
    descriptionAr: 'غسيل وتلميع متنقل في موقف المنزل أو المكتب.',
    price: 95,
    currency: 'AED',
    rating: 4.8,
    reviews: 521,
    availability: 'Today, 4:00 PM',
    availabilityAr: 'اليوم، 4:00 مساءً',
    keywords: ['car wash', 'detailing', 'mobile', 'car care']
  },
  {
    id: 'provider-flowfix',
    businessId: 'biz-flowfix',
    market: 'AE',
    serviceAreas: ['Dubai', 'Sharjah', 'Ajman'],
    categories: ['plumbing'],
    title: 'FlowFix Plumbing',
    titleAr: 'فلو فكس للسباكة',
    description: 'Leak detection, blocked drains, and emergency plumbing visits.',
    descriptionAr: 'كشف التسربات وفتح الانسدادات وزيارات سباكة طارئة.',
    price: 160,
    currency: 'AED',
    rating: 4.7,
    reviews: 203,
    availability: 'Emergency slot available',
    availabilityAr: 'موعد طارئ متاح',
    keywords: ['plumber', 'leak', 'drain', 'emergency', 'plumbing']
  },
  {
    id: 'provider-luma-beauty',
    businessId: 'biz-luma',
    market: 'AE',
    serviceAreas: ['Dubai', 'Abu Dhabi'],
    categories: ['beauty'],
    title: 'Luma Beauty at Home',
    titleAr: 'لوما للتجميل المنزلي',
    description: 'Licensed home-service professionals for hair, makeup, and nails.',
    descriptionAr: 'مختصات مرخصات لخدمات الشعر والمكياج والأظافر في المنزل.',
    price: 210,
    currency: 'AED',
    rating: 4.9,
    reviews: 349,
    availability: 'Tomorrow, 10:00 AM',
    availabilityAr: 'غداً، 10:00 صباحاً',
    keywords: ['beauty', 'makeup', 'hair', 'nails', 'home salon']
  },
  {
    id: 'provider-lensmajlis',
    businessId: 'biz-lensmajlis',
    market: 'AE',
    serviceAreas: ['Dubai', 'Abu Dhabi'],
    categories: ['photography'],
    title: 'Lens Majlis Studio',
    titleAr: 'استوديو عدسة مجلس',
    description: 'Event and family photography with fast digital delivery.',
    descriptionAr: 'تصوير مناسبات وعائلات مع تسليم رقمي سريع.',
    price: 900,
    currency: 'AED',
    rating: 4.8,
    reviews: 137,
    availability: 'Weekend availability',
    availabilityAr: 'مواعيد متاحة نهاية الأسبوع',
    keywords: ['photographer', 'event', 'family', 'photo shoot']
  },
  {
    id: 'provider-darlama',
    businessId: 'biz-darlama',
    market: 'SA',
    serviceAreas: ['Riyadh', 'Jeddah'],
    categories: ['cleaning'],
    title: 'Dar Al-Lama Cleaning',
    titleAr: 'دار اللمعة للتنظيف',
    description: 'Flexible apartment and villa cleaning packages across Riyadh and Jeddah.',
    descriptionAr: 'باقات مرنة لتنظيف الشقق والفلل في الرياض وجدة.',
    price: 190,
    currency: 'SAR',
    rating: 4.7,
    reviews: 244,
    availability: 'Today, 6:00 PM',
    availabilityAr: 'اليوم، 6:00 مساءً',
    keywords: ['cleaning', 'villa', 'apartment', 'same day']
  },
  {
    id: 'provider-najm-hvac',
    businessId: 'biz-najm',
    market: 'SA',
    serviceAreas: ['Riyadh', 'Dammam', 'Khobar'],
    categories: ['ac-repair'],
    title: 'Najm HVAC Services',
    titleAr: 'نجم لخدمات التكييف',
    description: 'Residential and small-business AC repair with itemized estimates.',
    descriptionAr: 'صيانة تكييف للمنازل والمنشآت الصغيرة مع عرض سعر مفصل.',
    price: 240,
    currency: 'SAR',
    rating: 4.8,
    reviews: 318,
    availability: 'Today, 3:30 PM',
    availabilityAr: 'اليوم، 3:30 مساءً',
    keywords: ['ac', 'hvac', 'repair', 'maintenance']
  },
  {
    id: 'provider-rihla-movers',
    businessId: 'biz-rihla',
    market: 'SA',
    serviceAreas: ['Riyadh', 'Jeddah', 'Dammam'],
    categories: ['moving'],
    title: 'Rihla Movers',
    titleAr: 'رحلة لنقل الأثاث',
    description: 'Home and office relocation with packing and furniture installation.',
    descriptionAr: 'نقل المنازل والمكاتب مع التغليف وتركيب الأثاث.',
    price: 720,
    currency: 'SAR',
    rating: 4.6,
    reviews: 171,
    availability: 'Assessment within 2 hours',
    availabilityAr: 'معاينة خلال ساعتين',
    keywords: ['moving', 'office', 'home', 'packing']
  },
  {
    id: 'provider-doha-home',
    businessId: 'biz-doha-home',
    market: 'QA',
    serviceAreas: ['Doha', 'Al Rayyan'],
    categories: ['cleaning', 'plumbing'],
    title: 'Doha Home Care',
    titleAr: 'الدوحة للعناية المنزلية',
    description: 'Home cleaning and maintenance visits with bilingual support.',
    descriptionAr: 'زيارات تنظيف وصيانة منزلية مع دعم ثنائي اللغة.',
    price: 170,
    currency: 'QAR',
    rating: 4.7,
    reviews: 142,
    availability: 'Tomorrow morning',
    availabilityAr: 'غداً صباحاً',
    keywords: ['cleaning', 'plumbing', 'home care', 'maintenance']
  },
  {
    id: 'provider-khidma-plus',
    businessId: 'biz-khidma-plus',
    market: 'KW',
    serviceAreas: ['Kuwait City', 'Hawally'],
    categories: ['cleaning', 'ac-repair'],
    title: 'Khidma Plus Kuwait',
    titleAr: 'خدمة بلس الكويت',
    description: 'Scheduled home cleaning and AC maintenance packages.',
    descriptionAr: 'باقات مجدولة لتنظيف المنزل وصيانة التكييف.',
    price: 18,
    currency: 'KWD',
    rating: 4.6,
    reviews: 98,
    availability: 'Next available: tomorrow',
    availabilityAr: 'أقرب موعد: غداً',
    keywords: ['cleaning', 'ac', 'maintenance', 'home']
  },
  {
    id: 'provider-manama-fix',
    businessId: 'biz-manama-fix',
    market: 'BH',
    serviceAreas: ['Manama', 'Riffa'],
    categories: ['plumbing', 'ac-repair'],
    title: 'Manama Fix',
    titleAr: 'المنامة فكس',
    description: 'On-demand household repair visits with upfront call-out pricing.',
    descriptionAr: 'زيارات إصلاح منزلية عند الطلب مع سعر زيارة واضح.',
    price: 15,
    currency: 'BHD',
    rating: 4.5,
    reviews: 77,
    availability: 'This afternoon',
    availabilityAr: 'بعد ظهر اليوم',
    keywords: ['repair', 'plumbing', 'ac', 'home maintenance']
  },
  {
    id: 'provider-muscat-assist',
    businessId: 'biz-muscat-assist',
    market: 'OM',
    serviceAreas: ['Muscat', 'Sohar'],
    categories: ['cleaning', 'moving'],
    title: 'Muscat Assist',
    titleAr: 'مسقط أسيست',
    description: 'Home support and small-move services with clear scope confirmation.',
    descriptionAr: 'خدمات دعم منزلي ونقل خفيف مع تأكيد واضح لنطاق العمل.',
    price: 20,
    currency: 'OMR',
    rating: 4.6,
    reviews: 84,
    availability: 'Within 24 hours',
    availabilityAr: 'خلال 24 ساعة',
    keywords: ['cleaning', 'small move', 'home support']
  }
];

const BUSINESSES = [
  {
    id: 'biz-baytcare',
    name: 'BaytCare Home Cleaning',
    nameAr: 'بيت كير للتنظيف المنزلي',
    market: 'AE',
    categories: ['cleaning'],
    serviceAreas: ['Dubai', 'Sharjah'],
    verification: 'mvp-verified',
    responseRate: 94,
    avgResponseMinutes: 12,
    completedJobs: 418,
    rating: 4.8,
    profile: {
      contactName: 'Mariam Al Noor',
      email: 'ops@baytcare.example',
      phone: '+971 50 000 0000',
      description: 'Same-day home cleaning specialists for apartments and villas.',
      acceptingLeads: true
    }
  },
  {
    id: 'biz-safa', name: 'Safa Deep Clean Crew', nameAr: 'فريق صفا للتنظيف العميق', market: 'AE', categories: ['cleaning'], serviceAreas: ['Dubai', 'Ajman'], verification: 'mvp-verified', responseRate: 91, avgResponseMinutes: 18, completedJobs: 262, rating: 4.7, profile: { contactName: 'Omar Hadi', email: 'hello@safa.example', phone: '+971 50 000 0001', description: 'Deep-clean specialists.', acceptingLeads: true }
  },
  {
    id: 'biz-barq', name: 'Barq AC & Maintenance', nameAr: 'برق لصيانة التكييف', market: 'AE', categories: ['ac-repair'], serviceAreas: ['Dubai', 'Abu Dhabi', 'Sharjah'], verification: 'mvp-verified', responseRate: 97, avgResponseMinutes: 8, completedJobs: 690, rating: 4.9, profile: { contactName: 'Faisal Rahman', email: 'dispatch@barq.example', phone: '+971 50 000 0002', description: 'Rapid AC diagnostics and repair.', acceptingLeads: true }
  },
  {
    id: 'biz-sahl', name: 'Sahl Movers GCC', nameAr: 'سهل لنقل الأثاث', market: 'AE', categories: ['moving'], serviceAreas: ['Dubai', 'Abu Dhabi', 'Sharjah'], verification: 'mvp-verified', responseRate: 89, avgResponseMinutes: 24, completedJobs: 331, rating: 4.6, profile: { contactName: 'Adel Saeed', email: 'quotes@sahl.example', phone: '+971 50 000 0003', description: 'Residential moving and packing.', acceptingLeads: true }
  },
  {
    id: 'biz-autodoor', name: 'AutoDoor Mobile Car Care', nameAr: 'أوتودور للعناية المتنقلة بالسيارات', market: 'AE', categories: ['car-care'], serviceAreas: ['Dubai'], verification: 'mvp-verified', responseRate: 95, avgResponseMinutes: 10, completedJobs: 804, rating: 4.8, profile: { contactName: 'Sara Malik', email: 'bookings@autodoor.example', phone: '+971 50 000 0004', description: 'Mobile car wash and detailing.', acceptingLeads: true }
  },
  {
    id: 'biz-flowfix', name: 'FlowFix Plumbing', nameAr: 'فلو فكس للسباكة', market: 'AE', categories: ['plumbing'], serviceAreas: ['Dubai', 'Sharjah', 'Ajman'], verification: 'mvp-verified', responseRate: 92, avgResponseMinutes: 14, completedJobs: 287, rating: 4.7, profile: { contactName: 'Nabil Youssef', email: 'help@flowfix.example', phone: '+971 50 000 0005', description: 'Emergency plumbing and leak detection.', acceptingLeads: true }
  },
  {
    id: 'biz-luma', name: 'Luma Beauty at Home', nameAr: 'لوما للتجميل المنزلي', market: 'AE', categories: ['beauty'], serviceAreas: ['Dubai', 'Abu Dhabi'], verification: 'mvp-verified', responseRate: 93, avgResponseMinutes: 16, completedJobs: 456, rating: 4.9, profile: { contactName: 'Reem Khalil', email: 'care@luma.example', phone: '+971 50 000 0006', description: 'Licensed beauty professionals at home.', acceptingLeads: true }
  },
  {
    id: 'biz-lensmajlis', name: 'Lens Majlis Studio', nameAr: 'استوديو عدسة مجلس', market: 'AE', categories: ['photography'], serviceAreas: ['Dubai', 'Abu Dhabi'], verification: 'mvp-verified', responseRate: 86, avgResponseMinutes: 35, completedJobs: 176, rating: 4.8, profile: { contactName: 'Hana Al Ali', email: 'studio@lensmajlis.example', phone: '+971 50 000 0007', description: 'Events and family photography.', acceptingLeads: true }
  },
  {
    id: 'biz-darlama', name: 'Dar Al-Lama Cleaning', nameAr: 'دار اللمعة للتنظيف', market: 'SA', categories: ['cleaning'], serviceAreas: ['Riyadh', 'Jeddah'], verification: 'seed-profile', responseRate: 90, avgResponseMinutes: 19, completedJobs: 301, rating: 4.7, profile: { contactName: 'Seed operator', email: 'demo@example.com', phone: '', description: 'Seed marketplace profile.', acceptingLeads: true }
  },
  {
    id: 'biz-najm', name: 'Najm HVAC Services', nameAr: 'نجم لخدمات التكييف', market: 'SA', categories: ['ac-repair'], serviceAreas: ['Riyadh', 'Dammam', 'Khobar'], verification: 'seed-profile', responseRate: 92, avgResponseMinutes: 15, completedJobs: 390, rating: 4.8, profile: { contactName: 'Seed operator', email: 'demo@example.com', phone: '', description: 'Seed marketplace profile.', acceptingLeads: true }
  },
  {
    id: 'biz-rihla', name: 'Rihla Movers', nameAr: 'رحلة لنقل الأثاث', market: 'SA', categories: ['moving'], serviceAreas: ['Riyadh', 'Jeddah', 'Dammam'], verification: 'seed-profile', responseRate: 84, avgResponseMinutes: 30, completedJobs: 207, rating: 4.6, profile: { contactName: 'Seed operator', email: 'demo@example.com', phone: '', description: 'Seed marketplace profile.', acceptingLeads: true }
  },
  {
    id: 'biz-doha-home', name: 'Doha Home Care', nameAr: 'الدوحة للعناية المنزلية', market: 'QA', categories: ['cleaning', 'plumbing'], serviceAreas: ['Doha', 'Al Rayyan'], verification: 'seed-profile', responseRate: 88, avgResponseMinutes: 23, completedJobs: 188, rating: 4.7, profile: { contactName: 'Seed operator', email: 'demo@example.com', phone: '', description: 'Seed marketplace profile.', acceptingLeads: true }
  },
  {
    id: 'biz-khidma-plus', name: 'Khidma Plus Kuwait', nameAr: 'خدمة بلس الكويت', market: 'KW', categories: ['cleaning', 'ac-repair'], serviceAreas: ['Kuwait City', 'Hawally'], verification: 'seed-profile', responseRate: 81, avgResponseMinutes: 38, completedJobs: 129, rating: 4.6, profile: { contactName: 'Seed operator', email: 'demo@example.com', phone: '', description: 'Seed marketplace profile.', acceptingLeads: true }
  },
  {
    id: 'biz-manama-fix', name: 'Manama Fix', nameAr: 'المنامة فكس', market: 'BH', categories: ['plumbing', 'ac-repair'], serviceAreas: ['Manama', 'Riffa'], verification: 'seed-profile', responseRate: 79, avgResponseMinutes: 41, completedJobs: 91, rating: 4.5, profile: { contactName: 'Seed operator', email: 'demo@example.com', phone: '', description: 'Seed marketplace profile.', acceptingLeads: true }
  },
  {
    id: 'biz-muscat-assist', name: 'Muscat Assist', nameAr: 'مسقط أسيست', market: 'OM', categories: ['cleaning', 'moving'], serviceAreas: ['Muscat', 'Sohar'], verification: 'seed-profile', responseRate: 82, avgResponseMinutes: 33, completedJobs: 106, rating: 4.6, profile: { contactName: 'Seed operator', email: 'demo@example.com', phone: '', description: 'Seed marketplace profile.', acceptingLeads: true }
  }
];

const OPPORTUNITIES = [
  {
    id: 'opp-demo-001',
    consumerId: 'demo-consumer',
    query: 'I need a deep clean for a two-bedroom apartment in Dubai tomorrow, budget AED 450',
    category: 'cleaning',
    market: 'AE',
    city: 'Dubai',
    budget: 450,
    currency: 'AED',
    urgency: 'tomorrow',
    status: 'quoted',
    sourceResultId: 'provider-baytcare-cleaning',
    sourceTitle: 'BaytCare Home Cleaning',
    createdAt: '2026-09-04T06:45:00.000Z',
    quotes: [
      {
        id: 'quote-demo-001',
        businessId: 'biz-baytcare',
        providerName: 'BaytCare Home Cleaning',
        amount: 390,
        currency: 'AED',
        message: 'Includes supplies, two cleaners, and a four-hour deep-clean visit.',
        availableAt: 'Tomorrow, 9:00 AM',
        status: 'submitted',
        createdAt: '2026-09-04T07:10:00.000Z'
      },
      {
        id: 'quote-demo-002',
        businessId: 'biz-safa',
        providerName: 'Safa Deep Clean Crew',
        amount: 425,
        currency: 'AED',
        message: 'Fixed price after a short photo-based scope confirmation.',
        availableAt: 'Tomorrow, 11:30 AM',
        status: 'submitted',
        createdAt: '2026-09-04T07:24:00.000Z'
      }
    ]
  },
  {
    id: 'opp-demo-002',
    consumerId: 'consumer-seed-002',
    query: 'Office deep cleaning in Downtown Dubai this weekend, around AED 900',
    category: 'cleaning',
    market: 'AE',
    city: 'Dubai',
    budget: 900,
    currency: 'AED',
    urgency: 'weekend',
    status: 'open',
    sourceResultId: null,
    sourceTitle: null,
    createdAt: '2026-09-04T07:32:00.000Z',
    quotes: []
  },
  {
    id: 'opp-demo-003',
    consumerId: 'consumer-seed-003',
    query: 'Need an AC technician in Riyadh today under SAR 350',
    category: 'ac-repair',
    market: 'SA',
    city: 'Riyadh',
    budget: 350,
    currency: 'SAR',
    urgency: 'today',
    status: 'open',
    sourceResultId: null,
    sourceTitle: null,
    createdAt: '2026-09-04T07:41:00.000Z',
    quotes: []
  }
];

export function createSeedData() {
  return structuredClone({
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    markets: MARKETS,
    categories: CATEGORIES,
    providers: PROVIDERS,
    businesses: BUSINESSES,
    opportunities: OPPORTUNITIES,
    searchEvents: [
      {
        id: 'search-seed-001',
        query: 'cleaner in Dubai today under AED 250',
        market: 'AE',
        city: 'Dubai',
        category: 'cleaning',
        urgency: 'today',
        resultCount: 3,
        createdAt: '2026-09-04T07:55:00.000Z'
      }
    ],
    auditEvents: [
      { id: 'audit-seed-001', type: 'system.seeded', actor: 'system', summary: 'MVP seed data initialized', createdAt: NOW }
    ]
  });
}
