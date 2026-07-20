# Eventum -- Frontend

Cross-platform mobile application built with React Native and Expo SDK 54. Supports iOS, Android, and Web from a single TypeScript codebase.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | React Navigation 7 (Native Stack + Bottom Tabs) |
| State | Zustand 5 (lightweight, hook-based stores) |
| Real-time | Socket.IO Client 4.8 |
| Animations | React Native Reanimated 4 |
| Styling | Custom Liquid Glass design system with dark/light themes |
| Charts | React Native Chart Kit + SVG |
| Images | Expo Image (optimized loading with caching) |
| Storage | AsyncStorage (persistent auth tokens and preferences) |

---

## App Architecture

```text
frontend/
|-- App.tsx                          # Root: navigation tree, auth gate, theme provider, toast system
|-- index.ts                         # Expo entry point registration
|-- app/
|   |-- api/
|   |   |-- apiClient.ts            # Centralized HTTP client with JWT injection, abort control, auto-logout on ban
|   |-- assets/                     # App icon, splash screen, adaptive icon, favicon
|   |-- components/
|   |   |-- LiquidUI/
|   |   |   |-- LiquidTabBar.tsx    # Custom animated bottom tab bar with glassmorphism
|   |   |   |-- LiquidGlassDrop.tsx # Reusable glass-effect container component
|   |   |-- Background/             # Animated background gradient layers
|   |   |-- Charts/                 # Analytics chart wrapper components
|   |   |-- DiscussionComponents/   # Post cards, comment thread renderers
|   |   |-- ProfileComponents/      # Profile sections, stat cards, ticket lists
|   |   |-- SubsComponents/         # Subscription plan cards
|   |   |-- ribbons/                # Decorative ribbon effects
|   |   |-- EventCard.tsx           # Event discovery card with image, price, vibe badge
|   |   |-- EventsGrid.tsx         # Grid layout for event card collections
|   |   |-- Header.tsx              # Universal header with notifications bell, city selector dropdown, search
|   |   |-- HeroSection.tsx         # Animated parallax hero carousel for featured events
|   |   |-- Avatar.tsx              # User avatar component with online indicator (green dot)
|   |   |-- Footer.tsx              # App footer component
|   |   |-- ToastProvider.tsx       # In-app toast notification system (success/error/info)
|   |-- data/
|   |   |-- categories.ts           # Category definitions (slug, label, icon)
|   |   |-- mockData.ts             # Event mock data for offline development
|   |   |-- discussionMockData.ts   # Discussion post mock data
|   |   |-- userMockData.ts         # User profile mock data
|   |-- screens/                    # All application screens (30 screens, detailed below)
|   |-- services/
|   |   |-- SocketManager.ts        # Singleton WebSocket manager (single connection, all real-time events)
|   |-- store/                      # Zustand state stores (8 stores, detailed below)
|   |-- theme/
|   |   |-- colors.ts               # Color tokens for dark and light themes
|   |-- types/
|   |   |-- index.ts                # TypeScript interfaces and type definitions
|   |-- utils/
|   |   |-- dateUtils.ts            # Date formatting helpers
|   |   |-- security.ts             # Input sanitization and validation utilities
|-- package.json                    # Node dependencies and scripts
|-- babel.config.js                 # Babel configuration with Reanimated plugin
|-- metro.config.js                 # Metro bundler configuration
|-- tsconfig.json                   # TypeScript configuration
|-- app.json                        # Expo configuration (icons, splash, bundle IDs)
|-- eas.json                        # EAS Build profiles (preview, production)
```

---

## Screens (30)

### Authentication

| Screen | File | Description |
|--------|------|-------------|
| AuthScreen | `AuthScreen.tsx` | Combined login and registration screen with animated transitions between forms. Email validation, password requirements, name and username fields. Stores JWT token in AsyncStorage on success. |

### Core Navigation (Bottom Tabs)

The app uses a 4-tab bottom navigation bar with a custom Liquid Glass animated tab bar:

| Tab | Root Screen | Description |
|-----|-------------|-------------|
| Home | HomeScreen | Main event feed with animated hero carousel. Events are filtered by the user's selected city (from configStore). Deferred rendering via InteractionManager ensures smooth tab transitions. |
| Search | SearchScreen | Full-text search across event titles, descriptions, tags, and user profiles. Displays results as event cards or user list items. |
| Communication | CommunicationHubScreen | Unified hub with 3 sub-sections: Chats (active conversations with last message preview and online indicators), Friends (confirmed friends, incoming/outgoing requests), and Discussions (community forum feed). |
| Profile | Dynamic | Routes to the appropriate profile screen based on user role: ProfileScreen (explorer), OrganizerProfileScreen (organizer), or AdminProfileScreen (admin). |

### Event Screens

