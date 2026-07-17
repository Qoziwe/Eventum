export interface PurchasedTicket {
  id: string;
  eventId: string;
  quantity: number;
  purchaseDate: string;
  eventTitle?: string; // Added field from backend
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
  birthDate: string; // ISO date of birth (YYYY-MM-DD)
  isOnline?: boolean;
  lastSeen?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
}

export const ALL_INTERESTS = [
  'Music',
  'Art',
  'Sport',
  'Education',
  'Theater',
  'Business',
  'Technology',
  'Networking',
  'Food',
  'Travel',
  'Cinema',
  'Games',
  'Charity',
  'Fashion',
  'Health',
];

export const AVAILABLE_CITIES = [
  'Almaty',
  'Astana',
  'Shymkent',
  'Karaganda',
  'Aktobe',
  'Taraz',
  'Pavlodar',
  'Ust-Kamenogorsk',
  'Semey',
];

export const INITIAL_USER_DATA: UserData = {
  id: '',
  name: '',
  username: '',
  email: '',
  phone: '',
  location: 'Almaty',
  bio: '',
  avatarInitials: '',
  avatarUrl: null,
  role: 'Explorer',
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
