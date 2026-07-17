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
    title: 'Band concert "Stars"',
    date: '24 Jan, 20:00',
    timestamp: toTS('2026-01-24T20:00:00'),
    location: 'Club "Arena", Medeusky',
    price: 'from 5000$',
    priceValue: 5000,
    categories: ['music'],
    vibe: 'party',
    district: 'Medeusky',
    ageLimit: 18,
    tags: ['rock', 'live sound', 'open-air'],
    stats: 1250,
    image:
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-10',
    fullDescription:
      'The main musical event of this winter! Group "Stars" presents his new album in Almaty.',
    organizerName: 'Arena Live Group',
    organizerAvatar:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
    timeRange: '20:00 — 23:30',
  },
  {
    id: '2',
    organizerId: 'mock_org_2',
    title: 'Exhibition of contemporary art',
    date: '25 Jan, 10:00',
    timestamp: toTS('2026-01-25T10:00:00'),
    location: 'Gallery "Art", Almalinsky',
    price: 'Free',
    priceValue: 0,
    categories: ['art'],
    vibe: 'chill',
    district: 'Almalinsky',
    ageLimit: 0,
    tags: ['art', 'for free', 'culture'],
    stats: 320,
    image:
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-12',
    fullDescription:
      'Immerse yourself in the world of contemporary art. The exhibition presents works by young artists of Kazakhstan.',
    organizerName: 'Almaty Art Foundation',
    organizerAvatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    timeRange: '10:00 — 19:00',
  },
  {
    id: '3',
    organizerId: 'mock_org_3',
    title: 'Football match: Kairat vs Astana',
    date: '26 Jan, 19:00',
    timestamp: toTS('2026-01-26T19:00:00'),
    location: 'Stadium "Central", Bostandyksky',
    price: '3000$',
    priceValue: 3000,
    categories: ['sport'],
    vibe: 'party',
    district: 'Bostandyksky',
    ageLimit: 0,
    tags: ['football', 'match', 'Derby'],
    stats: 15000,
    image:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-15',
    fullDescription:
      'The main derby of the country! Come support your favorite team in an important championship match.',
    organizerName: 'Kairat FC',
    organizerAvatar:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=200&auto=format&fit=crop',
    timeRange: '19:00 — 21:00',
  },
  {
    id: '4',
    organizerId: 'mock_org_4',
    title: 'Wine tasting: Italy evening',
    date: '27 Jan, 19:00',
    timestamp: toTS('2026-01-27T19:00:00'),
    location: 'Vinoteka "Solo", Medeusky',
    price: '15000$',
    priceValue: 15000,
    categories: ['food'],
    vibe: 'romantic',
    district: 'Medeusky',
    ageLimit: 21,
    tags: ['wine', 'gastronomy', 'evening'],
    stats: 450,
    image:
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-18',
    fullDescription:
      'Exclusive tasting of Tuscan wines led by an experienced sommelier. Snacks included.',
    organizerName: 'Solo Sommelier Club',
    organizerAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    timeRange: '19:00 — 22:00',
  },
  {
    id: '5',
    organizerId: 'mock_org_5',
    title: 'Tech Meetup: Future of AI',
    date: '28 Jan, 18:30',
    timestamp: toTS('2026-01-28T18:30:00'),
    location: 'Smart Space, Almalinsky',
    price: 'Free',
    priceValue: 0,
    categories: ['tech', 'business'],
    vibe: 'active',
    district: 'Almalinsky',
    ageLimit: 16,
    tags: ['IT', 'AI', 'networking'],
    stats: 890,
    image:
      'https://images.unsplash.com/photo-1591115765373-520b7a217294?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-20',
    fullDescription:
      'Meeting IT-city ​​communities. We discuss artificial intelligence trends and share implementation experience.',
    organizerName: 'Digital Nomads Almaty',
    organizerAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    timeRange: '18:30 — 21:00',
  },
  {
    id: '6',
    organizerId: 'mock_org_6',
    title: 'Trekking to Kok-Zhailau',
    date: '31 Jan, 08:00',
    timestamp: toTS('2026-01-31T08:00:00'),
    location: 'Mountains of Trans-Ili Alatau',
    price: '2000$',
    priceValue: 2000,
    categories: ['travel', 'sport'],
    vibe: 'active',
    district: 'Medeusky',
    ageLimit: 12,
    tags: ['mountains', 'tracking', 'nature'],
    stats: 2100,
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-22',
    fullDescription:
      'Group hike of medium difficulty. We meet at the entrance to Medeu Park. Bring comfortable shoes and a snack.',
    organizerName: 'Steppe Hikers',
    organizerAvatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    timeRange: '08:00 — 16:00',
  },
  {
    id: '7',
    organizerId: 'mock_org_7',
    title: 'Play "The Master and Margarita"',
    date: '01 Feb, 18:00',
    timestamp: toTS('2026-02-01T18:00:00'),
    location: 'Theater named after Lermontov, Almalinsky',
    price: 'from 4000$',
    priceValue: 4000,
    categories: ['theater'],
    vibe: 'chill',
    district: 'Almalinsky',
    ageLimit: 16,
    tags: ['theater', 'classic', 'drama'],
    stats: 5600,
    image:
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-15',
    fullDescription:
      "Legendary production of Mikhail Bulgakov's classic work. A new interpretation of familiar images.",
    organizerName: 'Lermontov Theater',
    organizerAvatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    timeRange: '18:00 — 21:00',
  },
  {
    id: '8',
    organizerId: 'mock_org_8',
    title: 'Open air cinema: Interstellar',
    date: '02 Feb, 21:00',
    timestamp: toTS('2026-02-02T21:00:00'),
    location: 'Park of the First President, Bostandyksky',
    price: '2500$',
    priceValue: 2500,
    categories: ['cinema'],
    vibe: 'romantic',
    district: 'Bostandyksky',
    ageLimit: 12,
    tags: ['movie', 'night', 'romance'],
    stats: 3400,
    image:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-25',
    fullDescription:
      "Enjoy watching Christopher Nolan's masterpiece under the starry skies of Almaty. We provide poufs and blankets.",
    organizerName: 'Outdoor Cinema Club',
    organizerAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop',
    timeRange: '21:00 — 23:45',
  },
  {
    id: '9',
    organizerId: 'mock_org_9',
    title: 'Techno Night: Industrial Vibe',
    date: '03 Feb, 23:55',
    timestamp: toTS('2026-02-03T23:55:00'),
    location: 'Secret Warehouse, Turksibsky',
    price: '7000$',
    priceValue: 7000,
    categories: ['music'],
    vibe: 'party',
    district: 'Turksibsky',
    ageLimit: 18,
    tags: ['techno', 'rave', 'night'],
    stats: 980,
    image:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-26',
    fullDescription:
      'All the power of industrial techno. Special guest from Berlin. FC/DC.',
    organizerName: 'Underground Culture',
    organizerAvatar:
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=200&auto=format&fit=crop',
    timeRange: '23:55 — 06:00',
  },
  {
    id: '10',
    organizerId: 'mock_org_10',
    title: 'Workshop: Mobile Photography Basics',
    date: '04 Feb, 14:00',
    timestamp: toTS('2026-02-04T14:00:00'),
    location: 'Creative Hub, Zhetysusky',
    price: '5000$',
    priceValue: 5000,
    categories: ['education', 'art'],
    vibe: 'chill',
    district: 'Zhetysusky',
    ageLimit: 12,
    tags: ['photo', 'education', 'content'],
    stats: 670,
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop',
    addedAt: '2026-01-27',
    fullDescription:
      "We'll teach you how to take cool shots with a regular smartphone. Let's look at composition, lighting and post-processing.",
    organizerName: 'Focus School',
    organizerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    timeRange: '14:00 — 17:00',
  },
];