| Screen | File | Description |
|--------|------|-------------|
| EventDetailScreen | `EventDetailScreen.tsx` | Full event view: cover image, title, description, organizer info with follow button, ticket purchase button, favorite toggle, native Maps deep-linking (opens venue address in Google Maps on Android or Apple Maps on iOS), share functionality. Tracks views via API. |
| CreateEventScreen | `CreateEventScreen.tsx` | Rich event creation form: title, description, cover image upload (via Expo Image Picker), ticket pricing (validates non-negative values), dynamic 2-year calendar date picker, 60-minute interval time picker, city dropdown (populated from configStore), district selector, location text field, age limit, multi-select categories, tags input, and vibe selection. |
| EditStudioScreen | `EditStudioScreen.tsx` | Lists all events created by the organizer with edit and delete actions. Edit opens a form pre-filled with event data. Delete removes the event after confirmation. |
| SavedEventsScreen | `SavedEventsScreen.tsx` | Displays the user's bookmarked/favorited events in a scrollable list. |
| TicketDetailScreen | `TicketDetailScreen.tsx` | Digital ticket view: event title, date, venue, ticket quantity, purchase date. Accessed from the profile ticket list. |

### Social and Messaging Screens

| Screen | File | Description |
|--------|------|-------------|
| ChatScreen | `ChatScreen.tsx` | Real-time one-on-one messaging. Messages delivered instantly via WebSocket. Shows typing indicators ("User is typing..."). Auto-scrolls to newest message. Marks messages as read when viewing. |
| FriendProfileScreen | `FriendProfileScreen.tsx` | View another user's profile with action buttons: send friend request, follow (if organizer), view mutual stats. Shows online/offline status. |
| FollowedOrganizersScreen | `FollowedOrganizersScreen.tsx` | Lists all organizers the user is following with avatars and names. |

### Discussion Screens

| Screen | File | Description |
|--------|------|-------------|
| DiscussionsScreen | `DiscussionsScreen.tsx` | Community forum feed. Browse discussion posts filtered by category. Shows post preview with upvote/downvote counts and comment count. |
| PostThreadScreen | `PostThreadScreen.tsx` | Full discussion thread. Displays the post content, upvote/downvote buttons (real-time via WebSocket), and threaded comment section with replies. New comments appear instantly for all viewers. |
| CreateDiscussionScreen | `CreateDiscussionScreen.tsx` | New discussion post form: content text area, category selector, and optional age limit. Content is validated before submission. |
| MyDiscussionsScreen | `MyDiscussionsScreen.tsx` | Lists all discussion posts created by the current user. |

### Organizer Tool Screens

| Screen | File | Description |
|--------|------|-------------|
| OrganizerProfileScreen | `OrganizerProfileScreen.tsx` | Organizer dashboard with summary stats (total views, tickets sold, revenue, events count) and quick-access navigation to Analytics, Finance, Edit Studio, and event creation. |
| AnalyticsScreen | `AnalyticsScreen.tsx` | Sales and views charts with configurable time range filters (7, 14, 30 days). Uses React Native Chart Kit for line/bar chart rendering. |
| FinanceScreen | `FinanceScreen.tsx` | Revenue tracking and transaction history table: buyer name, event title, quantity, total amount, and purchase date for each ticket sale. |

### Admin Panel Screens

| Screen | File | Description |
|--------|------|-------------|
| AdminDashboardScreen | `AdminDashboardScreen.tsx` | Platform-wide metrics dashboard: user statistics, event statistics (pending/approved/rejected), post statistics, ticket and message counts, total revenue. |
| AdminEventsScreen | `AdminEventsScreen.tsx` | Event moderation panel: list all events with status filters, search, category filter, sorting. Approve or reject events with optional reason. Force-delete events. |
| AdminPostsScreen | `AdminPostsScreen.tsx` | Post moderation panel: list all discussion posts with filters. Approve or reject posts. Force-delete posts. |
| AdminUsersScreen | `AdminUsersScreen.tsx` | User management panel: list all users with search, role filter, ban status filter. Ban/unban users with reason. Change user roles. |
| AdminProfileScreen | `AdminProfileScreen.tsx` | Admin profile with quick-access panel links to Dashboard, Events, Posts, Users, and Settings moderation screens. |
| AdminSettingsScreen | `AdminSettingsScreen.tsx` | Platform configuration management: CRUD operations for cities, districts, categories, vibes. Edit currency symbol and platform name. |

### Settings Screens

| Screen | File | Description |
|--------|------|-------------|
| ProfileScreen | `ProfileScreen.tsx` | User profile with personal stats, purchased tickets list, saved events count, interest tags, followed organizers count. Navigation to edit profile, settings, and content screens. |
| EditProfileScreen | `EditProfileScreen.tsx` | Edit name, username (unique validation), bio, phone, location, birth date, avatar (upload via image picker), and interest tags (multi-select). |
| SettingsScreen | `SettingsScreen.tsx` | Dark/light theme toggle switch and logout button. Theme preference is persisted via AsyncStorage. |
| SubscriptionScreen | `SubscriptionScreen.tsx` | Subscription plan selection UI with plan cards showing features and pricing. |
| NotificationsScreen | `NotificationsScreen.tsx` | Notification center: list of all notifications (messages, friend requests, moderation updates, account actions) with read/unread indicators. Mark individual or all as read. |

