export interface Category {
  id: number;
  slug: string;
  label: string;
  icon: string;
  type: 'event' | 'vibe' | 'both';
}

export const CATEGORIES: Category[] = [
  { id: 1, slug: 'music', label: 'Music', icon: 'musical-notes', type: 'both' },
  { id: 2, slug: 'tech', label: 'Tech', icon: 'laptop', type: 'both' },
  { id: 3, slug: 'art', label: 'Art', icon: 'color-palette', type: 'both' },
  { id: 4, slug: 'food', label: 'Food', icon: 'restaurant', type: 'both' },
  { id: 5, slug: 'business', label: 'Business', icon: 'briefcase', type: 'both' },
  { id: 6, slug: 'sport', label: 'Sport', icon: 'football', type: 'both' },
  { id: 7, slug: 'health', label: 'Health', icon: 'fitness', type: 'both' },
];
