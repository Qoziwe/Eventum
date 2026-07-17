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
  ageLimit: number; // New field: 0, 6, 12, 16, 18
  moderationStatus?: string;
  rejectionReason?: string;
}

export const DISCUSSION_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps-outline' as keyof typeof Ionicons.glyphMap },
  {
    id: 'music',
    label: 'Music',
    icon: 'musical-notes-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'art',
    label: 'Art',
    icon: 'color-palette-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'sport',
    label: 'Sport',
    icon: 'fitness-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'education',
    label: 'Education',
    icon: 'school-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'theater',
    label: 'Theater',
    icon: 'film-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'cinema',
    label: 'Cinema',
    icon: 'videocam-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'food',
    label: 'Food',
    icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'tech',
    label: 'Technology',
    icon: 'hardware-chip-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: 'airplane-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'party',
    label: 'Parties',
    icon: 'wine-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'networking',
    label: 'Networking',
    icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'games',
    label: 'Games',
    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'heart-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'fashion',
    label: 'Fashion',
    icon: 'shirt-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'dance',
    label: 'Dance',
    icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
  },
];

export const INITIAL_POSTS: PostData[] = [
  {
    id: 'post_1',
    categorySlug: 'music',
    categoryName: 'Music',
    authorId: 'system',
    authorName: 'RockLover',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    content: 'Guys who are going to Summer Sound? Looking for a company for a trip from the center!',
    upvotes: 45,
    downvotes: 2,
    commentCount: 1,
    votedUsers: {},
    ageLimit: 12,
  },
  {
    id: 'post_2',
    categorySlug: 'tech',
    categoryName: 'Technology',
    authorId: 'system',
    authorName: 'DevMaster',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    content:
      'Next week there will be a meetup on React Native. Is anyone planning to perform??',
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
      content: "I'm coming! I can pick you up on the Oktyabrskaya metro station.",
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
      content: "I'll come listen!",
      upvotes: 5,
      downvotes: 0,
      depth: 0,
    },
  ],
};
