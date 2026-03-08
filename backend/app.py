from flask import Flask, request, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, decode_token
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, bcrypt, User, Event, Post, Ticket, Comment, PostVote, EventView, Interest, user_interests, favorites, Friendship, Message
import datetime
import os
import functools
import re
import magic
from werkzeug.utils import secure_filename
from sqlalchemy import func as sa_func
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.url_map.strict_slashes = False

# Разрешаем CORS
# Разрешаем CORS
cors_origins = os.getenv('CORS_ORIGINS', '*').split(',')
CORS(app, resources={
    r"/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
        "supports_credentials": True
    }
})

# Инициализация SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Увеличен ключ до 32+ байт, чтобы убрать InsecureKeyLengthWarning
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 # 5 MB limit

# Настройка папок для загрузок
UPLOAD_ROOT = 'uploads'
AVATARS_FOLDER = os.path.join(UPLOAD_ROOT, 'avatars')
EVENTS_FOLDER = os.path.join(UPLOAD_ROOT, 'events')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Публичный URL сервера для формирования ссылок на загруженные файлы
# request.host_url возвращает localhost при работе за reverse proxy
PUBLIC_URL = os.getenv('PUBLIC_URL', 'https://54.38.156.234.nip.io')
if PUBLIC_URL.endswith('/'):
    PUBLIC_URL = PUBLIC_URL[:-1]

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

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.String(50), primary_key=True)
    recipient_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False) 
    content = db.Column(db.String(255), nullable=False)
    related_id = db.Column(db.String(50), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        ts_str = self.timestamp.isoformat() if self.timestamp else datetime.datetime.utcnow().isoformat()
        return {
            "id": self.id,
            "recipientId": self.recipient_id,
            "type": self.type,
            "content": self.content,
            "type": self.type,
            "relatedId": self.related_id,
            "isRead": self.is_read,
            "timestamp": ts_str
        }

def user_to_dict(user):
    initials = ''.join([n[0] for n in user.name.split() if n]).upper()[:2] if user.name else "UN"
    interests = [i.name for i in user.interests]
    is_online = user.id in connected_users
    last_seen_str = user.last_seen.isoformat() if user.last_seen else None
    
    return {
        "id": user.id, "name": user.name, "username": user.username, "email": user.email,
        "phone": user.phone or "", "userType": user.user_type, "location": user.location or "Алматы",
        "bio": user.bio or "", "avatarUrl": user.avatar_url or "", "avatarInitials": initials,
        "subscriptionStatus": user.subscription_status or "none", "subscriptionType": "None",
        "role": "Организатор" if user.user_type == 'organizer' else "Исследователь",
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

# Listener for disconnect is handled below

# Let's redefine properly
active_chats = {} # key: user_id (str), value: target_user_id (str)
sid_to_user = {} # key: sid, value: user_id

active_chats = {} # key: user_id (str), value: target_user_id (str)
sid_to_user = {} # key: sid, value: user_id

@socketio.on('connect')
def on_connect():
    token = request.args.get('token')
    # Fallback to authorization header if present (though standard socket.io client uses query or auth payload)
    if not token and request.args.get('auth'): # Check if client sent auth params in query (some do this)
         pass 

    # For socket.io standard auth, we might need to access the packet. 
    # But usually query params are easiest.
    
    if not token:
        # Try to see if it is in the auth dict (SocketIO 4+)
        # Flask-SocketIO doesn't expose auth dict easily in request.args.
        # It's better to rely on query for now as per our frontend change.
        return False

    try:
        decoded = decode_token(token)
        user_id = decoded['sub']
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
        
    msg = Message(sender_id=sender_id, recipient_id=recipient_id, content=content)
    db.session.add(msg)
    db.session.commit()
    
    msg_data = {
        "id": str(msg.id), # Убедимся, что ID строка
        "senderId": sender_id,
        "recipientId": recipient_id,
        "content": content,
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
            content=f"Новое сообщение от {sender_name}",
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
def register():
    data = request.json
    
    if not data.get('email') or not validate_email(data['email']):
        return jsonify({"error": "Некорректный email"}), 400
        
    if not data.get('password') or not validate_password(data['password']):
        return jsonify({"error": "Пароль должен быть не менее 6 символов"}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email занят"}), 400
        
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(
        name=data.get('name', '').strip() or 'User', 
        username=data.get('username', data['email'].split('@')[0]).strip(),
        email=data['email'], password_hash=hashed_password, user_type=data.get('userType', 'explorer'),
        birth_date=data.get('birthDate', '2000-01-01'), location=data.get('location', 'Алматы')
    )
    db.session.add(new_user); db.session.commit()
    token = create_access_token(identity=new_user.id, expires_delta=datetime.timedelta(days=7))
    return jsonify({"message": "OK", "token": token, "userId": new_user.id, "user": user_to_dict(new_user)}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        if user.is_banned:
            return jsonify({"error": f"Аккаунт заблокирован: {user.ban_reason or 'Нарушение правил'}"}), 403
        token = create_access_token(identity=user.id, expires_delta=datetime.timedelta(days=7))
        return jsonify({"token": token, "user": user_to_dict(user)}), 200
    return jsonify({"error": "Ошибка входа"}), 401

@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404
        
    data = request.json
    
    if 'name' in data: user.name = data['name']
    if 'username' in data:
        new_username = data['username'].strip().lower()
        if new_username != user.username:
            existing_user = User.query.filter_by(username=new_username).first()
            if existing_user:
                return jsonify({"error": "Это имя пользователя уже занято"}), 400
            user.username = new_username
    if 'bio' in data: user.bio = data['bio']
    if 'location' in data: user.location = data['location']
    if 'phone' in data: user.phone = data['phone']
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
            return jsonify({"error": "User not found"}), 404
        user.user_type = 'organizer'
        db.session.commit()
        return jsonify(user_to_dict(user))
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Internal Server Error"}), 500

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
    from sqlalchemy import func
    
    sales_data = db.session.query(
        func.to_char(Ticket.purchase_date, 'YYYY-MM-DD').label('date'),
        func.count(Ticket.id).label('count'),
        func.sum(Ticket.quantity * Event.price_value).label('revenue')
    ).join(Event).filter(
        Event.organizer_id == user_id,
        Ticket.purchase_date >= since
    ).group_by('date').order_by('date').all()
    
    return jsonify([
        {"date": s.date, "count": s.count, "revenue": s.revenue or 0} 
        for s in sales_data
    ])

@app.route('/api/organizer/analytics/views', methods=['GET'])
@jwt_required()
def get_views_analytics():
    user_id = get_jwt_identity()
    days = request.args.get('days', 30, type=int)
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    
    from sqlalchemy import func
    
    views_data = db.session.query(
        func.to_char(EventView.viewed_at, 'YYYY-MM-DD').label('date'),
        func.count(EventView.id).label('count')
    ).join(Event).filter(
        Event.organizer_id == user_id,
        EventView.viewed_at >= since
    ).group_by('date').order_by('date').all()
     
    return jsonify([
        {"date": v.date, "count": v.count} 
        for v in views_data
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
        new_event = Event(
            title=data['title'], full_description=data.get('fullDescription', ''),
            organizer_name=data.get('organizerName', ''), organizer_avatar=data.get('organizerAvatar', ''),
            time_range=data.get('timeRange', ''), organizer_id=user_id,
            vibe=data.get('vibe', 'chill'), district=data.get('district', ''),
            age_limit=data.get('ageLimit', 0), tags=data.get('tags', []),
            categories=data.get('categories', []), price_value=data.get('priceValue', 0),
            location=data.get('location', ''), image=data.get('image', ''),
            event_timestamp=data.get('timestamp', int(datetime.datetime.now().timestamp() * 1000)),
            moderation_status='pending'
        )
        db.session.add(new_event); db.session.commit()
        # Notify organizer that event is pending moderation
        current_time = datetime.datetime.utcnow()
        notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{user_id}"
        notif = Notification(id=notif_id, recipient_id=user_id, type='event_pending', content=f"Мероприятие \"{new_event.title}\" отправлено на модерацию", related_id=str(new_event.id), timestamp=current_time)
        db.session.add(notif); db.session.commit()
        socketio.emit('new_notification', notif.to_dict(), room=f"user_{user_id}")
        return jsonify({"id": new_event.id, "message": "Мероприятие отправлено на модерацию"}), 201
    
    # Public feed: approved events + organizer's own events (all statuses)
    user_id = get_jwt_identity()
    if user_id:
        events_query = Event.query.filter(
            (Event.moderation_status == 'approved') | (Event.organizer_id == user_id)
        )
    else:
        events_query = Event.query.filter(Event.moderation_status == 'approved')
    events = events_query.all()
    months_ru = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    result = []
    for e in events:
        if e.event_timestamp:
            dt = datetime.datetime.fromtimestamp(e.event_timestamp/1000)
            date_str = f"{dt.day} {months_ru[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}"
        else:
            dt = e.added_at
            date_str = f"{dt.day} {months_ru[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}"
        organizer = db.session.get(User, e.organizer_id)
        current_avatar = organizer.avatar_url if organizer and organizer.avatar_url else e.organizer_avatar
        result.append({
            "id": e.id, "title": e.title, "fullDescription": e.full_description,
            "organizerName": e.organizer_name, "organizerAvatar": current_avatar,
            "timeRange": e.time_range, "organizerId": e.organizer_id, "vibe": e.vibe,
            "district": e.district, "ageLimit": e.age_limit, "tags": e.tags,
            "categories": e.categories, "priceValue": e.price_value, "location": e.location, 
            "image": e.image, "views": e.views or 0, "timestamp": e.event_timestamp,
            "date": date_str, "moderationStatus": e.moderation_status
        })
    return jsonify(result)

@app.route('/api/events/<event_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def handle_single_event(event_id):
    user_id = get_jwt_identity()
    event = db.session.get(Event, event_id)
    if not event: return jsonify({"error": "Not found"}), 404
    if event.organizer_id != user_id: return jsonify({"error": "Forbidden"}), 403
    if request.method == 'PUT':
        if event.moderation_status == 'pending':
            return jsonify({"error": "Нельзя редактировать мероприятие пока оно на модерации"}), 403
        data = request.json
        new_image = data.get('image')
        if new_image and new_image != event.image:
            delete_event_image(event.image)
        event.title = data.get('title', event.title); event.full_description = data.get('fullDescription', event.full_description)
        event.location = data.get('location', event.location); event.district = data.get('district', event.district)
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
        db.session.rollback(); return jsonify({"error": str(e)}), 500

@app.route('/api/posts', methods=['GET', 'POST'])
@jwt_required(optional=True)
def handle_posts():
    if request.method == 'POST':
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user: return jsonify({"error": "User not found"}), 401
        data = request.json
        new_post = Post(category_slug=data.get('categorySlug'), category_name=data.get('categoryName'), author_id=user_id, author_name=user.name, content=data['content'], age_limit=data.get('ageLimit', 0), moderation_status='pending')
        db.session.add(new_post); db.session.commit()
        return jsonify({"id": new_post.id, "message": "Пост отправлен на модерацию"}), 201
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
    post = db.session.get(Post, post_id)
    if not post: return jsonify({"error": "Post not found"}), 404
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
    socketio.emit('vote_update', {"postId": post_id, "upvotes": post.upvotes, "downvotes": post.downvotes, "votedUsers": {v.user_id: v.vote_type for v in post.votes}}, room=str(post_id))
    return jsonify({"upvotes": post.upvotes, "downvotes": post.downvotes}), 200

@app.route('/api/posts/<post_id>/comments', methods=['GET', 'POST'])
@jwt_required(optional=True)
def handle_comments(post_id):
    if request.method == 'POST':
        user_id = get_jwt_identity(); user = db.session.get(User, user_id); data = request.json
        c = Comment(post_id=post_id, author_id=user_id, author_name=user.name, content=data['content'], parent_id=data.get('parentId'), depth=data.get('depth', 0))
        db.session.add(c); db.session.commit()
        comment_dict = {"id": c.id, "postId": c.post_id, "authorId": c.author_id, "authorName": c.author_name, "timestamp": c.timestamp.isoformat(), "content": c.content, "parentId": c.parent_id, "depth": c.depth, "upvotes": c.upvotes, "downvotes": c.downvotes}
        socketio.emit('new_comment', comment_dict, room=str(post_id))
        return jsonify(comment_dict), 201
    comms = Comment.query.filter_by(post_id=post_id).all()
    return jsonify([{"id": c.id, "postId": c.post_id, "authorId": c.author_id, "authorName": c.author_name, "timestamp": c.timestamp.isoformat(), "content": c.content, "parentId": c.parent_id, "depth": c.depth, "upvotes": c.upvotes, "downvotes": c.downvotes} for c in comms])

@app.route('/api/tickets/buy', methods=['POST'])
@jwt_required()
def buy_ticket():
    uid = get_jwt_identity(); data = request.json
    db.session.add(Ticket(event_id=data['eventId'], user_id=uid, quantity=data.get('quantity', 1)))
    db.session.commit()
    return jsonify({"message": "OK"}), 201

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
                "avatarUrl": other_user.avatar_url,
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
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_to_dict(user))

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
        "avatarUrl": u.avatar_url,
        "role": "Организатор" if u.user_type == 'organizer' else "Исследователь"
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
                "avatarUrl": friend.avatar_url,
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
                "avatarUrl": user.avatar_url,
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
                "avatarUrl": user.avatar_url,
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
    notification_body = f"Запрос в друзья от {user_id}" 
    # Better to use name if available, let's fetch sender
    sender = db.session.get(User, user_id)
    if sender:
        notification_body = f"Запрос в друзья от {sender.name}"

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
        notification_body = f"{acceptor.name} принял(а) заявку в друзья" if acceptor else "Заявка в друзья принята"

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
    remover_name = remover.name if remover else "Пользователь"
    
    notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{other_user_id}"
    notification_body = f"{remover_name} удалил(а) вас из друзей"
    
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

@app.route('/api/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user_profile_by_id(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_to_dict(user))

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

    months_ru = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    result = []
    for e in events:
        if e.event_timestamp:
            dt = datetime.datetime.fromtimestamp(e.event_timestamp/1000)
            date_str = f"{dt.day} {months_ru[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}"
        else:
            dt = e.added_at
            date_str = f"{dt.day} {months_ru[dt.month-1]}, {dt.hour:02d}:{dt.minute:02d}" if dt else ""
        organizer = db.session.get(User, e.organizer_id)
        result.append({
            "id": e.id, "title": e.title, "fullDescription": e.full_description,
            "organizerName": e.organizer_name, "organizerAvatar": organizer.avatar_url if organizer else e.organizer_avatar,
            "organizerId": e.organizer_id, "vibe": e.vibe,
            "district": e.district, "ageLimit": e.age_limit, "tags": e.tags,
            "categories": e.categories, "priceValue": e.price_value, "location": e.location,
            "image": e.image, "views": e.views or 0, "timestamp": e.event_timestamp,
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
            notification_body = f"{organizer.name} создал(а): {event.title}"
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
            content=f'Мероприятие "{event.title}" одобрено! {reason}',
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
            content=f'Мероприятие "{event.title}" отклонено. Причина: {reason or "Не указана"}',
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
            content=f'Ваш пост одобрен! {reason}',
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
            content=f'Ваш пост отклонён. Причина: {reason or "Не указана"}',
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
            "avatarUrl": u.avatar_url or "", "userType": u.user_type,
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
            content=f'Ваш аккаунт заблокирован. Причина: {reason or "Нарушение правил"}',
            related_id=user_id, timestamp=current_time
        )
        db.session.add(notif); db.session.commit()
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
        "id": o.id, "name": o.name, "avatarUrl": o.avatar_url or "",
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


if __name__ == '__main__':
    with app.app_context(): db.create_all()

    print("Starting SocketIO server on port 5001...")
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)