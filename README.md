# Eventum

Full-stack event management and social networking platform. Combines event discovery, ticket sales, real-time messaging, a discussion forum, organizer analytics, and comprehensive admin moderation into a single cross-platform application.

---

## Product Overview

Eventum connects event-goers with organizers. Users discover local events filtered by city, purchase tickets, save favorites, follow organizers, discuss topics in a community forum, and communicate via real-time private messaging. Organizers create and manage events with rich media, track performance through deep analytics dashboards, and monitor revenue. Administrators moderate all content, manage users, and oversee platform-wide metrics.

---

## Key Features

### User (Attendee) Features

- **City-Based Event Discovery** -- Browse and search events filtered by the user's selected city. The city selector is accessible from the app header and persists across sessions.
- **Event Search** -- Full-text search across event titles, descriptions, tags, categories, and user profiles.
- **Ticket Purchase** -- Buy tickets directly from the event detail screen. Race-condition-safe atomic purchases ensure no overselling. Each user can purchase one ticket per event.
- **Favorites** -- Save events to a personal "Saved Events" list for quick access later.
- **Follow Organizers** -- Follow event organizers to stay updated on their activity. View all followed organizers in a dedicated list.
- **Maps Deep-Linking** -- Tap on an event venue address to open it directly in Google Maps (Android) or Apple Maps (iOS).
- **Interest Tags** -- Set personal interest tags during onboarding or from the profile editor. Tags are used to personalize recommendations.
- **Digital Tickets** -- View purchased tickets with full event details from the profile screen.

### Social and Communication

- **Real-Time Private Messaging** -- One-on-one direct messaging powered by WebSocket (Socket.IO). Messages are delivered instantly with read receipts.
- **Typing Indicators** -- See when the other person is typing in a chat conversation.
- **Online/Offline Status** -- Real-time friend presence indicators (green dot = online) with last-seen timestamps.
- **Friend System** -- Send, accept, or reject friend requests. Remove existing friends. Managed from the Communication Hub.
- **Discussion Forum** -- Community discussion threads where users create posts, upvote/downvote, and add threaded comments.
- **Real-Time Comments and Votes** -- New comments and vote count changes appear instantly for all users viewing the same discussion thread.
- **In-App Notifications** -- Real-time push-like notifications for new messages, friend requests, event moderation status changes, and account actions. Delivered via WebSocket.

### Organizer Tools

- **Event Creation** -- Create events with title, description, cover image upload, ticket pricing, date/time picker (dynamic 2-year calendar, 60-minute interval time selection), location, city, district, age limit, categories, tags, and vibe selection.
- **Event Editing** -- Edit published events from the Edit Studio. Events under moderation cannot be edited.
- **Content Moderation Flow** -- All new events are sent to admin moderation. Organizers receive a notification when events are approved or rejected. Only approved events appear in the public feed.
- **Analytics Dashboard** -- View total event views, ticket sales count, total revenue, and number of published events. Charts display daily sales and daily views data with configurable time ranges (7, 14, 30 days).
- **Finance Module** -- Track ticket transaction history with buyer name, event title, quantity, total amount, and purchase date.
- **Per-Event Performance Report** -- View individual event metrics including views, tickets sold, revenue, and active/finished status.
- **Follower Base** -- Build an audience. Users follow organizers and the follower count is tracked.

### Admin Panel

- **Platform Dashboard** -- High-level metrics: total users, total events, total posts, registration trends, event creation trends, and top categories.
- **User Management** -- View all registered users. Filter by role. Ban or unban users with reason. Change user roles (Explorer, Organizer, Admin).
- **Event Moderation** -- View all events regardless of status. Approve or reject pending events with optional rejection reason. Force-delete events.
- **Post Moderation** -- View all discussion posts. Approve or reject posts. Force-delete posts.
- **Analytics** -- Registration analytics (daily new users over time) and event creation analytics (daily new events over time).
- **Platform Configuration** -- Manage cities, districts, categories, vibes, currency symbol, and platform name from the Admin Settings screen. All configuration is stored in the database and served to the frontend via a config API.
- **Instant Ban Enforcement** -- When an admin bans a user, the user's active session is immediately terminated via a WebSocket `account_banned` event, forcing an instant logout.

