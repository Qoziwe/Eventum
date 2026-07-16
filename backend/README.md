# Eventum — Backend API

Production-grade REST API and real-time WebSocket server powering the Eventum event management platform.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | **Flask 3.1** (Python 3.9+) |
| Database | **SQLite** (dev) / **PostgreSQL** (prod) via SQLAlchemy ORM |
| Auth | **JWT** (Flask-JWT-Extended) + bcrypt password hashing |
| Real-time | **Flask-SocketIO** with eventlet async workers |
| Security | flask-limiter (rate limiting), bleach (XSS sanitization) |
| File uploads | Multipart/form-data with magic-byte content validation |
| CORS | Flask-CORS with configurable origin whitelist |

## API Overview

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Create a new account |
| `POST` | `/api/login` | Authenticate and receive JWT |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/<id>` | Get user profile (scoped by role) |
| `GET` | `/api/users/search?q=` | Search users by name/username |
| `PUT` | `/api/user/profile` | Update own profile |
| `POST` | `/api/user/interests` | Set interest tags |
| `POST` | `/api/user/upload-avatar` | Upload profile avatar |
| `POST` | `/api/user/become-organizer` | Request organizer role (admin-approved) |
| `POST` | `/api/user/follow` | Follow/unfollow an organizer |
| `POST` | `/api/user/favorite` | Save/unsave an event |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/events` | List approved events (+ own pending for organizers) |
| `POST` | `/api/events` | Create event (auto-sent to moderation) |
| `PUT` | `/api/events/<id>` | Update own event |
| `DELETE` | `/api/events/<id>` | Delete own event (rate-limited) |
| `POST` | `/api/events/<id>/view` | Track view (deduped, bot-filtered) |
| `POST` | `/api/events/upload-image` | Upload event cover image |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tickets/buy` | Purchase ticket (race-condition safe) |
| `GET` | `/api/tickets/my` | List purchased tickets |

### Discussion Forum
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/posts` | List / create discussion posts |
| `POST` | `/api/posts/<id>/vote` | Upvote or downvote (validated, atomic) |
| `GET/POST` | `/api/posts/<id>/comments` | List / add comments |

### Social & Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/friends` | List friends, incoming/outgoing requests |
| `POST` | `/api/friends/request` | Send friend request |
| `POST` | `/api/friends/respond` | Accept or reject request |
| `DELETE` | `/api/friends/<id>` | Remove friend |
| `GET` | `/api/chat/<user_id>` | Get chat history |
| `GET` | `/api/chats/conversations` | List all conversations |
| `POST` | `/api/chat/read` | Mark messages as read |

### Organizer Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/organizer/stats` | Summary stats (views, sales, revenue) |
| `GET` | `/api/organizer/analytics/sales` | Daily sales data |
| `GET` | `/api/organizer/analytics/views` | Daily view data |
| `GET` | `/api/organizer/events-report` | Per-event performance report |
| `GET` | `/api/organizer/transactions` | Transaction ledger |

### Admin Panel
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Platform-wide metrics |
| `GET` | `/api/admin/events` | All events with filtering |
| `PUT` | `/api/admin/events/<id>/moderate` | Approve or reject event |
| `DELETE` | `/api/admin/events/<id>` | Force-delete event |
| `GET` | `/api/admin/posts` | All posts with filtering |
| `PUT` | `/api/admin/posts/<id>/moderate` | Approve or reject post |
| `DELETE` | `/api/admin/posts/<id>` | Force-delete post |
| `GET` | `/api/admin/users` | All users with filtering |
| `PUT` | `/api/admin/users/<id>/ban` | Ban or unban user |
| `PUT` | `/api/admin/users/<id>/role` | Change user role |
| `GET` | `/api/admin/analytics/*` | Registration & event analytics |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List user notifications |
| `PUT` | `/api/notifications/read` | Mark as read |

## WebSocket Events

Real-time communication is handled via Socket.IO:

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Authenticate via JWT token in query params |
| `private_message` | Client → Server | Send a direct message |
| `message_received` | Server → Client | New incoming message |
| `message_sent` | Server → Client | Send confirmation |
| `typing` / `stop_typing` | Bidirectional | Typing indicators |
| `user_status_update` | Server → Client | Friend online/offline status |
| `new_comment` | Server → Client | Real-time comment on joined post |
| `vote_update` | Server → Client | Real-time vote change on joined post |
| `new_notification` | Server → Client | Push notification |
| `friend_request` | Server → Client | Friend request/accept event |

## Security

The API implements a hardened security model:

- **Rate Limiting** — Per-IP limits on login (10/min), registration (5/min), ticket purchase (10/min), event deletion (10/min), and a global 200 req/min limit
- **XSS Prevention** — Server-side HTML sanitization via `bleach` on all user-generated content (posts, comments, events, messages, profiles)
- **IDOR Protection** — User profile endpoints return scoped data based on requester role
- **CSRF/CSWH Protection** — WebSocket origin validation restricted to configured allowed origins
- **HTTP Security Headers** — CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy
- **Race Condition Handling** — Atomic operations with IntegrityError handling on ticket purchases and voting
- **Privilege Escalation Prevention** — Role upgrades require admin approval
- **Upload Validation** — Extension + magic-byte content type verification
- **JWT Security** — HS256 with configurable secret, 7-day expiry
- **Generic Error Responses** — No internal details leaked in 500 errors
- **Business Logic Protection** — Strict validation of numerical inputs prevents negative values in payment, price settings, and ticket quantity purchases.

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
# Edit .env with your values
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///database.db` |
| `JWT_SECRET_KEY` | Secret for JWT signing (min 32 chars) | — |
| `ADMIN_PASSWORD` | Password for seeded admin account | — |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:8081,http://localhost:19006` |
| `PUBLIC_URL` | Public URL for uploaded file links | `http://localhost:5001` |

### Database Initialization

```bash
python reset_db.py
```

This drops and recreates all tables, clears uploaded media, and seeds the admin account (`lekim@gmail.com` with the configured `ADMIN_PASSWORD`).

### Running

**Development:**
```bash
python app.py
# → Listening on http://0.0.0.0:5001
```

**Production:**
```bash
gunicorn --worker-class eventlet -w 1 app:app --bind 0.0.0.0:5001
```

> **Note:** eventlet workers are required for WebSocket support. Use exactly 1 worker to maintain in-memory socket state.

## Database Schema

The backend uses 11 database models:

| Model | Purpose |
|-------|---------|
| `User` | User accounts with roles, banning, following |
| `Event` | Events with moderation, views, pricing |
| `EventView` | Deduplicated view tracking |
| `Post` | Discussion forum posts with moderation |
| `PostVote` | Unique user votes (up/down) |
| `Comment` | Threaded comments on posts |
| `Ticket` | Event ticket purchases (unique per user-event) |
| `Notification` | In-app notification system |
| `Friendship` | Bidirectional friend requests |
| `Message` | Direct messages between users |
| `Interest` | User interest tags |

## License

Proprietary — All rights reserved.
