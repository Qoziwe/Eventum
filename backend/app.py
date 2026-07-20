from flask import Flask, request, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, decode_token, verify_jwt_in_request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import PlatformConfig, City, District, Category, Vibe, db, bcrypt, User, Event, Post, Ticket, Comment, PostVote, EventView, Interest, user_interests, favorites, Friendship, Message, Notification
import datetime
import os
import functools
import re
import magic
import bleach
from werkzeug.utils import secure_filename
from sqlalchemy import func as sa_func
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv(override=True)

# ── MODE-aware environment resolution ──────────────────────────
# Reads MODE from .env (default: "local"). When MODE=local, variables
# are resolved from LOCAL_* keys; when MODE=prod, from PROD_* keys.
# Falls back to the unprefixed key for backward-compatible .env files.
_MODE = os.getenv('MODE', 'local').strip().lower()

def env(key: str, default: str = '') -> str:
    """Resolve an env variable respecting the active MODE prefix."""
    prefix = 'LOCAL_' if _MODE == 'local' else 'PROD_'
    return os.getenv(f'{prefix}{key}') or os.getenv(key, default)
# ───────────────────────────────────────────────────────────────

app = Flask(__name__)
app.url_map.strict_slashes = False

# CORS
cors_origins = env('CORS_ORIGINS', '*').split(',')
CORS(app, resources={
    r"/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
        "supports_credentials": True
    }
})

# Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per minute"],
    storage_uri="memory://"
)

# SocketIO
ws_allowed_origins = env('CORS_ORIGINS', 'http://localhost:8081,http://localhost:19006').split(',')
socketio = SocketIO(app, cors_allowed_origins=ws_allowed_origins, async_mode='eventlet')

