# Eventum -- Backend API

Production-grade REST API and real-time WebSocket server powering the Eventum event management platform.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Flask 3.1 (Python 3.9+) |
| Database | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy ORM |
| Auth | JWT (Flask-JWT-Extended) + bcrypt password hashing |
| Real-time | Flask-SocketIO with eventlet async workers |
| Security | flask-limiter (rate limiting), bleach (XSS sanitization) |
| File uploads | Multipart/form-data with magic-byte content validation |
| CORS | Flask-CORS with configurable origin whitelist |

## Environment Mode System

The backend uses a **MODE switch** in `.env` to toggle between local and production configuration. A single `env()` helper resolves variables from the correct prefix:

```env
MODE=local                    # "local" or "prod"

LOCAL_DATABASE_URL=sqlite:///database.db
LOCAL_JWT_SECRET_KEY=...
LOCAL_PUBLIC_URL=http://localhost:5001

PROD_DATABASE_URL=postgresql://user:pass@localhost/eventum_db
PROD_JWT_SECRET_KEY=...
PROD_PUBLIC_URL=http://your-server-ip
```

When `MODE=local`, the app reads `LOCAL_DATABASE_URL`. When `MODE=prod`, it reads `PROD_DATABASE_URL`. Both sets of values coexist in the same file. Backward-compatible: unprefixed keys (e.g., plain `DATABASE_URL`) are used as fallback.

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/register` | None | 5/min | Create a new account. Returns JWT token and full user object. Validates email format and password length (min 6). |
| POST | `/api/login` | None | 10/min | Authenticate with email and password. Returns JWT token and user object. Returns 403 if account is banned. |

### User Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/<id>` | JWT | Get user profile. Returns full data for self/admin, limited public profile for others (IDOR protection). |
| GET | `/api/users/search?q=` | JWT | Search users by name or username. Returns up to 20 results with id, name, username, avatar, role. |
| PUT | `/api/user/profile` | JWT | Update own profile: name, username (unique check), bio, location, phone, avatar, birth date, interests. All text fields are XSS-sanitized. |
| POST | `/api/user/interests` | JWT | Set user interest tags. Replaces existing tags with the provided list. |
| POST | `/api/user/upload-avatar` | JWT | Upload profile avatar image. Validates file extension and magic bytes. Deletes previous avatar. Returns new avatar URL. |
| POST | `/api/user/become-organizer` | JWT | Upgrade user role to organizer. Enables event creation and analytics access. |
| POST | `/api/user/follow` | JWT | Toggle follow/unfollow an organizer. Returns updated list of followed organizer IDs. |
| POST | `/api/user/favorite` | JWT | Toggle save/unsave an event to favorites. Returns updated list of saved event IDs. |

### Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events` | Optional | List approved events. Organizers also see their own pending/rejected events. Returns full event data with formatted dates. |
| POST | `/api/events` | JWT | Create event with title, description, cover image, pricing, date/time, location, city, district, age limit, categories, tags, vibe. Auto-sent to moderation (status: pending). Price must be non-negative. |
| PUT | `/api/events/<id>` | JWT | Update own event. Cannot edit while under moderation. Only the event organizer can edit. |
| DELETE | `/api/events/<id>` | JWT | Delete own event. Rate-limited to 10/min. Cleans up related views, tickets, and cover image. |
| POST | `/api/events/<id>/view` | Optional | Track event view. Deduplicated per user (24h) or per IP (1h for anonymous). Bot-filtered by User-Agent. Rate-limited to 10 views/min per IP. |
| POST | `/api/events/upload-image` | JWT | Upload event cover image. Validates extension + magic bytes. Returns image URL. |

### Tickets

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/tickets/buy` | JWT | 10/min | Purchase ticket for an event. Race-condition safe with IntegrityError handling. Validates quantity > 0. One ticket per user per event. |
| GET | `/api/tickets/my` | JWT | -- | List all tickets purchased by the authenticated user. |

### Discussion Forum

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/posts` | Optional | List all approved discussion posts. Authors also see their own pending posts. Returns post data with comment count and vote info. |
| POST | `/api/posts` | JWT | Create a new discussion post with content, category, and optional age limit. Content is XSS-sanitized. |
| POST | `/api/posts/<id>/vote` | JWT | Upvote or downvote a post. Atomic operation: toggles existing vote or changes direction. Prevents self-voting. Broadcasts vote_update via WebSocket. |
| GET | `/api/posts/<id>/comments` | Optional | List all comments on a post. |
| POST | `/api/posts/<id>/comments` | JWT | Add a comment to a post. Supports threaded replies via parentId and depth. Content is XSS-sanitized. Broadcasts new_comment via WebSocket. |

