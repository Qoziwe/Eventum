# Eventum Mobile

Eventum Mobile is a comprehensive, feature-rich mobile application built for event management, discovery, and networking. It empowers users to discover local events, connect with friends, purchase tickets, and interact in real-time. For event organizers, it offers robust tools for creating events, managing ticket sales, monitoring advanced analytics, and broadcasting updates to followers. The platform also includes comprehensive admin capabilities for platform moderation and oversight.

---

## 🚀 Key Features

### 👤 For Users (Attendees)
- **Event Discovery:** Search and browse upcoming events based on interests, tags, and location.
- **Social Networking:** Follow friends, view their profiles, and connect via real-time WebSocket messaging and discussions.
- **Ticketing:** Purchase, hold, and manage digital tickets.
- **Interactions:** "Favorite" events, comment on public discussion threads, and receive real-time push-like notifications.
- **Personalization:** Liquid Glass Dark/Light theme toggle, beautiful Skia animations, and customizable user avatars.

### 🏢 For Organizers
- **Event Management:** Create, edit, and launch events with rich media, cover photos, and custom ticketing tiers.
- **Deep Analytics:** Access dedicated organizer dashboards showing deep insights (Views, Sales, Transactions, Follower engagement).
- **Audience Engagement:** Build a follower base and start community discussions.
- **Finance Module:** Track ticket sales, subscriptions, and revenue natively from the mobile application.

### 🛡️ For Administrators
- **Platform Moderation:** View and manage all users, ban/unban abusive accounts.
- **Content Management:** Oversee all events and discussion threads across the platform.
- **Admin Dashboards:** High-level metrics to gauge system health and overall activity.

---

## 🛠️ Technology Stack

The application is architected with a decoupled frontend and backend, using modern, performant libraries.

### Frontend
- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation:** React Navigation (Native Stack, Bottom Tabs)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Styling & UI:** Custom "Liquid Glass" Skia-based styling, Reanimated 4, Expo Blur, Expo Linear Gradient
- **Real-Time Data:** Socket.IO Client for WebSockets
- **Data Visualization:** React Native Chart Kit

### Backend
- **Framework:** [Flask](https://flask.palletsprojects.com/) (Python)
- **Database:** SQLite with [SQLAlchemy](https://www.sqlalchemy.org/) ORM (recently migrated from PostgreSQL for ease of development)
- **Authentication:** JWT via [Flask-JWT-Extended](https://flask-jwt-extended.readthedocs.io/), Password hashing via `bcrypt` / `Flask-Bcrypt`
- **Real-Time Data:** `Flask-SocketIO` / `eventlet` for handling live chat and real-time feeds
- **File Uploads:** Secure multipart/form-data endpoints for Avatar and Event Cover Image uploads

---

## 📁 Project Structure

```text
EventummMobile/
│
├── backend/                            # Flask API & WebSocket Server
│   ├── app.py                          # Main application, Routes, SocketIO events
│   ├── models.py                       # SQLAlchemy Database Models
│   ├── requirements.txt                # Python dependencies
│   ├── reset_db.py                     # Script to reset/seed the database
│   └── uploads/                        # Static file storage (avatars, events)
│
├── frontend/                           # Expo React Native App
│   ├── App.tsx                         # Entry point
│   ├── app/
│   │   ├── api/                        # Axios/Fetch API client wrappers
│   │   ├── components/                 # Reusable UI component library (Cards, Layouts, LiquidUI)
│   │   ├── data/                       # Static mock data & constants
│   │   ├── screens/                    # Application screens (Auth, Home, Analytics, Chats, etc.)
│   │   ├── services/                   # Background services & SocketIO managers
│   │   ├── store/                      # Zustand state stores (themeStore, authStore, etc.)
│   │   ├── theme/                      # Global theme and styling definitions
│   │   ├── types/                      # TypeScript definitions and interfaces
│   │   └── utils/                      # Helper functions and hooks
│   ├── package.json                    # Node dependencies and scripts
│   └── babel.config.js                 # Babel transpile configurations
```

---

## ⚙️ Setup and Installation

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Expo CLI (`npm install -g expo-cli`)

### 1. Backend Setup

Open a terminal and navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Set up Environment Variables. Create a `.env` file in the `backend/` directory:
```env
JWT_SECRET_KEY=your_super_secret_jwt_key
# Other configurations as needed
```

Initialize/Reset the Database:
```bash
python reset_db.py
```

Start the Flask Server:
```bash
python app.py
```
*The backend will be running on `http://127.0.0.1:5000` or `http://0.0.0.0:5000`*

### 2. Frontend Setup

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install NPM packages:
```bash
npm install
```

Start the Expo Development Server:
```bash
npx expo start
```
*Use the Expo Go application on your iOS/Android device to scan the generated QR code, or press `a`/`i` to run in a local emulator.*

---

## 💡 Usage Highlights

- **Running Real-time Features:** Ensure both the Flask WebSocket backend and the Expo app are running on the same local network for the chat features to function seamlessly.
- **Switching Themes:** Find the Dark/Light mode toggle in the **Settings** tab. It uses persistent AsyncStorage to save visual preferences across app restarts. 

## 📝 License

This project is proprietary and intended for internal use and development.
