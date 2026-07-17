// types/index.ts or components/EventCard.tsx
export interface EventItem {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  location: string;
  price: string;
  priceValue: number;
  categories: string[];
  vibe: 'party' | 'chill';
  tags: string[];
  stats?: number; // optional
  image: string;
  description?: string; // optional
  organizer?: string; // optional
  isPopular?: boolean; // optional
  addedAt: string;
}