### Social and Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/friends` | JWT | List confirmed friends, incoming requests, and outgoing requests. |
| POST | `/api/friends/request` | JWT | Send a friend request. Creates notification and sends real-time WebSocket event to target. |
| POST | `/api/friends/respond` | JWT | Accept or reject a friend request. Sends notification on accept. |
| DELETE | `/api/friends/<id>` | JWT | Remove an existing friend. Notifies the other user. |
| GET | `/api/chat/<user_id>` | JWT | Get chat history with a specific user. Returns messages ordered by timestamp. |
| GET | `/api/chats/conversations` | JWT | List all conversations. Returns last message, unread status, online indicator, and last-seen timestamp for each conversation partner. |
| POST | `/api/chat/read` | JWT | Mark all messages from a specific sender as read. |

### Organizer Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/organizer/stats` | JWT | Summary stats: total views, tickets sold, total revenue, events count. Restricted to organizers and admins. |
| GET | `/api/organizer/analytics/sales?days=30` | JWT | Daily sales data (count and revenue) for the specified time range. Cross-database compatible. |
| GET | `/api/organizer/analytics/views?days=30` | JWT | Daily view count data for the specified time range. Cross-database compatible. |
| GET | `/api/organizer/events-report` | JWT | Per-event performance report: views, tickets sold, revenue, active/finished status. |
| GET | `/api/organizer/transactions` | JWT | Transaction ledger: buyer name, event, quantity, amount, date for all ticket sales on organizer's events. |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | JWT | List all notifications for the authenticated user, ordered by newest first. |
| PUT | `/api/notifications/read` | JWT | Mark a specific notification as read (by ID), or mark all unread notifications as read. |

### Admin Panel

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | Admin | Platform-wide metrics: user counts (total, organizers, explorers, banned), event counts (total, pending, approved, rejected), post counts, total tickets, total messages, total revenue. |
| GET | `/api/admin/events` | Admin | List all events with optional filters: status, search (title), category, organizerId, sortBy (newest/oldest/views). |
| PUT | `/api/admin/events/<id>/moderate` | Admin | Approve or reject an event. On approve: notifies organizer and all followers. On reject: notifies organizer with reason. |
| DELETE | `/api/admin/events/<id>` | Admin | Force-delete an event. Cleans up views, tickets, and cover image. |
| GET | `/api/admin/posts` | Admin | List all posts with optional filters: status, search, category, sortBy (newest/oldest/popular). |
| PUT | `/api/admin/posts/<id>/moderate` | Admin | Approve or reject a post. Notifies author. |
| DELETE | `/api/admin/posts/<id>` | Admin | Force-delete a post. Cascades to comments and votes. |
| GET | `/api/admin/users` | Admin | List all users with optional filters: search (name/username/email), userType, banned status, sortBy (newest/oldest/name). Returns event count, post count, and follower count per user. |
| PUT | `/api/admin/users/<id>/ban` | Admin | Ban or unban a user. On ban: sends real-time `account_banned` WebSocket event, forcing instant session termination. |
| PUT | `/api/admin/users/<id>/role` | Admin | Change user role to explorer or organizer. |
| GET | `/api/admin/analytics/registrations?days=30` | Admin | Daily new user registrations over time. Cross-database compatible with fallback. |
| GET | `/api/admin/analytics/events-created?days=30` | Admin | Daily new events created over time. Cross-database compatible with fallback. |
| GET | `/api/admin/analytics/overview` | Admin | Top categories, top organizers, user type distribution, vibe distribution, total views, average event price, free vs paid event counts. |

### Platform Configuration (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/config` | None | Public endpoint. Returns currency symbol, platform name, cities (with districts), categories, and vibes. Used by the frontend on startup. |
| GET/PUT | `/api/admin/config` | Admin | Read or update platform-wide key-value settings (currency_symbol, platform_name). |
| GET/POST | `/api/admin/cities` | Admin | List or create cities. |
| PUT/DELETE | `/api/admin/cities/<id>` | Admin | Update or delete a city (cascades to districts). |
| GET/POST | `/api/admin/districts` | Admin | List or create districts (linked to a city). |
| PUT/DELETE | `/api/admin/districts/<id>` | Admin | Update or delete a district. |
| GET/POST | `/api/admin/categories` | Admin | List or create event/discussion categories with slug, label, icon, sort order, and type (event/discussion/both). |
| PUT/DELETE | `/api/admin/categories/<id>` | Admin | Update or delete a category. |
| GET/POST | `/api/admin/vibes` | Admin | List or create event atmosphere types with slug, label, icon, and sort order. |
| PUT/DELETE | `/api/admin/vibes/<id>` | Admin | Update or delete a vibe. |

---

## WebSocket Events