### Design and UX

- **Liquid Glass Design System** -- Custom glassmorphism visual language with blur effects, gradient overlays, and translucent surfaces using Expo Blur and Expo Linear Gradient.
- **Dark and Light Themes** -- Full dark/light mode toggle from the Settings screen. Theme preference is persisted in AsyncStorage across app restarts.
- **Animated Tab Bar** -- Custom tab bar with fluid Reanimated 4 animations.
- **Animated Hero Carousel** -- Parallax hero section on the Home screen showcasing featured events.
- **Toast Notifications** -- Slide-in toast messages for success/error/info feedback throughout the app.
- **60 FPS Tab Transitions** -- Heavy rendering is deferred via InteractionManager to guarantee smooth navigation transitions.

---

## Enterprise Security

The platform implements production-grade security:

- **XSS and Injection Protection** -- Server-side HTML sanitization (bleach) on all user-generated content: event titles, descriptions, posts, comments, messages, and profile fields.
- **DDoS and Brute-Force Mitigation** -- Per-IP rate limiting (flask-limiter) on login (10/min), registration (5/min), event deletion (10/min), and a global 200 req/min cap.
- **Concurrency and Race Condition Safety** -- Atomic database operations with `IntegrityError` handling for ticket purchases and vote logic. Prevents double-buying and double-voting under concurrent load.
- **WebSocket Security** -- Socket.IO origin validation restricted to configured allowed origins. Connection-flooding DoS prevention via per-user connection limits (max 3) and per-user message rate limits (max 10/sec).
- **Hardened HTTP Headers** -- Content-Security-Policy, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin.
- **Data Privacy (IDOR Protection)** -- Authorization scopes ensure users can only access their own private data. Admin-only endpoints are decorator-protected.
- **Upload Validation** -- File extension whitelist plus magic-byte content type verification for all uploaded images.
- **JWT Security** -- HS256 signing with configurable secret key, 7-day token expiry.
- **Generic Error Responses** -- 500 errors never leak internal stack traces or database details.
- **Business Logic Validation** -- Negative values rejected for ticket prices, quantities, and payment amounts.

---

## Technology Stack

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | React Navigation 7 (Native Stack + Bottom Tabs) |
| State Management | Zustand 5 (8 stores) |
| Real-Time | Socket.IO Client 4.8 |
| Animations | React Native Reanimated 4 |
| Styling | Custom Liquid Glass design system |
| Charts | React Native Chart Kit + SVG |
| Images | Expo Image (optimized loading with caching) |
| Storage | AsyncStorage (auth tokens and preferences) |

### Backend

| Component | Technology |
|-----------|------------|
| Framework | Flask 3.1 (Python 3.9+) |
| Database | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy ORM |
| Auth | JWT (Flask-JWT-Extended) + bcrypt password hashing |
| Real-Time | Flask-SocketIO with eventlet async workers |
| Security | flask-limiter, bleach, python-magic |
| File Uploads | Multipart/form-data with magic-byte content validation |
| CORS | Flask-CORS with configurable origin whitelist |

---

## Project Structure

