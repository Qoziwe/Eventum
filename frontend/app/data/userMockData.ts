export interface PurchasedTicket {
  id: string;
  eventId: string;
  quantity: number;
  purchaseDate: string;
  eventTitle?: string; // Добавлено поле из бэкенда
}

export interface UserStats {
  eventsAttended: number;
  communitiesJoined: number;
}

export type UserRole = 'explorer' | 'organizer' | 'admin';

export interface UserData {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  phone: string;
  location: string;
  bio: string;
  avatarInitials: string;
  avatarUrl?: string | null;
  role: string;
  userType: UserRole;
  subscriptionType: string;
  subscriptionStatus: 'premium' | 'basic' | 'none';
  interests: string[];
  stats: UserStats;
  hasTickets: boolean;
  savedEventIds: string[];
  purchasedTickets: PurchasedTicket[];
  followingOrganizerIds: string[];
  birthDate: string; // ISO дата рождения (ГГГГ-ММ-ДД)
  isOnline?: boolean;
  lastSeen?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
}

export const ALL_INTERESTS = [
  'Музыка',
  'Искусство',
  'Спорт',
  'Обучение',
  'Театр',
  'Бизнес',
  'Технологии',
  'Нетворкинг',
  'Гастрономия',
  'Путешествия',
  'Кино',
  'Игры',
  'Благотворительность',
  'Мода',
  'Здоровье',
];

export const AVAILABLE_CITIES = [
  'Алматы',
  'Астана',
  'Шымкент',
  'Караганда',
  'Актобе',
  'Тараз',
  'Павлодар',
  'Усть-Каменогорск',
  'Семей',
];

export const INITIAL_USER_DATA: UserData = {
  id: '',
  name: '',
  username: '',
  email: '',
  phone: '',
  location: 'Алматы',
  bio: '',
  avatarInitials: '',
  avatarUrl: null,
  role: 'Исследователь',
  userType: 'explorer',
  subscriptionType: 'None',
  subscriptionStatus: 'none',
  interests: [],
  stats: {
    eventsAttended: 0,
    communitiesJoined: 0,
  },
  hasTickets: false,
  savedEventIds: [],
  purchasedTickets: [],
  followingOrganizerIds: [],
  birthDate: '2000-01-01',
  isAdmin: false,
  isBanned: false,
};