Real-time communication is handled via Socket.IO (eventlet async mode):

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client -> Server | Authenticate via JWT token in query params. Auto-joins user's private room. Updates last_seen. Notifies friends of online status. Limited to 3 concurrent connections per user. |
| `disconnect` | Client -> Server | Updates last_seen. Notifies friends of offline status. Decrements connection counter. |
| `private_message` | Client -> Server | Send a direct message. Content is XSS-sanitized. Rate-limited to 10 messages/second per user. Creates notification if recipient is not viewing the sender's chat. |
| `message_received` | Server -> Client | Delivered to the recipient when a new message arrives. |
| `message_sent` | Server -> Client | Sent back to the sender as delivery confirmation. |
| `typing` / `stop_typing` | Bidirectional | Typing indicators forwarded to the recipient's room. |
| `user_status_update` | Server -> Client | Friend online/offline status change with lastSeen timestamp. |
| `enter_chat` / `leave_chat` | Client -> Server | Track which chat the user is actively viewing (suppresses duplicate notifications). |
| `join_post` / `leave_post` | Client -> Server | Subscribe/unsubscribe to real-time updates for a discussion thread. |
| `new_comment` | Server -> Client | Real-time comment delivery to all users viewing the same post thread. |
| `vote_update` | Server -> Client | Real-time vote count change broadcast to all users viewing the same post thread. |
| `new_notification` | Server -> Client | Push notification delivery for messages, friend requests, moderation status, and account actions. |
| `friend_request` | Server -> Client | Friend request sent/accepted event. |
| `friend_removed` | Server -> Client | Friend removal notification. |

---

## Security

| Measure | Implementation |
|---------|---------------|
| Rate Limiting | Per-IP: login 10/min, registration 5/min, ticket purchase 10/min, event deletion 10/min, global 200/min |
| XSS Prevention | `bleach.clean()` with zero allowed tags on all user-generated text fields |
| IDOR Protection | User profile endpoints return scoped data based on requester identity and role |
| CSRF/CSWH Protection | WebSocket origin validation restricted to configured allowed origins |
| HTTP Security Headers | CSP, HSTS (1 year), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin |
| Race Condition Handling | Atomic operations with `IntegrityError` rollback on ticket purchases and votes |
| Privilege Escalation | Role changes require admin approval; admin endpoints are decorator-protected |
| Upload Validation | Extension whitelist (png, jpg, jpeg, gif) + magic-byte MIME type verification |
| JWT Security | HS256 with configurable secret, 7-day expiry |
| Generic Error Responses | 500 errors never leak stack traces or database details |
| Business Logic | Negative values rejected for prices, quantities, and payments |
| WebSocket DoS | Max 3 connections per user, max 10 messages/second per user |
| Ban Enforcement | Banned users receive real-time `account_banned` event forcing instant logout |

---

## Database Schema

The backend uses 15 database models:

| Model | Purpose |
|-------|---------|
| User | User accounts with roles (explorer/organizer/admin), city, banning, following, interests |
| Event | Events with city location, moderation status, views, pricing, categories, tags, vibe |
| EventView | Deduplicated view tracking with user, IP, and timestamp |
| Post | Discussion forum posts with moderation status, upvotes, downvotes |
| PostVote | Unique user votes (up/down) on posts |
| Comment | Threaded comments on posts with depth tracking |
| Ticket | Event ticket purchases (unique per user-event pair) |
| Notification | In-app notification system with type, content, and read status |
| Friendship | Bidirectional friend requests with status (pending/accepted) |
| Message | Direct messages between users with read receipts |
| Interest | User interest tags (many-to-many with User) |
| PlatformConfig | Key-value store for platform-wide settings |
| City | Admin-managed cities with sort order |
| District | Admin-managed districts grouped by city |
| Category | Admin-managed event/discussion categories with slug, icon, and type |
| Vibe | Admin-managed event atmosphere types |

Association tables: `follows`, `user_interests`, `favorites`.

---

## Setup

### Requirements

- Python 3.9+
- pip

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env -- set MODE=local and fill in LOCAL_* values
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MODE` | Environment mode: `local` or `prod` | `local` |
| `LOCAL_DATABASE_URL` | SQLAlchemy connection string for development | `sqlite:///database.db` |
| `LOCAL_JWT_SECRET_KEY` | Secret for JWT signing (min 32 chars) | -- |
| `LOCAL_ADMIN_PASSWORD` | Password for seeded admin account | -- |
| `LOCAL_CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:8081,http://localhost:19006` |
| `LOCAL_PUBLIC_URL` | Public URL for uploaded file links | `http://localhost:5001` |
| `PROD_DATABASE_URL` | PostgreSQL connection string for production | -- |
| `PROD_JWT_SECRET_KEY` | Production JWT secret (min 64 chars recommended) | -- |
| `PROD_ADMIN_PASSWORD` | Production admin password | -- |
| `PROD_CORS_ORIGINS` | Production frontend URL | -- |
| `PROD_PUBLIC_URL` | Production server URL or domain | -- |

### Database Initialization

```bash
python reset_db.py
```

This drops and recreates all tables, clears uploaded media directories, seeds the admin account (`lekim@gmail.com` with the configured admin password), and creates default platform configuration (currency symbol and platform name).

### Running

**Development:**

```bash
python app.py
# -> Listening on http://0.0.0.0:5001
```

**Production:**

```bash
pip install "gunicorn==21.2.0"
gunicorn --worker-class eventlet -w 1 app:app --bind 0.0.0.0:5001
```

> Note: eventlet workers are required for WebSocket support. Use exactly 1 worker to maintain in-memory socket state.

---

## License

Proprietary. All rights reserved.
