import { EventItem } from '../components/EventCard';

const toTS = (dateStr: string) => new Date(dateStr).getTime();

export interface DetailedEventItem extends EventItem {
  fullDescription: string;
  organizerName: string;
  organizerAvatar: string;
  timeRange: string;
  organizerId: string;
  vibe: 'active' | 'chill' | 'family' | 'romantic' | 'party';
  district: string;
  ageLimit: number;
  tags: string[];
  addedAt: string;
  priceValue: number;
  views?: number;
  stats?: number;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
}

export const ALL_EVENTS: DetailedEventItem[] = [
  {
    id: '1',
    organizerId: 'mock_org_1',
    title: 'Концерт группы "Звёзды"',
    date: '24 янв, 20:00',
    timestamp: toTS('2026-01-24T20:00:00'),
    location: 'Клуб "Арена", Медеуский',
    price: 'от 5000₸',
    priceValue: 5000,
    categories: ['music'],
    vibe: 'party',
    district: 'Медеуский',
    ageLimit: 18,
    tags: ['рок', 'живой звук', 'open-air'],
    stats: 1250,
    image:
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-10',
    fullDescription:
      'Главное музыкальное событие этой зимы! Группа "Звезды" презентует свой новый альбом в Алматы.',
    organizerName: 'Arena Live Group',
    organizerAvatar:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
    timeRange: '20:00 — 23:30',
  },
  {
    id: '2',
    organizerId: 'mock_org_2',
    title: 'Выставка современного искусства',
    date: '25 янв, 10:00',
    timestamp: toTS('2026-01-25T10:00:00'),
    location: 'Галерея "Арт", Алмалинский',
    price: 'Бесплатно',
    priceValue: 0,
    categories: ['art'],
    vibe: 'chill',
    district: 'Алмалинский',
    ageLimit: 0,
    tags: ['арт', 'бесплатно', 'культура'],
    stats: 320,
    image:
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-12',
    fullDescription:
      'Погрузитесь в мир современного искусства. На выставке представлены работы молодых художников Казахстана.',
    organizerName: 'Almaty Art Foundation',
    organizerAvatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    timeRange: '10:00 — 19:00',
  },
  {
    id: '3',
    organizerId: 'mock_org_3',
    title: 'Футбольный матч: Кайрат vs Астана',
    date: '26 янв, 19:00',
    timestamp: toTS('2026-01-26T19:00:00'),
    location: 'Стадион "Центральный", Бостандыкский',
    price: '3000₸',
    priceValue: 3000,
    categories: ['sport'],
    vibe: 'party',
    district: 'Бостандыкский',
    ageLimit: 0,
    tags: ['футбол', 'матч', 'дерби'],
    stats: 15000,
    image:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-15',
    fullDescription:
      'Главное дерби страны! Приходите поддержать любимую команду в важном матче чемпионата.',
    organizerName: 'Kairat FC',
    organizerAvatar:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=200&auto=format&fit=crop',
    timeRange: '19:00 — 21:00',
  },
  {
    id: '4',
    organizerId: 'mock_org_4',
    title: 'Винная дегустация: Вечер Италии',
    date: '27 янв, 19:00',
    timestamp: toTS('2026-01-27T19:00:00'),
    location: 'Винотека "Solo", Медеуский',
    price: '15000₸',
    priceValue: 15000,
    categories: ['food'],
    vibe: 'romantic',
    district: 'Медеуский',
    ageLimit: 21,
    tags: ['вино', 'гастрономия', 'вечер'],
    stats: 450,
    image:
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-18',
    fullDescription:
      'Эксклюзивная дегустация вин Тосканы под руководством опытного сомелье. В стоимость включены закуски.',
    organizerName: 'Solo Sommelier Club',
    organizerAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    timeRange: '19:00 — 22:00',
  },
  {
    id: '5',
    organizerId: 'mock_org_5',
    title: 'Tech Meetup: Future of AI',
    date: '28 янв, 18:30',
    timestamp: toTS('2026-01-28T18:30:00'),
    location: 'Smart Space, Алмалинский',
    price: 'Бесплатно',
    priceValue: 0,
    categories: ['tech', 'business'],
    vibe: 'active',
    district: 'Алмалинский',
    ageLimit: 16,
    tags: ['IT', 'AI', 'нетворкинг'],
    stats: 890,
    image:
      'https://images.unsplash.com/photo-1591115765373-520b7a217294?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-20',
    fullDescription:
      'Встреча IT-сообщества города. Обсуждаем тренды искусственного интеллекта и делимся опытом внедрения.',
    organizerName: 'Digital Nomads Almaty',
    organizerAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    timeRange: '18:30 — 21:00',
  },
  {
    id: '6',
    organizerId: 'mock_org_6',
    title: 'Поход на Кок-Жайляу',
    date: '31 янв, 08:00',
    timestamp: toTS('2026-01-31T08:00:00'),
    location: 'Горы Заилийского Алатау',
    price: '2000₸',
    priceValue: 2000,
    categories: ['travel', 'sport'],
    vibe: 'active',
    district: 'Медеуский',
    ageLimit: 12,
    tags: ['горы', 'трекинг', 'природа'],
    stats: 2100,
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-22',
    fullDescription:
      'Групповой поход средней сложности. Встречаемся у входа в парк Медеу. С собой иметь удобную обувь и перекус.',
    organizerName: 'Steppe Hikers',
    organizerAvatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    timeRange: '08:00 — 16:00',
  },
  {
    id: '7',
    organizerId: 'mock_org_7',
    title: 'Спектакль "Мастер и Маргарита"',
    date: '01 фев, 18:00',
    timestamp: toTS('2026-02-01T18:00:00'),
    location: 'Театр им. Лермонтова, Алмалинский',
    price: 'от 4000₸',
    priceValue: 4000,
    categories: ['theater'],
    vibe: 'chill',
    district: 'Алмалинский',
    ageLimit: 16,
    tags: ['театр', 'классика', 'драма'],
    stats: 5600,
    image:
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-15',
    fullDescription:
      'Легендарная постановка классического произведения Михаила Булгакова. Новое прочтение знакомых образов.',
    organizerName: 'Lermontov Theater',
    organizerAvatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    timeRange: '18:00 — 21:00',
  },
  {
    id: '8',
    organizerId: 'mock_org_8',
    title: 'Кино под открытым небом: Интерстеллар',
    date: '02 фев, 21:00',
    timestamp: toTS('2026-02-02T21:00:00'),
    location: 'Парк Первого Президента, Бостандыкский',
    price: '2500₸',
    priceValue: 2500,
    categories: ['cinema'],
    vibe: 'romantic',
    district: 'Бостандыкский',
    ageLimit: 12,
    tags: ['кино', 'ночь', 'романтика'],
    stats: 3400,
    image:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-25',
    fullDescription:
      'Насладитесь просмотром шедевра Кристофера Нолана под звездным небом Алматы. Предоставляем пуфы и пледы.',
    organizerName: 'Outdoor Cinema Club',
    organizerAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop',
    timeRange: '21:00 — 23:45',
  },
  {
    id: '9',
    organizerId: 'mock_org_9',
    title: 'Techno Night: Industrial Vibe',
    date: '03 фев, 23:55',
    timestamp: toTS('2026-02-03T23:55:00'),
    location: 'Secret Warehouse, Турксибский',
    price: '7000₸',
    priceValue: 7000,
    categories: ['music'],
    vibe: 'party',
    district: 'Турксибский',
    ageLimit: 18,
    tags: ['техно', 'рейв', 'ночь'],
    stats: 980,
    image:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-26',
    fullDescription:
      'Вся мощь индустриального техно. Специальный гость из Берлина. FC/DC.',
    organizerName: 'Underground Culture',
    organizerAvatar:
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=200&auto=format&fit=crop',
    timeRange: '23:55 — 06:00',
  },
  {
    id: '10',
    organizerId: 'mock_org_10',
    title: 'Workshop: Основы мобильной фотографии',
    date: '04 фев, 14:00',
    timestamp: toTS('2026-02-04T14:00:00'),
    location: 'Creative Hub, Жетысуский',
    price: '5000₸',
    priceValue: 5000,
    categories: ['education', 'art'],
    vibe: 'chill',
    district: 'Жетысуский',
    ageLimit: 12,
    tags: ['фотография', 'обучение', 'контент'],
    stats: 670,
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-27',
    fullDescription:
      'Научим делать крутые кадры на обычный смартфон. Разберем композицию, свет и постобработку.',
    organizerName: 'Focus School',
    organizerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    timeRange: '14:00 — 17:00',
  },
];
