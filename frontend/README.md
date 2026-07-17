# Eventum — Frontend

Cross-platform mobile application built with React Native and Expo SDK 54. Supports iOS, Android, and Web from a single TypeScript codebase.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | **React Native 0.81** + **Expo SDK 54** |
| Language | **TypeScript 5.9** |
| Navigation | React Navigation 7 (Native Stack + Bottom Tabs) |
| State | **Zustand 5** (lightweight, hook-based stores) |
| Real-time | **Socket.IO Client 4.8** |
| Animations | **React Native Reanimated 4** |
| Styling | Custom **Liquid Glass** design system with dark/light themes |
| Charts | React Native Chart Kit + SVG |
| Images | Expo Image (optimized loading with caching) |
| Storage | AsyncStorage (persistent auth tokens & preferences) |

## App Architecture

```
frontend/
├── App.tsx                          # Root: navigation tree, auth gate, theme
├── app/
│   ├── api/
│   │   └── apiClient.ts            # Centralized HTTP client with auth injection
│   ├── assets/                     # Icons, splash screens, static images
│   ├── components/
│   │   ├── LiquidUI/               # Glassmorphism tab bar & drop effects
│   │   ├── Charts/                 # Analytics chart components
│   │   ├── Background/             # Animated background layers
│   │   ├── DiscussionComponents/   # Post cards, comment threads
│   │   ├── ProfileComponents/      # Profile sections, stat cards
│   │   ├── SettingsComponents/     # Settings toggles & sections
│   │   ├── SubsComponents/         # Subscription plan cards
│   │   ├── EventCard.tsx           # Event discovery card
│   │   ├── Header.tsx              # Universal header with notifications
│   │   ├── HeroSection.tsx         # Animated hero carousel
│   │   ├── Avatar.tsx              # User avatar with online indicator
│   │   └── ToastProvider.tsx       # In-app toast notification system
│   ├── data/                       # Static constants & category definitions
│   ├── screens/                    # All application screens (29 screens)
│   ├── services/
│   │   └── SocketManager.ts        # Singleton WebSocket connection manager
│   ├── store/                      # Zustand state stores (7 stores)
│   ├── theme/                      # Color tokens, typography, spacing
│   ├── types/                      # TypeScript interfaces & type definitions
│   └── utils/                      # Helper functions & custom hooks
├── package.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── app.json                        # Expo configuration
└── eas.json                        # EAS Build profiles
```

## Screens (29)

### Authentication
| Screen | Description |
|--------|-------------|
| `AuthScreen` | Login & registration with animated transitions |

### Core Navigation (Bottom Tabs)
| Tab | Screen | Description |
|-----|--------|-------------|
| Home | `HomeScreen` | Event feed with hero carousel and category filters |
| Search | `SearchScreen` | Full-text event & user search |
| Hub | `CommunicationHubScreen` | Unified chats, friends, and discussions hub |
| Profile | Dynamic | Routes to User / Organizer / Admin profile based on role |

### Events
| Screen | Description |
|--------|-------------|
| `EventDetailScreen` | Full event view with ticket purchase, sharing |
| `CreateEventScreen` | Rich event creation form with image upload |
| `EditStudioScreen` | Manage and edit published events |
| `SavedEventsScreen` | Bookmarked events |
| `TicketDetailScreen` | Digital ticket with event details |

### Social & Messaging
| Screen | Description |
|--------|-------------|
| `ChatScreen` | Real-time 1:1 messaging with typing indicators |
| `FriendProfileScreen` | View friend's profile with actions |
| `FollowedOrganizersScreen` | List of followed organizers |

### Discussions
| Screen | Description |
|--------|-------------|
| `DiscussionsScreen` | Community forum feed |
| `PostThreadScreen` | Single discussion thread with comments |
| `CreateDiscussionScreen` | New discussion post form |
| `MyDiscussionsScreen` | User's own posts |

### Organizer Tools
| Screen | Description |
|--------|-------------|
| `OrganizerProfileScreen` | Organizer dashboard with stats overview |
| `AnalyticsScreen` | Sales & views charts with date filtering |
| `FinanceScreen` | Revenue tracking and transaction history |

### Admin Panel
| Screen | Description |
|--------|-------------|
| `AdminDashboardScreen` | Platform-wide metrics and analytics |
| `AdminEventsScreen` | Event moderation (approve/reject/delete) |
| `AdminPostsScreen` | Post moderation (approve/reject/delete) |
| `AdminUsersScreen` | User management (ban/unban, role changes) |
| `AdminProfileScreen` | Admin profile with quick-access panel links |

### Settings
| Screen | Description |
|--------|-------------|
| `ProfileScreen` | User profile with stats, tickets, interests |
| `EditProfileScreen` | Edit name, bio, avatar, interests |
| `SettingsScreen` | Theme toggle, logout |
| `SubscriptionScreen` | Subscription plan selection |
| `NotificationsScreen` | Notification center |

## State Management

Seven Zustand stores manage application state:

| Store | Responsibility |
|-------|---------------|
| `userStore` | Authentication, profile, tokens, tickets, favorites, follows |
| `eventStore` | Event feed, CRUD operations |
| `discussionStore` | Posts, comments, voting |
| `chatStore` | Conversations, messages, read status |
| `notificationStore` | Notification list and unread count |
| `adminStore` | Admin dashboard, moderation actions |
| `themeStore` | Dark/light theme with AsyncStorage persistence |

## Design System

The app features a custom **Liquid Glass** design system:

- **Glassmorphism effects** via Expo Blur and Linear Gradient overlays
- **Animated tab bar** with Reanimated 4-powered fluid transitions
- **Dark and Light modes** with smooth theme switching
- **Consistent spacing and typography** tokens across all screens
- **Animated hero section** with parallax carousel
- **Toast notifications** with slide-in animations

## Real-time Features

The `SocketManager` singleton handles all WebSocket communication:

- **Live messaging** — Instant message delivery with typing indicators
- **Online presence** — Real-time friend online/offline status
- **Live comments** — New comments appear instantly on joined threads
- **Live votes** — Vote counts update in real-time
- **Push notifications** — In-app notification delivery via socket events

## Setup

### Requirements
- Node.js 18+
- npm or yarn
- Expo Go app (for physical device testing)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5001/api` |

> **Physical device:** Replace `localhost` with your machine's LAN IP (e.g., `http://192.168.1.10:5001/api`).

### Running

```bash
# Start Expo dev server
npx expo start

# Platform-specific
npx expo start --android
npx expo start --ios
npx expo start --web
```

### Building

```bash
# Android APK (local)
npx eas build --platform android --profile preview --local

# iOS (requires Apple Developer account)
npx eas build --platform ios --profile preview
```

## License

Proprietary — All rights reserved.