---

## State Management

Eight Zustand stores manage all application state:

| Store | File | Responsibilities |
|-------|------|-----------------|
| userStore | `userStore.ts` | Authentication (login, register, logout), JWT token management in AsyncStorage, user profile CRUD, tickets, favorites, follows, friend requests, friend status updates, ban detection |
| eventStore | `eventStore.ts` | Event feed fetching, create/update/delete events, view tracking |
| discussionStore | `discussionStore.ts` | Discussion post CRUD, voting (upvote/downvote), comments, real-time comment/vote handlers |
| chatStore | `chatStore.ts` | Conversations list, active chat messages, typing status, online/offline status tracking, message read status |
| notificationStore | `notificationStore.ts` | Notification list, unread count, add/mark-read operations |
| adminStore | `adminStore.ts` | Admin dashboard data, event/post/user moderation actions, analytics fetching |
| themeStore | `themeStore.ts` | Dark/light mode toggle with AsyncStorage persistence, color tokens accessor |
| configStore | `configStore.ts` | Platform configuration (cities, categories, vibes, currency), selected city state, price formatting helper |

---

## API Client

The centralized `apiClient.ts` handles all HTTP communication:

- **JWT Injection** -- Automatically attaches Bearer token from AsyncStorage to every request.
- **FormData Support** -- Detects FormData bodies and omits Content-Type header (lets the browser set multipart boundary).
- **Request Deduplication** -- AbortController-based: if a duplicate request is fired (same method + endpoint), the previous one is cancelled.
- **Auto-Logout on Ban** -- When the server returns 403 with `banned: true`, the client automatically logs out the user.
- **Error Handling** -- Extracts error messages from server responses and throws descriptive Error objects.

---

## SocketManager

The `SocketManager.ts` singleton manages a single WebSocket connection for the entire app:

- **Single Connection** -- One Socket.IO connection per authenticated session. No duplicate connections.
- **Auto-Reconnection** -- Infinite reconnection attempts with exponential backoff (1s to 5s).
- **Global Listeners** -- Registers handlers for all real-time events on connect:
  - `message_received` / `message_sent` -- Chat message delivery
  - `user_typing` / `user_stop_typing` -- Typing indicators
  - `user_status_update` -- Friend online/offline presence
  - `friend_request` -- Friend request notifications
  - `new_notification` -- Push notification delivery (including `account_banned` for instant logout)
  - `new_comment` -- Real-time comment delivery on discussion threads
  - `vote_update` -- Real-time vote count updates
- **Screen-Level Access** -- Exposes `getSocket()` for screens that need temporary per-screen listeners.
- **Clean Disconnect** -- Removes all listeners and disconnects on user logout.

---

## Design System

The app features a custom **Liquid Glass** design system:

- **Glassmorphism Effects** -- Expo Blur and Expo Linear Gradient create translucent, frosted-glass surfaces throughout the UI.
- **LiquidTabBar** -- Custom animated bottom tab bar replacing the default React Navigation tab bar. Uses Reanimated 4 for fluid selection indicator animations.
- **LiquidGlassDrop** -- Reusable container component with glass-effect styling (blur, gradient overlay, border radius, shadow).
- **Dark and Light Modes** -- Full theme system with two complete color palettes. Smooth switching via themeStore. Preference persisted in AsyncStorage.
- **Color Tokens** -- Centralized color definitions in `theme/colors.ts` for background, foreground, card, border, primary, accent, success, error, and warning colors.
- **Animated Hero Section** -- Parallax carousel on the Home screen with auto-scroll and gesture-driven navigation.
- **Toast Notifications** -- Slide-in animated toast messages (success, error, info) via ToastProvider context.
- **60 FPS Navigation** -- Heavy rendering tasks are deferred via `InteractionManager.runAfterInteractions()` to prevent frame drops during tab transitions.

---

## Setup

### Requirements

- Node.js 18+
- npm
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

> **Physical device**: Replace `localhost` with your machine's LAN IP (e.g., `http://192.168.1.10:5001/api`). Also update the backend `.env` to include this IP in `LOCAL_CORS_ORIGINS` and `LOCAL_PUBLIC_URL`.

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
# Android APK (local build)
npx eas build --platform android --profile preview --local

# iOS (requires Apple Developer account)
npx eas build --platform ios --profile preview
```

### Code Formatting

The project uses Prettier for consistent code style:

```bash
# Format all files
npm run format

# Check formatting without writing
npm run format:check

# Format staged files (pre-commit)
npm run precommit
```

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `expo start` | Start Expo dev server |
| `android` | `expo run:android` | Run on Android device/emulator |
| `ios` | `expo run:ios` | Run on iOS simulator |
| `web` | `expo start --web` | Start web version |
| `format` | `prettier --write .` | Format all project files |
| `format:check` | `prettier --check .` | Check formatting |
| `precommit` | `pretty-quick --staged` | Format staged files |

---

## License

Proprietary. All rights reserved.
