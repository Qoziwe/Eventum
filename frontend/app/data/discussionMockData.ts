import { Ionicons } from '@expo/vector-icons';

export interface CommentData {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  content: string;
  upvotes: number;
  downvotes: number;
  depth: number;
  parentId?: string;
}

export interface PostData {
  id: string;
  categorySlug: string;
  categoryName: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  content: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  votedUsers: Record<string, 'up' | 'down'>;
  ageLimit: number; // Новое поле: 0, 6, 12, 16, 18
  moderationStatus?: string;
  rejectionReason?: string;
}

export const DISCUSSION_CATEGORIES = [
  { id: 'all', label: 'Все', icon: 'apps-outline' as keyof typeof Ionicons.glyphMap },
  {
    id: 'music',
    label: 'Музыка',
    icon: 'musical-notes-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'art',
    label: 'Искусство',
    icon: 'color-palette-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'sport',
    label: 'Спорт',
    icon: 'fitness-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'education',
    label: 'Обучение',
    icon: 'school-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'theater',
    label: 'Театр',
    icon: 'film-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'business',
    label: 'Бизнес',
    icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'cinema',
    label: 'Кино',
    icon: 'videocam-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'food',
    label: 'Еда',
    icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'tech',
    label: 'Технологии',
    icon: 'hardware-chip-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'travel',
    label: 'Путешествия',
    icon: 'airplane-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'party',
    label: 'Вечеринки',
    icon: 'wine-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'networking',
    label: 'Нетворкинг',
    icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'games',
    label: 'Игры',
    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'health',
    label: 'Здоровье',
    icon: 'heart-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'fashion',
    label: 'Мода',
    icon: 'shirt-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'dance',
    label: 'Танцы',
    icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
  },
];

export const INITIAL_POSTS: PostData[] = [
  {
    id: 'post_1',
    categorySlug: 'music',
    categoryName: 'Музыка',
    authorId: 'system',
    authorName: 'RockLover',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    content: 'Ребят, кто едет на Summer Sound? Ищу компанию для поездки из центра!',
    upvotes: 45,
    downvotes: 2,
    commentCount: 1,
    votedUsers: {},
    ageLimit: 12,
  },
  {
    id: 'post_2',
    categorySlug: 'tech',
    categoryName: 'Технологии',
    authorId: 'system',
    authorName: 'DevMaster',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    content:
      'На следующей неделе будет митап по React Native. Кто-нибудь планирует выступать?',
    upvotes: 120,
    downvotes: 5,
    commentCount: 2,
    votedUsers: {},
    ageLimit: 0,
  },
];

export const INITIAL_COMMENTS: Record<string, CommentData[]> = {
  post_1: [
    {
      id: 'comm_1',
      postId: 'post_1',
      authorId: 'user_1',
      authorName: 'Meloman',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      content: 'Я еду! Могу подхватить на метро Октябрьская.',
      upvotes: 10,
      downvotes: 0,
      depth: 0,
    },
  ],
  post_2: [
    {
      id: 'comm_2',
      postId: 'post_2',
      authorId: 'user_2',
      authorName: 'JuniorDev',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      content: 'Я приду послушать!',
      upvotes: 5,
      downvotes: 0,
      depth: 0,
    },
  ],
};