```text
Eventum/
|-- backend/                            # Flask API and WebSocket Server
|   |-- app.py                          # Application entry point, all routes and SocketIO events
|   |-- models.py                       # SQLAlchemy database models (15 models)
|   |-- requirements.txt                # Python dependencies
|   |-- reset_db.py                     # Database reset and seed script
|   |-- .env.example                    # Environment config template (MODE switch)
|   |-- uploads/                        # Static file storage (avatars, event covers)
|
|-- frontend/                           # Expo React Native App
|   |-- App.tsx                         # Root: navigation tree, auth gate, theme provider
|   |-- app/
|   |   |-- api/apiClient.ts            # Centralized HTTP client with JWT injection
|   |   |-- components/                 # Reusable UI components (14 files, 7 subdirectories)
|   |   |-- data/                       # Static constants and category definitions
|   |   |-- screens/                    # Application screens (30 screens)
|   |   |-- services/SocketManager.ts   # Singleton WebSocket connection manager
|   |   |-- store/                      # Zustand state stores (8 stores)
|   |   |-- theme/                      # Color tokens, typography, spacing
|   |   |-- types/                      # TypeScript interfaces
|   |   |-- utils/                      # Helper functions and hooks
|   |-- .env.example                    # Frontend environment config template
|   |-- package.json                    # Node dependencies and scripts
|   |-- app.json                        # Expo configuration
|   |-- eas.json                        # EAS Build profiles
|
|-- .github/workflows/deploy.yml        # GitHub Pages deployment workflow
|-- SERVER.md                           # Production server deployment guide
|-- README.md                           # This file
|-- run.bat                             # Windows script to start both servers
```

---

## Setup and Installation

### Prerequisites

- Node.js v18+
- Python 3.9+
- Expo Go app on your phone (for physical device testing)

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Open `.env` and set `MODE=local` (default). Edit the `LOCAL_*` variables:

| Variable | Description |
|----------|-------------|
| `MODE` | `local` for development, `prod` for production |
| `LOCAL_DATABASE_URL` | SQLAlchemy connection string (default: SQLite) |
| `LOCAL_JWT_SECRET_KEY` | Secret for JWT signing (min 32 chars) |
| `LOCAL_ADMIN_PASSWORD` | Password for the seeded admin account |
| `LOCAL_CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `LOCAL_PUBLIC_URL` | Public URL for uploaded file links |

Initialize the database:

```bash
python reset_db.py
```

This recreates all tables, clears uploaded media, and seeds the admin account. Admin login: `lekim@gmail.com` with the password set in `LOCAL_ADMIN_PASSWORD`.

Start the server:

```bash
python app.py
# -> Listening on http://0.0.0.0:5001
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

For local development:

```env
EXPO_PUBLIC_API_URL=http://localhost:5001/api
```

If running on a physical device, replace `localhost` with your computer's LAN IP address in both `backend/.env` (`LOCAL_PUBLIC_URL` and `LOCAL_CORS_ORIGINS`) and `frontend/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:5001/api
```

Start the Expo development server:

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `a` (Android emulator) / `i` (iOS simulator).

### 3. Quick Start (Windows)

Run both backend and frontend in one step:

```bash
run.bat
```

---

## Environment Mode System

The backend `.env.example` uses a **MODE switch** that eliminates the need to comment/uncomment configuration blocks:

```env
MODE=local          # Switch to "prod" for production

LOCAL_DATABASE_URL=sqlite:///database.db
LOCAL_PUBLIC_URL=http://localhost:5001

PROD_DATABASE_URL=postgresql://user:pass@localhost/eventum_db
PROD_PUBLIC_URL=http://your-server-ip
```

Both configurations coexist in the same file. Changing `MODE=local` to `MODE=prod` instantly switches all settings. The backend resolves `DATABASE_URL` from `LOCAL_DATABASE_URL` or `PROD_DATABASE_URL` based on the active mode.

---

## Production Deployment

See [docs/SERVER.md](docs/SERVER.md) for a complete guide covering:

- Ubuntu server preparation
- Gunicorn systemd service setup
- Nginx reverse proxy with WebSocket support
- PostgreSQL database setup
- GitHub Pages frontend deployment with CI/CD

---

## Usage Highlights

- **Real-Time Features**: Both the Flask backend and the Expo app must be on the same local network for chat and live notifications.
- **Theme Toggle**: Dark/Light mode switch is in Settings. Preference persists across app restarts via AsyncStorage.
- **City Selection**: Change the active city from the Header. The event feed automatically filters based on the selection.
- **Admin Access**: Log in with `lekim@gmail.com` and the configured admin password to access the admin panel.
- **Organizer Mode**: Any user can upgrade to Organizer from their profile to start creating events.

---

## License

Proprietary. All rights reserved.