app.config['SQLALCHEMY_DATABASE_URI'] = env('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = env('JWT_SECRET_KEY')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB limit


# Настройка папок для загрузок
UPLOAD_ROOT = 'uploads'
AVATARS_FOLDER = os.path.join(UPLOAD_ROOT, 'avatars')
EVENTS_FOLDER = os.path.join(UPLOAD_ROOT, 'events')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Публичный URL сервера для формирования ссылок на загруженные файлы
# request.host_url возвращает localhost при работе за reverse proxy
PUBLIC_URL = env('PUBLIC_URL', 'http://localhost:5001')
if PUBLIC_URL.endswith('/'):
    PUBLIC_URL = PUBLIC_URL[:-1]

def public_upload_url(url):
    if not url:
        return url
    if '/uploads/' in url:
        return f"{PUBLIC_URL}/uploads/{url.split('/uploads/', 1)[1].lstrip('/')}"
    if url.startswith('/uploads/'):
        return f"{PUBLIC_URL}{url}"
    if url.startswith('uploads/'):
        return f"{PUBLIC_URL}/{url}"
    return url

for folder in [UPLOAD_ROOT, AVATARS_FOLDER, EVENTS_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app.config['UPLOAD_ROOT'] = UPLOAD_ROOT
app.config['AVATARS_FOLDER'] = AVATARS_FOLDER
app.config['EVENTS_FOLDER'] = EVENTS_FOLDER

def is_safe_file(file_storage):
    # Check extension
    filename = secure_filename(file_storage.filename)
    if not ('.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
        return False
    
    # Check content type (magic bytes)
    try:
        file_storage.seek(0) # Reset pointer
        # Read a chunk to detect type
        header = file_storage.read(2048)
        file_storage.seek(0) # Reset again
        
        mime = magic.from_buffer(header, mime=True)
        if mime not in ['image/jpeg', 'image/png', 'image/gif']:
            return False
            
        return True
    except Exception as e:
        print(f"File magic check failed: {e}")
        return False

def validate_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

def validate_password(password):
    return len(password) >= 6 # Basic check, can be enhanced


def sanitize_html(text):
    """Strip ALL HTML tags from user input to prevent Stored XSS (Vuln 4.2)."""
    if not text:
        return text
    return bleach.clean(text, tags=[], attributes={}, strip=True)

# Vuln 4.14 — Security HTTP headers
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' wss: ws:;"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# Vuln 4.10 — Generic error handler (no internal details leaked)
@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(429)
def ratelimit_error(error):
    return jsonify({"error": "Too many requests. Please try again later."}), 429

def delete_user_avatar(avatar_url):
    if not avatar_url:
        return
    try:
        filename = secure_filename(avatar_url.split('/')[-1])
        file_path = os.path.join(AVATARS_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

def delete_event_image(image_url):
    if not image_url:
        return
    try:
        filename = secure_filename(image_url.split('/')[-1])
        file_path = os.path.join(EVENTS_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_ROOT'], filename)

@app.route('/api/user/upload-avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and is_safe_file(file):
        # Delete old avatar if exists
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if user and user.avatar_url:
            # Extract filename from URL if it's local
            if 'uploads/avatars' in user.avatar_url:
                 delete_user_avatar(user.avatar_url)
            
        ext = file.filename.rsplit('.', 1)[1].lower()
        new_filename = f"avatar_{user_id}_{int(datetime.datetime.utcnow().timestamp())}.{ext}"
        new_filename = secure_filename(new_filename)
        
        save_path = os.path.join(app.config['AVATARS_FOLDER'], new_filename)
        file.save(save_path)
        
        # relative URL for serving
        avatar_url = f"{PUBLIC_URL}/uploads/avatars/{new_filename}"
        
        if user:
            user.avatar_url = avatar_url
            db.session.commit()
            
        return jsonify({"avatarUrl": avatar_url})
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/api/events/upload-image', methods=['POST'])
@jwt_required()
def upload_event_image():
    if 'image' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and is_safe_file(file):
        user_id = get_jwt_identity()
        ext = file.filename.rsplit('.', 1)[1].lower()
        new_filename = f"event_{user_id}_{int(datetime.datetime.utcnow().timestamp())}.{ext}"
        new_filename = secure_filename(new_filename)
        
        save_path = os.path.join(app.config['EVENTS_FOLDER'], new_filename)
        file.save(save_path)
        
        image_url = f"{PUBLIC_URL}/uploads/events/{new_filename}"
        return jsonify({"imageUrl": image_url})
    
    return jsonify({"error": "Invalid file type"}), 400



db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)

@app.before_request
def check_banned_user():
    if request.path.startswith('/api') and request.method != 'OPTIONS':
        # Let login and register go through so they get the proper login ban message or can't login
        if request.endpoint and ('login' in request.endpoint or 'register' in request.endpoint):
            return
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                user = db.session.get(User, user_id)
                if user and user.is_banned:
                    return jsonify({'error': f'You are banned: {user.ban_reason or "Rule violation"}', 'banned': True}), 403
        except Exception:
            pass


def admin_required(fn):
    @functools.wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def user_to_dict(user):
    initials = ''.join([n[0] for n in user.name.split() if n]).upper()[:2] if user.name else "UN"
    interests = [i.name for i in user.interests]
    is_online = user.id in connected_users
    last_seen_str = user.last_seen.isoformat() if user.last_seen else None
    
    return {
        "id": user.id, "name": user.name, "username": user.username, "email": user.email,
        "phone": user.phone or "", "userType": user.user_type, "location": user.location or "Almaty",
        "bio": user.bio or "", "avatarUrl": public_upload_url(user.avatar_url) or "", "avatarInitials": initials,
        "subscriptionStatus": user.subscription_status or "none", "subscriptionType": "None",
        "role": "Organizer" if user.user_type == 'organizer' else "Explorer",
        "interests": interests,
        "stats": {"eventsAttended": len(user.tickets), "communitiesJoined": 0}, 
        "hasTickets": len(user.tickets) > 0,
        "savedEventIds": [e.id for e in user.saved_events],
        "purchasedTickets": [
            {"id": t.id, "eventId": t.event_id, "quantity": t.quantity, "purchaseDate": t.purchase_date.isoformat(), "eventTitle": t.event.title if t.event else ""} 
            for t in user.tickets
        ],
        "followingOrganizerIds": [u.id for u in user.following], "birthDate": user.birth_date or "2000-01-01",
        "isOnline": is_online,
        "lastSeen": last_seen_str,
        "isAdmin": user.is_admin or False,
        "isBanned": user.is_banned or False
    }

# --- SOCKET EVENTS ---
connected_users = set()

# Vuln 4.16 — WebSocket DoS prevention
ws_message_timestamps = {}  # user_id -> list of timestamps
WS_MAX_MESSAGES_PER_SECOND = 10
WS_MAX_CONNECTIONS_PER_USER = 3
user_connection_count = {}  # user_id -> count of active connections

def ws_rate_check(user_id):
    """Return True if rate limit exceeded."""
    import time
    now = time.time()
    if user_id not in ws_message_timestamps:
        ws_message_timestamps[user_id] = []
    timestamps = ws_message_timestamps[user_id]
    # Keep only last second
    timestamps[:] = [t for t in timestamps if now - t < 1.0]
    if len(timestamps) >= WS_MAX_MESSAGES_PER_SECOND:
        return True
    timestamps.append(now)
    return False



active_chats = {} # key: user_id (str), value: target_user_id (str)
sid_to_user = {} # key: sid, value: user_id

@socketio.on('connect')
def on_connect():
    token = request.args.get('token')
    if not token and request.args.get('auth'):
         pass 

    if not token:
        return False

    try:
        decoded = decode_token(token)
        user_id = decoded['sub']
        
        # Vuln 4.16 — limit connections per user
        current_count = user_connection_count.get(user_id, 0)
        if current_count >= WS_MAX_CONNECTIONS_PER_USER:
            return False
        user_connection_count[user_id] = current_count + 1
        
        sid_to_user[request.sid] = user_id
        connected_users.add(user_id)
        
        # Auto-join user's private room
        join_room(f"user_{user_id}")

        # Update last_seen
        user = db.session.get(User, user_id)
        if user:
            user.last_seen = datetime.datetime.utcnow()
            db.session.commit()
            
            # Notify friends
            friends_q = Friendship.query.filter(
                ((Friendship.user_id_1 == user_id) | (Friendship.user_id_2 == user_id)) &
                (Friendship.status == 'accepted')
            ).all()
            
            for f in friends_q:
                friend_id = f.user_id_2 if f.user_id_1 == user_id else f.user_id_1
                socketio.emit('user_status_update', {
                    "userId": user_id,
                    "isOnline": True,
                    "lastSeen": None
                }, room=f"user_{friend_id}")
                
    except Exception as e:
        print(f"Connection rejected: {e}")
        return False

@socketio.on('disconnect')
def on_disconnect():
    if request.sid in sid_to_user:
        user_id = sid_to_user[request.sid]
        if user_id in active_chats:
            del active_chats[user_id]
        if user_id in connected_users:
            connected_users.discard(user_id)
        
        # Update last seen on disconnect
        try:
            user = db.session.get(User, user_id)
            if user:
                user.last_seen = datetime.datetime.utcnow()
                db.session.commit()
                
                # Notify friends that user is offline
                friends_q = Friendship.query.filter(
                    ((Friendship.user_id_1 == user_id) | (Friendship.user_id_2 == user_id)) &
                    (Friendship.status == 'accepted')
                ).all()
                
                last_seen_str = user.last_seen.isoformat()
                
                for f in friends_q:
                    friend_id = f.user_id_2 if f.user_id_1 == user_id else f.user_id_1
                    # Emit to friend's room
                    socketio.emit('user_status_update', {
                        "userId": user_id,
                        "isOnline": False,
                        "lastSeen": last_seen_str
                    }, room=f"user_{friend_id}")
                    
        except Exception as e:
             print(f"Error in on_disconnect: {e}")
            
        # Decrement connection count
        if user_id in user_connection_count:
            user_connection_count[user_id] = max(0, user_connection_count[user_id] - 1)
        del sid_to_user[request.sid]

@socketio.on('enter_chat')
def on_enter_chat(data):
    if request.sid in sid_to_user:
        user_id = sid_to_user[request.sid]
        target_id = data.get('targetUserId')
        active_chats[user_id] = target_id

@socketio.on('leave_chat')
def on_leave_chat():
    if request.sid in sid_to_user:
        user_id = sid_to_user[request.sid]
        if user_id in active_chats:
            del active_chats[user_id]

@socketio.on('join_post')
def on_join(data):
    room = str(data['postId'])
    join_room(room)

@socketio.on('leave_post')
def on_leave(data):
    room = str(data['postId'])
    leave_room(room)

@socketio.on('join_user_room')
def on_join_user_room(data):
    # Now redundant as we join on connect, but kept for compatibility.
    # We IGNORE client provided userId and use authenticated identity.
    user_id = sid_to_user.get(request.sid)
    if user_id:
        room = f"user_{user_id}"
        join_room(room)

@socketio.on('private_message')
def on_private_message(data):
    # Получаем ID отправителя гарантированно из сессии сокета (безопасность)
    sender_id = sid_to_user.get(request.sid)
    if not sender_id:
        return # Unauthorized

    recipient_id = data.get('recipientId')
    content = data.get('content')
    
    if not recipient_id or not content:
        return
    
    # Vuln 4.16 — WebSocket message rate limiting
    if ws_rate_check(sender_id):
        return
    
    # Vuln 4.2 — Sanitize message content
    content = sanitize_html(content)
        
    msg = Message(
        sender_id=sender_id, 
        recipient_id=recipient_id, 
        content=content or ""
    )
    db.session.add(msg)
    db.session.commit()
    
    msg_data = {
        "id": str(msg.id),
        "senderId": sender_id,
        "recipientId": recipient_id,
        "content": content or "",
        "timestamp": msg.timestamp.isoformat(),
        "isRead": False
    }
    
    # 1. Отправляем ПОЛУЧАТЕЛЮ
    emit('message_received', msg_data, room=f"user_{recipient_id}")
    
    # 2. Отправляем ОТПРАВИТЕЛЮ (как подтверждение)
    # Используем message_received для унификации, чтобы фронтенд мог использовать один листенер
    # Или оставляем message_sent, но убедимся, что фронт его ловит.
    # В обновленном chatStore мы ловим и то, и то.
    emit('message_sent', msg_data, room=f"user_{sender_id}")

    # Логика уведомлений
    recipient_active_target = active_chats.get(recipient_id)
    
    if recipient_active_target != sender_id:
        sender = db.session.get(User, sender_id)
        sender_name = sender.name if sender else "Unknown"
        
        notif_id = f"notif_{int(datetime.datetime.utcnow().timestamp() * 1000)}_{recipient_id}"
        notification = Notification(
            id=notif_id,
            recipient_id=recipient_id,
            type='new_message',
            content=f"New message from {sender_name}",
            related_id=sender_id,
            timestamp=datetime.datetime.utcnow()
        )
        db.session.add(notification)
        db.session.commit()
        
        emit('new_notification', notification.to_dict(), room=f"user_{recipient_id}")

@socketio.on('typing')
def on_typing(data):
    sender_id = sid_to_user.get(request.sid)
    recipient_id = data.get('recipientId')
    if sender_id and recipient_id:
        emit('user_typing', {"userId": sender_id}, room=f"user_{recipient_id}")

@socketio.on('stop_typing')
def on_stop_typing(data):
    sender_id = sid_to_user.get(request.sid)
    recipient_id = data.get('recipientId')
    if sender_id and recipient_id:
        emit('user_stop_typing', {"userId": sender_id}, room=f"user_{recipient_id}")

# --- ROUTES ---

@app.route('/api/register', methods=['POST'])
@limiter.limit('5 per minute')
def register():
    data = request.json
    
    if not data.get('email') or not validate_email(data['email']):
        return jsonify({"error": "Invalid email format"}), 400
        
    if not data.get('password') or not validate_password(data['password']):
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already in use"}), 400
        
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(
        name=sanitize_html(data.get('name', '').strip()) or 'User', 
        username=sanitize_html(data.get('username', data['email'].split('@')[0]).strip()),
        email=data['email'], password_hash=hashed_password, user_type=data.get('userType', 'explorer'),
        birth_date=data.get('birthDate', '2000-01-01'), location=data.get('location', 'Almaty')
    )
    db.session.add(new_user); db.session.commit()
    token = create_access_token(identity=new_user.id, expires_delta=datetime.timedelta(days=7))
    return jsonify({"message": "OK", "token": token, "userId": new_user.id, "user": user_to_dict(new_user)}), 201

@app.route('/api/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        if user.is_banned:
            return jsonify({"error": f"Account is banned: {user.ban_reason or 'Rule violation'}", "banned": True}), 403
        token = create_access_token(identity=user.id, expires_delta=datetime.timedelta(days=7))
        return jsonify({"token": token, "user": user_to_dict(user)}), 200
    return jsonify({"error": "Incorrect email or password"}), 401

@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    data = request.json
    
    if 'name' in data: user.name = sanitize_html(data['name'])
    if 'username' in data:
        new_username = sanitize_html(data['username'].strip().lower())
        if new_username != user.username:
            existing_user = User.query.filter_by(username=new_username).first()
            if existing_user:
                return jsonify({"error": "Username is already taken"}), 400
            user.username = new_username
    if 'bio' in data: user.bio = sanitize_html(data['bio'])
    if 'location' in data: user.location = sanitize_html(data['location'])
    if 'phone' in data: user.phone = sanitize_html(data['phone'])
    if 'avatarUrl' in data: user.avatar_url = data['avatarUrl']
    if 'birthDate' in data: user.birth_date = data['birthDate']
    
    # Обновление интересов в общем методе профиля
    if 'interests' in data:
        interest_names = data.get('interests', [])
        user.interests = []
        for name in interest_names:
            inst = db.session.get(Interest, name) or Interest(name=name)
            if not db.session.object_session(inst): 
                db.session.add(inst)
            user.interests.append(inst)
            
    db.session.commit()
    return jsonify(user_to_dict(user))

@app.route('/api/user/interests', methods=['POST'])
@jwt_required()
def update_interests():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    interest_names = request.json.get('interests', [])
    user.interests = []
    for name in interest_names:
        inst = db.session.get(Interest, name) or Interest(name=name)
        if not db.session.object_session(inst): db.session.add(inst)
        user.interests.append(inst)
    db.session.commit()
    return jsonify({"interests": [i.name for i in user.interests]})

@app.route('/api/user/favorite', methods=['POST'])
@jwt_required()
def toggle_favorite():
    user_id = get_jwt_identity(); event_id = request.json.get('eventId')
    user = db.session.get(User, user_id)
    event = db.session.get(Event, event_id)
    if event in user.saved_events: user.saved_events.remove(event)
    else: user.saved_events.append(event)
    db.session.commit()
    return jsonify({"savedEventIds": [e.id for e in user.saved_events]})

@app.route('/api/user/become-organizer', methods=['POST'])
@jwt_required()
def become_organizer():
    try:
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user.user_type = 'organizer'
        user.role = 'Organizer'
        db.session.commit()
        return jsonify(user_to_dict(user)), 200
    except Exception as e:
        print(f"Error in become_organizer: {e}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
@app.route('/api/user/follow', methods=['POST'])
@jwt_required()
def toggle_follow():
    user_id = get_jwt_identity(); target_id = request.json.get('organizerId')
    user = db.session.get(User, user_id)
    target = db.session.get(User, target_id)
    if target in user.following: user.following.remove(target)
    else: user.following.append(target)
    db.session.commit()
    return jsonify({"followingOrganizerIds": [u.id for u in user.following]})

@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    notifs = Notification.query.filter_by(recipient_id=user_id).order_by(Notification.timestamp.desc()).all()
    return jsonify([n.to_dict() for n in notifs])

@app.route('/api/notifications/read', methods=['PUT'])
@jwt_required()
def mark_notifications_read():
    user_id = get_jwt_identity()
    data = request.json
    notif_id = data.get('notificationId')
    if notif_id:
        notif = Notification.query.filter_by(id=notif_id, recipient_id=user_id).first()
        if notif:
            notif.is_read = True
    else:
        Notification.query.filter_by(recipient_id=user_id, is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return jsonify({"message": "Updated"})

@app.route('/api/organizer/stats', methods=['GET'])
@jwt_required()
def get_organizer_stats():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    # Vuln 4.5 — Only verified organizers (with actual events) or admins
    if user.user_type != 'organizer' and not user.is_admin:
        return jsonify({"error": "Access restricted to organizers"}), 403
    
    # Events explicitly organized by this user
    my_events = Event.query.filter_by(organizer_id=user_id).all()
    
    total_views = sum(e.views or 0 for e in my_events)
    events_count = len(my_events)
    
    # Tickets sold for my events
    # Join Ticket with Event to filter by organizer_id
    tickets_sold_query = db.session.query(Ticket).join(Event).filter(Event.organizer_id == user_id).all()
    tickets_sold_count = len(tickets_sold_query)
    
    # Calculate revenue
    # Assuming Ticket.quantity is number of tickets in that purchase
    # Revenue = sum(ticket.quantity * event.price_value)
    total_revenue = 0
    for t in tickets_sold_query:
        # e = t.event # joined already? better access via relationship if lazy load allows, or map
        # tickets_sold_query items are Ticket objects. Ticket has 'event' relationship.
        if t.event:
             total_revenue += t.quantity * t.event.price_value

    return jsonify({
        "totalViews": total_views,
        "ticketsSold": tickets_sold_count,
        "totalRevenue": total_revenue,
        "eventsCount": events_count
    })

@app.route('/api/organizer/analytics/sales', methods=['GET'])
@jwt_required()
def get_sales_analytics():
    user_id = get_jwt_identity()
    days = request.args.get('days', 30, type=int)
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    
    # query daily sales
    # group by date(purchase_date)
    # Cross-database compatible: fetch raw rows and group in Python
    tickets_raw = db.session.query(Ticket, Event.price_value).join(Event).filter(
        Event.organizer_id == user_id,
        Ticket.purchase_date >= since
    ).all()
    
    by_date = {}
    for t, price in tickets_raw:
        d = t.purchase_date.strftime('%Y-%m-%d')
        entry = by_date.setdefault(d, {"count": 0, "revenue": 0})
        entry["count"] += 1
        entry["revenue"] += t.quantity * price
    
    return jsonify([
        {"date": d, "count": v["count"], "revenue": v["revenue"]} 
        for d, v in sorted(by_date.items())
    ])

@app.route('/api/organizer/analytics/views', methods=['GET'])
@jwt_required()
def get_views_analytics():
    user_id = get_jwt_identity()
    days = request.args.get('days', 30, type=int)
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    
    # Cross-database compatible: fetch raw rows and group in Python
    views_raw = EventView.query.join(Event).filter(
        Event.organizer_id == user_id,
        EventView.viewed_at >= since
    ).all()
    
    by_date = {}
    for v in views_raw:
        d = v.viewed_at.strftime('%Y-%m-%d')
        by_date[d] = by_date.get(d, 0) + 1
     
    return jsonify([
        {"date": d, "count": c} 
        for d, c in sorted(by_date.items())
    ])

@app.route('/api/organizer/events-report', methods=['GET'])
@jwt_required()
def get_events_report():
    user_id = get_jwt_identity()
    
    my_events = Event.query.filter_by(organizer_id=user_id).all()
    report = []
    
    for e in my_events:
        # Calculate revenue and sold tickets for this event
        tickets = Ticket.query.filter_by(event_id=e.id).all()
        sold = sum(t.quantity for t in tickets)
        revenue = sold * e.price_value
        
        report.append({
            "id": e.id,
            "title": e.title,
            "date": e.event_timestamp, # timestamp int
            "views": e.views or 0,
            "sold": sold,
            "revenue": revenue,
            "image": e.image,
            "status": "active" if e.event_timestamp > datetime.datetime.now().timestamp() * 1000 else "finished"
        })
        
    return jsonify(report)

@app.route('/api/organizer/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    
    # Transactions are ticket sales for my events
    sales = db.session.query(Ticket).join(Event).filter(Event.organizer_id == user_id).order_by(Ticket.purchase_date.desc()).all()
    
    result = []
    for t in sales:
        buyer = db.session.get(User, t.user_id)
        buyer_name = buyer.name if buyer else "Unknown"
        result.append({
            "id": t.id,
            "eventId": t.event_id,
            "eventTitle": t.event.title,
            "buyerName": buyer_name,
            "quantity": t.quantity,
            "totalAmount": t.quantity * t.event.price_value,
            "date": t.purchase_date.isoformat()
        })
        
    return jsonify(result)

@app.route('/api/events', methods=['GET', 'POST'])
@jwt_required(optional=True)
def handle_events():
    if request.method == 'POST':
        user_id = get_jwt_identity()
        if not user_id: return jsonify({"error": "No auth"}), 401
        organizer = db.session.get(User, user_id)
        if not organizer: return jsonify({"error": "Organizer not found"}), 404
        data = request.json
        try:
            price_value = float(data.get('priceValue', 0))
            if price_value < 0:
                return jsonify({"error": "Price cannot be negative"}), 400
        except ValueError:
            return jsonify({"error": "Invalid price format"}), 400
            
        new_event = Event(
            title=sanitize_html(data['title']), full_description=sanitize_html(data.get('fullDescription', '')),
            organizer_name=data.get('organizerName', ''), organizer_avatar=data.get('organizerAvatar', ''),
            time_range=data.get('timeRange', ''), organizer_id=user_id,
            vibe=data.get('vibe', 'chill'), district=data.get('district', ''),
            age_limit=data.get('ageLimit', 0), tags=data.get('tags', []),
            categories=data.get('categories', []), price_value=price_value,
            location=data.get('location', ''), image=data.get('image', ''),
            city=data.get('city', 'Almaty'),
            event_timestamp=data.get('timestamp', int(datetime.datetime.now().timestamp() * 1000)),
            moderation_status='pending'
        )
        db.session.add(new_event); db.session.commit()
        # Notify organizer that event is pending moderation
        current_time = datetime.datetime.utcnow()
        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{user_id}"
        notif = Notification(id=notif_id, recipient_id=user_id, type='event_pending', content=f"Event \"{new_event.title}\" sent for moderation", related_id=str(new_event.id), timestamp=current_time)
        db.session.add(notif); db.session.commit()
        socketio.emit('new_notification', notif.to_dict(), room=f"user_{user_id}")
        return jsonify({"id": new_event.id, "message": "Event sent for moderation"}), 201
    
    # Public feed: approved events + organizer's own events (all statuses)
    user_id = get_jwt_identity()
    if user_id:
        events_query = Event.query.filter(
            (Event.moderation_status == 'approved') | (Event.organizer_id == user_id)
        )
    else:
        events_query = Event.query.filter(Event.moderation_status == 'approved')
    events = events_query.all()
    months_en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    result = []
    for e in events:
        if e.event_timestamp:
            dt = datetime.datetime.fromtimestamp(e.event_timestamp/1000)
            date_str = f"{dt.day} {months_en[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}"
        else:
            dt = e.added_at
            date_str = f"{dt.day} {months_en[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}"
        organizer = db.session.get(User, e.organizer_id)
        current_avatar = organizer.avatar_url if organizer and organizer.avatar_url else e.organizer_avatar
        result.append({
            "id": e.id, "title": e.title, "fullDescription": e.full_description,
            "organizerName": e.organizer_name, "organizerAvatar": public_upload_url(current_avatar),
            "organizerPhone": organizer.phone if organizer else "",
            "timeRange": e.time_range, "organizerId": e.organizer_id, "vibe": e.vibe,
            "district": e.district, "ageLimit": e.age_limit, "tags": e.tags,
            "categories": e.categories, "priceValue": e.price_value, "location": e.location, 
            "city": e.city,
            "image": public_upload_url(e.image), "views": e.views or 0, "timestamp": e.event_timestamp,
            "date": date_str, "moderationStatus": e.moderation_status
        })
    return jsonify(result)

@app.route('/api/events/<event_id>', methods=['PUT', 'DELETE'])
@jwt_required()
@limiter.limit('10 per minute', methods=['DELETE'])
def handle_single_event(event_id):
    user_id = get_jwt_identity()
    event = db.session.get(Event, event_id)
    if not event: return jsonify({"error": "Not found"}), 404
    if event.organizer_id != user_id: return jsonify({"error": "Forbidden"}), 403
    if request.method == 'PUT':
        if event.moderation_status == 'pending':
            return jsonify({"error": "Cannot edit event while it is under moderation"}), 403
        data = request.json
        new_image = data.get('image')
        if new_image and new_image != event.image:
            delete_event_image(event.image)
        event.title = data.get('title', event.title); event.full_description = data.get('fullDescription', event.full_description)
        event.location = data.get('location', event.location); event.district = data.get('district', event.district)
        event.city = data.get('city', event.city)
        event.price_value = data.get('priceValue', event.price_value); event.vibe = data.get('vibe', event.vibe)
        event.age_limit = data.get('ageLimit', event.age_limit); event.image = data.get('image', event.image)
        event.categories = data.get('categories', event.categories); event.tags = data.get('tags', event.tags)
        event.event_timestamp = data.get('timestamp', event.event_timestamp); event.time_range = data.get('timeRange', event.time_range)
        db.session.commit()
        return jsonify({"message": "Event updated"}), 200
    if request.method == 'DELETE':
        delete_event_image(event.image)
        EventView.query.filter_by(event_id=event.id).delete()
        Ticket.query.filter_by(event_id=event.id).delete()
        db.session.delete(event); db.session.commit()
        return jsonify({"message": "Event deleted"}), 200

@app.route('/api/events/<event_id>/view', methods=['POST'])
@jwt_required(optional=True)
def increment_event_view(event_id):
    try:
        event = db.session.get(Event, event_id)
        if not event: return jsonify({"error": "Not found"}), 404
        user_id = get_jwt_identity()
        ip_address = request.remote_addr; user_agent = request.headers.get('User-Agent', '')
        if user_agent and ('bot' in user_agent.lower() or 'crawler' in user_agent.lower()):
            return jsonify({"views": event.views, "message": "Bot detected"}), 200
        last_minute = datetime.datetime.utcnow() - datetime.timedelta(minutes=1)
        recent_views_count = EventView.query.filter(EventView.ip_address == ip_address, EventView.viewed_at >= last_minute).count()
        if recent_views_count > 10: return jsonify({"views": event.views, "message": "Rate limit"}), 429
        if user_id:
            last_24h = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
            recent_view = EventView.query.filter(EventView.event_id == event_id, EventView.user_id == user_id, EventView.viewed_at >= last_24h).first()
            if not recent_view:
                db.session.add(EventView(event_id=event_id, user_id=user_id, ip_address=ip_address, user_agent=user_agent))
                event.views += 1; db.session.commit()
                return jsonify({"views": event.views, "message": "View counted"}), 200
        else:
            last_hour = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
            recent_view = EventView.query.filter(EventView.event_id == event_id, EventView.ip_address == ip_address, EventView.viewed_at >= last_hour).first()
            if not recent_view:
                db.session.add(EventView(event_id=event_id, user_id=None, ip_address=ip_address, user_agent=user_agent))
                event.views += 1; db.session.commit()
                return jsonify({"views": event.views, "message": "View counted (anon)"}), 200
        return jsonify({"views": event.views, "message": "Already viewed"}), 200
    except Exception as e:
        db.session.rollback(); return jsonify({"error": "Internal server error"}), 500

@app.route('/api/posts', methods=['GET', 'POST'])
@jwt_required(optional=True)
def handle_posts():
    if request.method == 'POST':
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user: return jsonify({"error": "User not found"}), 401
        data = request.json
        new_post = Post(category_slug=data.get('categorySlug'), category_name=data.get('categoryName'), author_id=user_id, author_name=user.name, content=sanitize_html(data['content']), age_limit=data.get('ageLimit', 0), moderation_status='pending')
        db.session.add(new_post); db.session.commit()
        return jsonify({"id": new_post.id, "message": "Post sent for moderation"}), 201
    # Public feed: approved posts + user's own posts (any status)
    user_id = get_jwt_identity()
    if user_id:
        posts = Post.query.filter((Post.moderation_status == 'approved') | (Post.author_id == user_id)).order_by(Post.timestamp.desc()).all()
    else:
        posts = Post.query.filter(Post.moderation_status == 'approved').order_by(Post.timestamp.desc()).all()
    return jsonify([{"id": p.id, "categorySlug": p.category_slug, "categoryName": p.category_name, "authorId": p.author_id, "authorName": p.author_name, "content": p.content, "upvotes": p.upvotes or 0, "downvotes": p.downvotes or 0, "ageLimit": p.age_limit, "timestamp": p.timestamp.isoformat(), "commentCount": len(p.comments), "votedUsers": {v.user_id: v.vote_type for v in p.votes}, "moderationStatus": p.moderation_status, "rejectionReason": p.rejection_reason} for p in posts])

@app.route('/api/posts/<post_id>/vote', methods=['POST'])
@jwt_required()
def vote_post(post_id):
    user_id = get_jwt_identity(); data = request.json; vote_type = data.get('type')
    # Vuln 4.6 — Strict vote validation
    if vote_type not in ('up', 'down'):
        return jsonify({"error": "Allowed values: up or down"}), 400
    post = db.session.get(Post, post_id)
    if not post: return jsonify({"error": "Post not found"}), 404
    # Vuln 4.12 — Handle race condition with try/except
    try:
        v = PostVote.query.filter_by(user_id=user_id, post_id=post_id).first()
        if v:
            if v.vote_type == 'up': post.upvotes -= 1
            else: post.downvotes -= 1
            if v.vote_type == vote_type: db.session.delete(v)
            else:
                v.vote_type = vote_type
                if vote_type == 'up': post.upvotes += 1
                else: post.downvotes += 1
        else:
            db.session.add(PostVote(user_id=user_id, post_id=post_id, vote_type=vote_type))
            if vote_type == 'up': post.upvotes += 1
            else: post.downvotes += 1
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Vote already counted"}), 409
    socketio.emit('vote_update', {"postId": post_id, "upvotes": post.upvotes, "downvotes": post.downvotes, "votedUsers": {v2.user_id: v2.vote_type for v2 in post.votes}}, room=str(post_id))
    return jsonify({"upvotes": post.upvotes, "downvotes": post.downvotes}), 200

@app.route('/api/posts/<post_id>/comments', methods=['GET', 'POST'])
@jwt_required(optional=True)
def handle_comments(post_id):
    if request.method == 'POST':
        user_id = get_jwt_identity(); user = db.session.get(User, user_id); data = request.json
        c = Comment(post_id=post_id, author_id=user_id, author_name=user.name, content=sanitize_html(data['content']), parent_id=data.get('parentId'), depth=data.get('depth', 0))
        db.session.add(c); db.session.commit()
        comment_dict = {"id": c.id, "postId": c.post_id, "authorId": c.author_id, "authorName": c.author_name, "timestamp": c.timestamp.isoformat(), "content": c.content, "parentId": c.parent_id, "depth": c.depth, "upvotes": c.upvotes, "downvotes": c.downvotes}
        socketio.emit('new_comment', comment_dict, room=str(post_id))
        return jsonify(comment_dict), 201
    comms = Comment.query.filter_by(post_id=post_id).all()
    return jsonify([{"id": c.id, "postId": c.post_id, "authorId": c.author_id, "authorName": c.author_name, "timestamp": c.timestamp.isoformat(), "content": c.content, "parentId": c.parent_id, "depth": c.depth, "upvotes": c.upvotes, "downvotes": c.downvotes} for c in comms])

@app.route('/api/tickets/buy', methods=['POST'])
@jwt_required()
@limiter.limit('10 per minute')
def buy_ticket():
    uid = get_jwt_identity(); data = request.json
    event_id = data.get('eventId')
    try:
        quantity = int(data.get('quantity', 1))
        if quantity <= 0:
            return jsonify({"error": "Ticket quantity must be greater than zero"}), 400
    except ValueError:
        return jsonify({"error": "Invalid quantity format"}), 400
        
    if not event_id:
        return jsonify({"error": "eventId is required"}), 400
    # Vuln 4.8 — Race condition fix: use transaction with conflict handling
    try:
        event = db.session.get(Event, event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        # Check if user already has a ticket
        existing = Ticket.query.filter_by(event_id=event_id, user_id=uid).first()
        if existing:
            return jsonify({"error": "You already have a ticket for this event"}), 409
        db.session.add(Ticket(event_id=event_id, user_id=uid, quantity=quantity))
        db.session.commit()
        return jsonify({"message": "OK"}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Ticket already exists or event unavailable"}), 409
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Error purchasing ticket"}), 500

@app.route('/api/tickets/my', methods=['GET'])
@jwt_required()
def get_my_tickets():
    uid = get_jwt_identity(); tickets = Ticket.query.filter_by(user_id=uid).all()
    return jsonify([{"id": t.id, "eventId": t.event_id, "quantity": t.quantity, "purchaseDate": t.purchase_date.isoformat(), "eventTitle": t.event.title if t.event else "Unknown"} for t in tickets])


# --- SOCIAL FEATURES ---

@app.route('/api/chats/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = get_jwt_identity()
    
    # Complex query to get last message for each conversation
    # Using SQLAlchemy subqueries or just Python processing if data is small?
    # For MVP, Python processing is easier but slower. Let's try a decent query.
    # Group by `other_id`.
    
    # Select all messages involving user
    messages = Message.query.filter(
        (Message.sender_id == user_id) | (Message.recipient_id == user_id)
    ).order_by(Message.timestamp.desc()).all()
    
    conversations = {}
    for m in messages:
        other_id = m.recipient_id if m.sender_id == user_id else m.sender_id
        if other_id not in conversations:
            conversations[other_id] = m
    
    result = []
    for other_id, m in conversations.items():
        other_user = db.session.get(User, other_id)
        if other_user:
            is_online = other_user.id in connected_users
            last_seen_str = other_user.last_seen.isoformat() if other_user.last_seen else None
            
            result.append({
                "userId": other_user.id,
                "name": other_user.name,
                "username": other_user.username,
                "avatarUrl": public_upload_url(other_user.avatar_url),
                "lastMessage": m.content,
                "lastMessageTimestamp": m.timestamp.isoformat(),
                "isRead": m.is_read or (m.sender_id == user_id),
                "isOnline": is_online,
                "lastSeen": last_seen_str
            })
            
    return jsonify(sorted(result, key=lambda x: x['lastMessageTimestamp'], reverse=True))

@app.route('/api/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user_by_id(user_id):
    current_user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    # Vuln 4.1 — IDOR fix: full data only for self or admin
    current_user = db.session.get(User, current_user_id)
    if current_user_id == user_id or (current_user and current_user.is_admin):
        return jsonify(user_to_dict(user))
    # Return limited public profile for other users
    initials = ''.join([n[0] for n in user.name.split() if n]).upper()[:2] if user.name else "UN"
    is_online = user.id in connected_users
    return jsonify({
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "avatarUrl": public_upload_url(user.avatar_url) or "",
        "avatarInitials": initials,
        "role": "Organizer" if user.user_type == 'organizer' else "Explorer",
        "phone": user.phone if user.user_type == 'organizer' else "",
        "bio": user.bio or "",
        "location": user.location or "",
        "isOnline": is_online,
        "stats": {"eventsAttended": len(user.tickets), "communitiesJoined": 0}
    })

@app.route('/api/users/search', methods=['GET'])
@jwt_required()
def search_users():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    
    # Search by name or username
    users = User.query.filter(
        (User.name.ilike(f"%{query}%")) | (User.username.ilike(f"%{query}%"))
    ).limit(20).all()
    
    return jsonify([{
        "id": u.id,
        "name": u.name,
        "username": u.username,
        "avatarUrl": public_upload_url(u.avatar_url),
        "role": "Organizer" if u.user_type == 'organizer' else "Explorer"
    } for u in users])

@app.route('/api/friends', methods=['GET'])
@jwt_required()
def get_friends():
    user_id = get_jwt_identity()
    
    # Confirmed friends
    friends_query = Friendship.query.filter(
        ((Friendship.user_id_1 == user_id) | (Friendship.user_id_2 == user_id)) &
        (Friendship.status == 'accepted')
    ).all()
    
    friends = []
    for f in friends_query:
        fid = f.user_id_2 if f.user_id_1 == user_id else f.user_id_1
        friend = db.session.get(User, fid)
        if friend:
            friends.append({
                "id": friend.id,
                "name": friend.name,
                "username": friend.username,
                "avatarUrl": public_upload_url(friend.avatar_url),
                "friendshipId": f.id
            })
            
    # Pending requests (incoming)
    incoming_query = Friendship.query.filter_by(user_id_2=user_id, status='pending').all()
    incoming = []
    for f in incoming_query:
        user = db.session.get(User, f.user_id_1)
        if user:
            incoming.append({
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "avatarUrl": public_upload_url(user.avatar_url),
                "friendshipId": f.id,
                "requestId": f.id
            })

    # Pending requests (outgoing)
    outgoing_query = Friendship.query.filter_by(user_id_1=user_id, status='pending').all()
    outgoing = []
    for f in outgoing_query:
        user = db.session.get(User, f.user_id_2)
        if user:
            outgoing.append({
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "avatarUrl": public_upload_url(user.avatar_url),
                "friendshipId": f.id
            })
            
    return jsonify({
        "friends": friends,
        "incomingAPI": incoming,
        "outgoingAPI": outgoing
    })

@app.route('/api/friends/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    user_id = get_jwt_identity()
    target_id = request.json.get('userId')
    
    if user_id == target_id:
        return jsonify({"error": "Self"}), 400
        
    # Check existing
    existing = Friendship.query.filter(
        ((Friendship.user_id_1 == user_id) & (Friendship.user_id_2 == target_id)) |
        ((Friendship.user_id_1 == target_id) & (Friendship.user_id_2 == user_id))
    ).first()
    
    if existing:
        if existing.status == 'accepted':
            return jsonify({"message": "Already friends"}), 200
        if existing.status == 'pending':
            return jsonify({"message": "Request pending"}), 200
        # If rejected, maybe allow retry? assuming strictly pending/accepted logic for now.
        existing.status = 'pending'
        existing.action_user_id = user_id
        db.session.commit()
        return jsonify({"message": "Request sent"}), 200

    # Create new
    # Enforce order for consistency if desired, strictly speaking strictly storing (min, max) is good for uniqueness 
    # but here we use user_id_1 as requester for 'pending' state logic usually.
    # Actually for 'pending', user_id_1 is usually requester.
    new_friendship = Friendship(user_id_1=user_id, user_id_2=target_id, status='pending', action_user_id=user_id)
    db.session.add(new_friendship)
    db.session.commit()
    
    # Notify target
    current_time = datetime.datetime.utcnow()
    notification_body = f"Friend request from {user_id}" 
    # Better to use name if available, let's fetch sender
    sender = db.session.get(User, user_id)
    if sender:
        notification_body = f"Friend request from {sender.name}"

    notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{target_id}"
    notif = Notification(id=notif_id, recipient_id=target_id, type='friend_request', content=notification_body, related_id=str(user_id), timestamp=current_time)
    db.session.add(notif)
    db.session.commit()

    socketio.emit('friend_request', {"type": "new", "fromUser": user_id}, room=f"user_{target_id}")
    socketio.emit('new_notification', notif.to_dict(), room=f"user_{target_id}")
    
    return jsonify({"message": "Request sent", "friendshipId": new_friendship.id}), 201

@app.route('/api/friends/respond', methods=['POST'])
@jwt_required()
def respond_friend_request():
    user_id = get_jwt_identity()
    data = request.json
    friendship_id = data.get('friendshipId')
    action = data.get('action') # accept or reject
    
    f = db.session.get(Friendship, friendship_id)
    if not f:
        return jsonify({"error": "Not found"}), 404
        
    if f.user_id_2 != user_id:
        return jsonify({"error": "Not authorized"}), 403
        
    if action == 'accept':
        f.status = 'accepted'
        f.action_user_id = user_id
        db.session.commit()
        # Notify requester
        current_time = datetime.datetime.utcnow()
        acceptor = db.session.get(User, user_id)
        notification_body = f"{acceptor.name} accepted friend request" if acceptor else "Friend request accepted"

        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{f.user_id_1}"
        notif = Notification(id=notif_id, recipient_id=f.user_id_1, type='friend_accept', content=notification_body, related_id=str(user_id), timestamp=current_time)
        db.session.add(notif)
        db.session.commit()

        socketio.emit('friend_request', {"type": "accepted", "byUser": user_id}, room=f"user_{f.user_id_1}")
        socketio.emit('new_notification', notif.to_dict(), room=f"user_{f.user_id_1}")
        return jsonify({"message": "Accepted"}), 200
    elif action == 'reject':
        db.session.delete(f)
        db.session.commit()
        return jsonify({"message": "Rejected"}), 200
        
    return jsonify({"error": "Invalid action"}), 400

@app.route('/api/friends/<friendship_id>', methods=['DELETE'])
@jwt_required()
def remove_friend(friendship_id):
    user_id = get_jwt_identity()
    f = db.session.get(Friendship, friendship_id)
    
    if not f:
        return jsonify({"error": "Friendship not found"}), 404
        
    if f.user_id_1 != user_id and f.user_id_2 != user_id:
        return jsonify({"error": "Not authorized"}), 403
        
    other_user_id = f.user_id_2 if f.user_id_1 == user_id else f.user_id_1
    
    db.session.delete(f)
    
    # Notify other user
    current_time = datetime.datetime.utcnow()
    remover = db.session.get(User, user_id)
    remover_name = remover.name if remover else "User"
    
    notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{other_user_id}"
    notification_body = f"{remover_name} removed you from friends"
    
    notif = Notification(
        id=notif_id, 
        recipient_id=other_user_id, 
        type='friend_removed', 
        content=notification_body, 
        related_id=user_id, 
        timestamp=current_time
    )
    db.session.add(notif)
    db.session.commit()
    
    socketio.emit('friend_removed', {"friendshipId": friendship_id, "removedBy": user_id}, room=f"user_{other_user_id}")
    socketio.emit('new_notification', notif.to_dict(), room=f"user_{other_user_id}")
    
    return jsonify({"message": "Friend removed"}), 200

@app.route('/api/chat/<target_id>', methods=['GET'])
@jwt_required()
def get_chat_history(target_id):
    user_id = get_jwt_identity()
    
    messages = Message.query.filter(
        ((Message.sender_id == user_id) & (Message.recipient_id == target_id)) |
        ((Message.sender_id == target_id) & (Message.recipient_id == user_id))
    ).order_by(Message.timestamp.asc()).all()
    
    return jsonify([{
        "id": m.id,
        "senderId": m.sender_id,
        "recipientId": m.recipient_id,
        "content": m.content,
        "timestamp": m.timestamp.isoformat(),
        "isRead": m.is_read
    } for m in messages])

@app.route('/api/chat/read', methods=['POST'])
@jwt_required()
def mark_messages_read():
    user_id = get_jwt_identity()
    target_id = request.json.get('senderId')
    
    Message.query.filter_by(sender_id=target_id, recipient_id=user_id, is_read=False).update({Message.is_read: True})
    db.session.commit()
    return jsonify({"message": "Marked read"}), 200

# Duplicate route removed (was get_user_profile_by_id) — merged into get_user_by_id above

# ============================
# --- ADMIN ROUTES ---
# ============================

@app.route('/api/admin/dashboard', methods=['GET'])
@admin_required
def admin_dashboard():
    total_users = User.query.count()
    total_organizers = User.query.filter_by(user_type='organizer').count()
    total_explorers = User.query.filter_by(user_type='explorer').count()
    banned_users = User.query.filter_by(is_banned=True).count()

    total_events = Event.query.count()
    pending_events = Event.query.filter_by(moderation_status='pending').count()
    approved_events = Event.query.filter_by(moderation_status='approved').count()
    rejected_events = Event.query.filter_by(moderation_status='rejected').count()

    total_posts = Post.query.count()
    pending_posts = Post.query.filter_by(moderation_status='pending').count()
    approved_posts = Post.query.filter_by(moderation_status='approved').count()
    rejected_posts = Post.query.filter_by(moderation_status='rejected').count()

    total_tickets = Ticket.query.count()
    total_messages = Message.query.count()

    # Revenue
    total_revenue = 0
    tickets_with_events = db.session.query(Ticket).join(Event).all()
    for t in tickets_with_events:
        if t.event:
            total_revenue += t.quantity * t.event.price_value

    return jsonify({
        "users": {
            "total": total_users,
            "organizers": total_organizers,
            "explorers": total_explorers,
            "banned": banned_users
        },
        "events": {
            "total": total_events,
            "pending": pending_events,
            "approved": approved_events,
            "rejected": rejected_events
        },
        "posts": {
            "total": total_posts,
            "pending": pending_posts,
            "approved": approved_posts,
            "rejected": rejected_posts
        },
        "tickets": total_tickets,
        "messages": total_messages,
        "totalRevenue": total_revenue
    })


@app.route('/api/admin/events', methods=['GET'])
@admin_required
def admin_get_events():
    status = request.args.get('status', 'all')
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    organizer_id = request.args.get('organizerId', '').strip()
    sort_by = request.args.get('sortBy', 'newest')

    query = Event.query
    if status and status != 'all':
        query = query.filter(Event.moderation_status == status)
    if search:
        query = query.filter(Event.title.ilike(f"%{search}%"))
    if organizer_id:
        query = query.filter(Event.organizer_id == organizer_id)

    if sort_by == 'oldest':
        query = query.order_by(Event.added_at.asc())
    elif sort_by == 'views':
        query = query.order_by(Event.views.desc())
    else:
        query = query.order_by(Event.added_at.desc())

    events = query.all()

    # Filter by category in python since categories is JSON
    if category:
        events = [e for e in events if e.categories and category.lower() in [c.lower() for c in e.categories]]

    months_en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    result = []
    for e in events:
        if e.event_timestamp:
            dt = datetime.datetime.fromtimestamp(e.event_timestamp/1000)
            date_str = f"{dt.day} {months_en[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}"
        else:
            dt = e.added_at
            date_str = f"{dt.day} {months_en[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}" if dt else ""
        organizer = db.session.get(User, e.organizer_id)
        result.append({
            "id": e.id, "title": e.title, "fullDescription": e.full_description,
            "organizerName": e.organizer_name, "organizerAvatar": public_upload_url(organizer.avatar_url if organizer else e.organizer_avatar),
            "organizerPhone": organizer.phone if organizer else "",
            "organizerId": e.organizer_id, "vibe": e.vibe,
            "district": e.district, "ageLimit": e.age_limit, "tags": e.tags,
            "categories": e.categories, "priceValue": e.price_value, "location": e.location,
            "image": public_upload_url(e.image), "views": e.views or 0, "timestamp": e.event_timestamp,
            "date": date_str, "moderationStatus": e.moderation_status,
            "rejectionReason": e.rejection_reason,
            "addedAt": e.added_at.isoformat() if e.added_at else None
        })
    return jsonify(result)


@app.route('/api/admin/events/<event_id>/moderate', methods=['PUT'])
@admin_required
def admin_moderate_event(event_id):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    data = request.json
    action = data.get('action')  # 'approve' or 'reject'
    reason = data.get('reason', '')

    if action == 'approve':
        event.moderation_status = 'approved'
        event.rejection_reason = None
        db.session.commit()

        # Notify followers now that event is approved
        organizer = db.session.get(User, event.organizer_id)
        if organizer:
            followers = organizer.followers
            current_time = datetime.datetime.utcnow()
            notification_body = f"{organizer.name} created: {event.title}"
            for follower in followers:
                notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{follower.id}"
                notif = Notification(id=notif_id, recipient_id=follower.id, type='new_event', content=notification_body, related_id=str(event.id), timestamp=current_time)
                db.session.add(notif)
                socketio.emit('new_notification', notif.to_dict(), room=f"user_{follower.id}")
            db.session.commit()

        # Notify organizer
        current_time = datetime.datetime.utcnow()
        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{event.organizer_id}"
        notif = Notification(
            id=notif_id, recipient_id=event.organizer_id, type='event_approved',
            content=f'Event "{event.title}" approved! {reason}',
            related_id=str(event.id), timestamp=current_time
        )
        db.session.add(notif); db.session.commit()
        socketio.emit('new_notification', notif.to_dict(), room=f"user_{event.organizer_id}")
        return jsonify({"message": "Event approved"}), 200

    elif action == 'reject':
        event.moderation_status = 'rejected'
        event.rejection_reason = reason
        db.session.commit()

        # Notify organizer
        current_time = datetime.datetime.utcnow()
        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{event.organizer_id}"
        notif = Notification(
            id=notif_id, recipient_id=event.organizer_id, type='event_rejected',
            content=f'Event "{event.title}" rejected. Reason: {reason or "Not specified"}',
            related_id=str(event.id), timestamp=current_time
        )
        db.session.add(notif); db.session.commit()
        socketio.emit('new_notification', notif.to_dict(), room=f"user_{event.organizer_id}")
        return jsonify({"message": "Event rejected"}), 200

    return jsonify({"error": "Invalid action"}), 400


@app.route('/api/admin/events/<event_id>', methods=['DELETE'])
@admin_required
def admin_delete_event(event_id):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": "Not found"}), 404
    delete_event_image(event.image)
    EventView.query.filter_by(event_id=event.id).delete()
    Ticket.query.filter_by(event_id=event.id).delete()
    db.session.delete(event); db.session.commit()
    return jsonify({"message": "Event deleted by admin"}), 200


@app.route('/api/admin/posts', methods=['GET'])
@admin_required
def admin_get_posts():
    status = request.args.get('status', 'all')
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    sort_by = request.args.get('sortBy', 'newest')

    query = Post.query
    if status and status != 'all':
        query = query.filter(Post.moderation_status == status)
    if search:
        query = query.filter(Post.content.ilike(f"%{search}%") | Post.author_name.ilike(f"%{search}%"))
    if category:
        query = query.filter(Post.category_name.ilike(f"%{category}%"))

    if sort_by == 'oldest':
        query = query.order_by(Post.timestamp.asc())
    elif sort_by == 'popular':
        query = query.order_by((Post.upvotes - Post.downvotes).desc())
    else:
        query = query.order_by(Post.timestamp.desc())

    posts = query.all()
    return jsonify([{
        "id": p.id, "categorySlug": p.category_slug, "categoryName": p.category_name,
        "authorId": p.author_id, "authorName": p.author_name, "content": p.content,
        "upvotes": p.upvotes or 0, "downvotes": p.downvotes or 0,
        "ageLimit": p.age_limit, "timestamp": p.timestamp.isoformat(),
        "commentCount": len(p.comments), "moderationStatus": p.moderation_status,
        "rejectionReason": p.rejection_reason
    } for p in posts])


@app.route('/api/admin/posts/<post_id>/moderate', methods=['PUT'])
@admin_required
def admin_moderate_post(post_id):
    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404

    data = request.json
    action = data.get('action')
    reason = data.get('reason', '')

    if action == 'approve':
        post.moderation_status = 'approved'
        post.rejection_reason = None
        db.session.commit()

        # Notify author
        current_time = datetime.datetime.utcnow()
        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{post.author_id}"
        notif = Notification(
            id=notif_id, recipient_id=post.author_id, type='post_approved',
            content=f'Your post has been approved! {reason}',
            related_id=str(post.id), timestamp=current_time
        )
        db.session.add(notif); db.session.commit()
        socketio.emit('new_notification', notif.to_dict(), room=f"user_{post.author_id}")
        return jsonify({"message": "Post approved"}), 200

    elif action == 'reject':
        post.moderation_status = 'rejected'
        post.rejection_reason = reason
        db.session.commit()

        current_time = datetime.datetime.utcnow()
        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{post.author_id}"
        notif = Notification(
            id=notif_id, recipient_id=post.author_id, type='post_rejected',
            content=f'Your post was rejected. Reason: {reason or "Not specified"}',
            related_id=str(post.id), timestamp=current_time
        )
        db.session.add(notif); db.session.commit()
        socketio.emit('new_notification', notif.to_dict(), room=f"user_{post.author_id}")
        return jsonify({"message": "Post rejected"}), 200

    return jsonify({"error": "Invalid action"}), 400


@app.route('/api/admin/posts/<post_id>', methods=['DELETE'])
@admin_required
def admin_delete_post(post_id):
    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(post); db.session.commit()
    return jsonify({"message": "Post deleted by admin"}), 200


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users():
    search = request.args.get('search', '').strip()
    user_type = request.args.get('userType', '').strip()
    banned = request.args.get('banned', '').strip()
    sort_by = request.args.get('sortBy', 'newest')

    query = User.query
    if search:
        query = query.filter(
            User.name.ilike(f"%{search}%") | User.username.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    if user_type:
        query = query.filter(User.user_type == user_type)
    if banned == 'true':
        query = query.filter(User.is_banned == True)
    elif banned == 'false':
        query = query.filter(User.is_banned == False)

    if sort_by == 'oldest':
        query = query.order_by(User.registered_at.asc())
    elif sort_by == 'name':
        query = query.order_by(User.name.asc())
    else:
        query = query.order_by(User.registered_at.desc())

    users = query.all()
    result = []
    for u in users:
        events_count = Event.query.filter_by(organizer_id=u.id).count()
        posts_count = Post.query.filter_by(author_id=u.id).count()
        result.append({
            "id": u.id, "name": u.name, "username": u.username, "email": u.email,
            "avatarUrl": public_upload_url(u.avatar_url) or "", "userType": u.user_type,
            "location": u.location or "", "bio": u.bio or "",
            "isBanned": u.is_banned or False, "banReason": u.ban_reason or "",
            "isAdmin": u.is_admin or False,
            "registeredAt": u.registered_at.isoformat() if u.registered_at else None,
            "eventsCount": events_count, "postsCount": posts_count,
            "followersCount": u.followers.count() if hasattr(u, 'followers') else 0
        })
    return jsonify(result)


@app.route('/api/admin/users/<user_id>/ban', methods=['PUT'])
@admin_required
def admin_ban_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json
    action = data.get('action')  # 'ban' or 'unban'
    reason = data.get('reason', '')

    if action == 'ban':
        user.is_banned = True
        user.ban_reason = reason
        db.session.commit()

        # Notify user
        current_time = datetime.datetime.utcnow()
        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{user_id}"
        notif = Notification(
            id=notif_id, recipient_id=user_id, type='account_banned',
            content=f'Your account is banned. Reason: {reason or "Rule violation"}',
            related_id=user_id, timestamp=current_time
        )
        db.session.add(notif); db.session.commit()

        # Push the notification via WebSocket so the client gets it in real-time
        socketio.emit('new_notification', {
            'id': notif_id,
            'type': 'account_banned',
            'content': f'Your account is banned. Reason: {reason or "Rule violation"}',
            'relatedId': user_id,
            'timestamp': current_time.isoformat(),
            'isRead': False
        }, room=user_id)

        return jsonify({"message": "User banned"}), 200

    elif action == 'unban':
        user.is_banned = False
        user.ban_reason = None
        db.session.commit()
        return jsonify({"message": "User unbanned"}), 200

    return jsonify({"error": "Invalid action"}), 400


@app.route('/api/admin/users/<user_id>/role', methods=['PUT'])
@admin_required
def admin_change_role(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json
    new_type = data.get('userType')
    if new_type in ('explorer', 'organizer'):
        user.user_type = new_type
        db.session.commit()
        return jsonify({"message": f"User type changed to {new_type}"}), 200
    return jsonify({"error": "Invalid user type"}), 400


@app.route('/api/admin/analytics/registrations', methods=['GET'])
@admin_required
def admin_analytics_registrations():
    days = request.args.get('days', 30, type=int)
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    try:
        data = db.session.query(
            sa_func.date(User.registered_at).label('date'),
            sa_func.count(User.id).label('count')
        ).filter(User.registered_at >= since).group_by(sa_func.date(User.registered_at)).order_by(sa_func.date(User.registered_at)).all()

        return jsonify([{"date": str(d.date), "count": d.count} for d in data])
    except Exception:
        # Fallback for DBs without date function support
        users = User.query.filter(User.registered_at >= since).all()
        by_date = {}
        for u in users:
            if u.registered_at:
                d = u.registered_at.strftime('%Y-%m-%d')
                by_date[d] = by_date.get(d, 0) + 1
        return jsonify([{"date": k, "count": v} for k, v in sorted(by_date.items())])


@app.route('/api/admin/analytics/events-created', methods=['GET'])
@admin_required
def admin_analytics_events_created():
    days = request.args.get('days', 30, type=int)
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    try:
        data = db.session.query(
            sa_func.date(Event.added_at).label('date'),
            sa_func.count(Event.id).label('count')
        ).filter(Event.added_at >= since).group_by(sa_func.date(Event.added_at)).order_by(sa_func.date(Event.added_at)).all()

        return jsonify([{"date": str(d.date), "count": d.count} for d in data])
    except Exception:
        events = Event.query.filter(Event.added_at >= since).all()
        by_date = {}
        for e in events:
            if e.added_at:
                d = e.added_at.strftime('%Y-%m-%d')
                by_date[d] = by_date.get(d, 0) + 1
        return jsonify([{"date": k, "count": v} for k, v in sorted(by_date.items())])


@app.route('/api/admin/analytics/overview', methods=['GET'])
@admin_required
def admin_analytics_overview():
    # Top categories
    events = Event.query.filter_by(moderation_status='approved').all()
    cat_counts = {}
    for e in events:
        if e.categories:
            for c in e.categories:
                cat_counts[c] = cat_counts.get(c, 0) + 1
    top_categories = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # Top organizers by events
    from sqlalchemy import desc
    top_organizers_query = db.session.query(
        User.id, User.name, User.avatar_url,
        sa_func.count(Event.id).label('events_count')
    ).join(Event, Event.organizer_id == User.id).group_by(User.id, User.name, User.avatar_url).order_by(desc('events_count')).limit(10).all()

    top_organizers = [{
        "id": o.id, "name": o.name, "avatarUrl": public_upload_url(o.avatar_url) or "",
        "eventsCount": o.events_count
    } for o in top_organizers_query]

    # User type distribution
    user_types = db.session.query(
        User.user_type, sa_func.count(User.id)
    ).group_by(User.user_type).all()

    # Vibe distribution
    vibe_counts = {}
    for e in events:
        if e.vibe:
            vibe_counts[e.vibe] = vibe_counts.get(e.vibe, 0) + 1

    # Total views
    total_views = sum(e.views or 0 for e in events)

    # Average event price
    prices = [e.price_value for e in events if e.price_value and e.price_value > 0]
    avg_price = sum(prices) / len(prices) if prices else 0

    return jsonify({
        "topCategories": [{"name": c[0], "count": c[1]} for c in top_categories],
        "topOrganizers": top_organizers,
        "userTypeDistribution": [{"type": t[0], "count": t[1]} for t in user_types],
        "vibeDistribution": [{"name": k, "count": v} for k, v in sorted(vibe_counts.items(), key=lambda x: x[1], reverse=True)],
        "totalViews": total_views,
        "averageEventPrice": round(avg_price, 2),
        "freeEventsCount": len([e for e in events if not e.price_value or e.price_value == 0]),
        "paidEventsCount": len([e for e in events if e.price_value and e.price_value > 0])
    })



@app.route('/api/config', methods=['GET'])
def get_platform_config():
    """Public endpoint: returns all platform configuration for the frontend."""
    cities = City.query.order_by(City.sort_order, City.name).all()
    categories = Category.query.order_by(Category.sort_order, Category.label).all()
    vibes = Vibe.query.order_by(Vibe.sort_order).all()
    configs = {c.key: c.value for c in PlatformConfig.query.all()}

    return jsonify({
        "currencySymbol": configs.get("currency_symbol", "$"),
        "platformName": configs.get("platform_name", "Eventum"),
        "cities": [{
            "id": c.id, "name": c.name, "sortOrder": c.sort_order,
            "districts": [{"id": d.id, "name": d.name, "sortOrder": d.sort_order} for d in c.districts]
        } for c in cities],
        "categories": [{"id": c.id, "slug": c.slug, "label": c.label, "icon": c.icon, "sortOrder": c.sort_order, "type": c.type} for c in categories],
        "vibes": [{"id": v.id, "slug": v.slug, "label": v.label, "icon": v.icon, "sortOrder": v.sort_order} for v in vibes],
    })

# --- Admin: Platform Config ---

@app.route('/api/admin/config', methods=['GET', 'PUT'])
@jwt_required()
def admin_platform_config():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    if request.method == 'GET':
        configs = {c.key: c.value for c in PlatformConfig.query.all()}
        return jsonify(configs)

    data = request.json
    for key, value in data.items():
        conf = db.session.get(PlatformConfig, key)
        if conf:
            conf.value = str(value)
        else:
            db.session.add(PlatformConfig(key=key, value=str(value)))
    db.session.commit()
    return jsonify({"message": "Config updated"})

# --- Admin: Cities CRUD ---

@app.route('/api/admin/cities', methods=['GET', 'POST'])
@jwt_required()
def admin_cities():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    if request.method == 'POST':
        data = request.json
        name = sanitize_html(data.get('name', '').strip())
        if not name:
            return jsonify({"error": "City name is required"}), 400
        if City.query.filter_by(name=name).first():
            return jsonify({"error": "City already exists"}), 409
        city = City(name=name, sort_order=data.get('sortOrder', 0))
        db.session.add(city)
        db.session.commit()
        return jsonify({"id": city.id, "name": city.name, "sortOrder": city.sort_order}), 201

    cities = City.query.order_by(City.sort_order, City.name).all()
    return jsonify([{"id": c.id, "name": c.name, "sortOrder": c.sort_order,
                     "districts": [{"id": d.id, "name": d.name, "sortOrder": d.sort_order} for d in c.districts]}
                    for c in cities])

@app.route('/api/admin/cities/<int:city_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_city_detail(city_id):
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403
    city = db.session.get(City, city_id)
    if not city:
        return jsonify({"error": "City not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(city)
        db.session.commit()
        return jsonify({"message": "City deleted"})
    data = request.json
    if 'name' in data:
        city.name = sanitize_html(data['name'].strip())
    if 'sortOrder' in data:
        city.sort_order = data['sortOrder']
    db.session.commit()
    return jsonify({"id": city.id, "name": city.name, "sortOrder": city.sort_order})

# --- Admin: Districts CRUD ---

@app.route('/api/admin/districts', methods=['GET', 'POST'])
@jwt_required()
def admin_districts():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    if request.method == 'POST':
        data = request.json
        name = sanitize_html(data.get('name', '').strip())
        city_id = data.get('cityId')
        if not name or not city_id:
            return jsonify({"error": "Name and cityId are required"}), 400
        district = District(name=name, city_id=city_id, sort_order=data.get('sortOrder', 0))
        db.session.add(district)
        db.session.commit()
        return jsonify({"id": district.id, "name": district.name, "cityId": district.city_id}), 201

    districts = District.query.order_by(District.sort_order).all()
    return jsonify([{"id": d.id, "name": d.name, "cityId": d.city_id, "sortOrder": d.sort_order} for d in districts])

@app.route('/api/admin/districts/<int:district_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_district_detail(district_id):
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403
    district = db.session.get(District, district_id)
    if not district:
        return jsonify({"error": "District not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(district)
        db.session.commit()
        return jsonify({"message": "District deleted"})
    data = request.json
    if 'name' in data:
        district.name = sanitize_html(data['name'].strip())
    if 'sortOrder' in data:
        district.sort_order = data['sortOrder']
    if 'cityId' in data:
        district.city_id = data['cityId']
    db.session.commit()
    return jsonify({"id": district.id, "name": district.name, "cityId": district.city_id})

# --- Admin: Categories CRUD ---

@app.route('/api/admin/categories', methods=['GET', 'POST'])
@jwt_required()
def admin_categories():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    if request.method == 'POST':
        data = request.json
        slug = sanitize_html(data.get('slug', '').strip().lower())
        label = sanitize_html(data.get('label', '').strip())
        if not slug or not label:
            return jsonify({"error": "Slug and label are required"}), 400
        if Category.query.filter_by(slug=slug).first():
            return jsonify({"error": "Category slug already exists"}), 409
        cat = Category(slug=slug, label=label, icon=data.get('icon', 'apps-outline'),
                       sort_order=data.get('sortOrder', 0), type=data.get('type', 'both'))
        db.session.add(cat)
        db.session.commit()
        return jsonify({"id": cat.id, "slug": cat.slug, "label": cat.label, "icon": cat.icon, "type": cat.type}), 201

    cats = Category.query.order_by(Category.sort_order, Category.label).all()
    return jsonify([{"id": c.id, "slug": c.slug, "label": c.label, "icon": c.icon, "sortOrder": c.sort_order, "type": c.type} for c in cats])

@app.route('/api/admin/categories/<int:cat_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_category_detail(cat_id):
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403
    cat = db.session.get(Category, cat_id)
    if not cat:
        return jsonify({"error": "Category not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(cat)
        db.session.commit()
        return jsonify({"message": "Category deleted"})
    data = request.json
    if 'label' in data:
        cat.label = sanitize_html(data['label'].strip())
    if 'icon' in data:
        cat.icon = data['icon']
    if 'sortOrder' in data:
        cat.sort_order = data['sortOrder']
    if 'type' in data:
        cat.type = data['type']
    db.session.commit()
    return jsonify({"id": cat.id, "slug": cat.slug, "label": cat.label, "icon": cat.icon, "type": cat.type})

# --- Admin: Vibes CRUD ---

@app.route('/api/admin/vibes', methods=['GET', 'POST'])
@jwt_required()
def admin_vibes():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    if request.method == 'POST':
        data = request.json
        slug = sanitize_html(data.get('slug', '').strip().lower())
        label = sanitize_html(data.get('label', '').strip())
        icon = data.get('icon', 'flash')
        if not slug or not label:
            return jsonify({"error": "Slug and label are required"}), 400
        if Vibe.query.filter_by(slug=slug).first():
            return jsonify({"error": "Vibe slug already exists"}), 409
        vibe = Vibe(slug=slug, label=label, icon=icon, sort_order=data.get('sortOrder', 0))
        db.session.add(vibe)
        db.session.commit()
        return jsonify({"id": vibe.id, "slug": vibe.slug, "label": vibe.label, "icon": vibe.icon}), 201

    vibes = Vibe.query.order_by(Vibe.sort_order).all()
    return jsonify([{"id": v.id, "slug": v.slug, "label": v.label, "icon": v.icon, "sortOrder": v.sort_order} for v in vibes])

@app.route('/api/admin/vibes/<int:vibe_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_vibe_detail(vibe_id):
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403
    vibe = db.session.get(Vibe, vibe_id)
    if not vibe:
        return jsonify({"error": "Vibe not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(vibe)
        db.session.commit()
        return jsonify({"message": "Vibe deleted"})
    data = request.json
    if 'label' in data:
        vibe.label = sanitize_html(data['label'].strip())
    if 'icon' in data:
        vibe.icon = data['icon']
    if 'sortOrder' in data:
        vibe.sort_order = data['sortOrder']
    db.session.commit()
    return jsonify({"id": vibe.id, "slug": vibe.slug, "label": vibe.label, "icon": vibe.icon})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
