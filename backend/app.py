from flask import Flask, request, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, bcrypt, User, Event, Post, Ticket, Comment, PostVote, EventView, Interest, user_interests, favorites, Friendship, Message
import datetime
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.url_map.strict_slashes = False

# Разрешаем CORS
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
        "supports_credentials": True
    }
})

# Инициализация SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://backend_app:qoziwe@localhost/eventummobile'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Увеличен ключ до 32+ байт, чтобы убрать InsecureKeyLengthWarning
app.config['JWT_SECRET_KEY'] = 'qoziwe_secret_super_key_32_chars_long_safety' 

# Настройка папок для загрузок
UPLOAD_ROOT = 'uploads'
AVATARS_FOLDER = os.path.join(UPLOAD_ROOT, 'avatars')
EVENTS_FOLDER = os.path.join(UPLOAD_ROOT, 'events')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

for folder in [UPLOAD_ROOT, AVATARS_FOLDER, EVENTS_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app.config['UPLOAD_ROOT'] = UPLOAD_ROOT
app.config['AVATARS_FOLDER'] = AVATARS_FOLDER
app.config['EVENTS_FOLDER'] = EVENTS_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def delete_user_avatar(avatar_url):
    if not avatar_url:
        return
    try:
        filename = avatar_url.split('/')[-1]
        file_path = os.path.join(AVATARS_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

def delete_event_image(image_url):
    if not image_url:
        return
    try:
        filename = image_url.split('/')[-1]
        file_path = os.path.join(EVENTS_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)

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
            "relatedId": self.related_id,
            "isRead": self.is_read,
            "timestamp": ts_str
        }

def user_to_dict(user):
    initials = ''.join([n[0] for n in user.name.split() if n]).upper()[:2] if user.name else "UN"
    interests = [i.name for i in user.interests]
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
        "followingOrganizerIds": [u.id for u in user.following], "birthDate": user.birth_date or "2000-01-01"
    }

# --- SOCKET EVENTS ---
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
    user_id = str(data.get('userId'))
    if user_id:
        room = f"user_{user_id}"
        join_room(room)

@socketio.on('private_message')
def on_private_message(data):
    sender_id = data.get('senderId')
    recipient_id = data.get('recipientId')
    content = data.get('content')
    
    if not sender_id or not recipient_id or not content:
        return
        
    msg = Message(sender_id=sender_id, recipient_id=recipient_id, content=content)
    db.session.add(msg)
    db.session.commit()
    
    msg_data = {
        "id": msg.id,
        "senderId": sender_id,
        "recipientId": recipient_id,
        "content": content,
        "timestamp": msg.timestamp.isoformat(),
        "isRead": False
    }
    
    emit('message_received', msg_data, room=f"user_{recipient_id}")
    emit('message_sent', msg_data, room=f"user_{sender_id}")

# --- ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email занят"}), 400
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(
        name=data.get('name', ''), username=data.get('username', data['email'].split('@')[0]),
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
            event_timestamp=data.get('timestamp', int(datetime.datetime.now().timestamp() * 1000))
        )
        db.session.add(new_event); db.session.commit()
        followers = organizer.followers 
        current_time = datetime.datetime.utcnow()
        notification_body = f"{organizer.name} создал(а): {new_event.title}"
        for follower in followers:
            notif_id = f"notif_{int(current_time.timestamp() * 1000)}_{follower.id}"
            notif = Notification(id=notif_id, recipient_id=follower.id, type='new_event', content=notification_body, related_id=str(new_event.id), timestamp=current_time)
            db.session.add(notif)
            socketio.emit('new_notification', notif.to_dict(), room=f"user_{follower.id}")
        db.session.commit()
        return jsonify({"id": new_event.id}), 201
    
    events = Event.query.all()
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
            "date": date_str
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
        new_post = Post(category_slug=data.get('categorySlug'), category_name=data.get('categoryName'), author_id=user_id, author_name=user.name, content=data['content'], age_limit=data.get('ageLimit', 0))
        db.session.add(new_post); db.session.commit()
        return jsonify({"id": new_post.id}), 201
    posts = Post.query.order_by(Post.timestamp.desc()).all()
    return jsonify([{"id": p.id, "categorySlug": p.category_slug, "categoryName": p.category_name, "authorId": p.author_id, "authorName": p.author_name, "content": p.content, "upvotes": p.upvotes or 0, "downvotes": p.downvotes or 0, "ageLimit": p.age_limit, "timestamp": p.timestamp.isoformat(), "commentCount": len(p.comments), "votedUsers": {v.user_id: v.vote_type for v in p.votes}} for p in posts])

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

@app.route('/uploads/avatars/<path:filename>')
def uploaded_avatar(filename):
    return send_from_directory(AVATARS_FOLDER, filename)

@app.route('/uploads/events/<path:filename>')
def uploaded_event_image(filename):
    return send_from_directory(EVENTS_FOLDER, filename)

@app.route('/api/user/upload-avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    if 'avatar' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['avatar']
    if file.filename == '' or not allowed_file(file.filename): return jsonify({"error": "Invalid file"}), 400
    user_id = get_jwt_identity(); user = db.session.get(User, user_id)
    if user.avatar_url: delete_user_avatar(user.avatar_url)
    ts = int(datetime.datetime.now().timestamp())
    filename = secure_filename(f"user_{user_id}_{ts}_{file.filename}")
    file.save(os.path.join(AVATARS_FOLDER, filename))
    user.avatar_url = f"{request.host_url.rstrip('/')}/uploads/avatars/{filename}"
    db.session.commit()
    return jsonify({"avatarUrl": user.avatar_url}), 200

@app.route('/api/events/upload-image', methods=['POST'])
@jwt_required()
def upload_event_image():
    if 'image' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['image']
    old_image_url = request.form.get('oldImage')
    if old_image_url: delete_event_image(old_image_url)
    if file.filename == '' or not allowed_file(file.filename): return jsonify({"error": "Invalid file"}), 400
    user_id = get_jwt_identity(); ts = int(datetime.datetime.now().timestamp())
    filename = secure_filename(f"event_{user_id}_{ts}_{file.filename}")
    file.save(os.path.join(EVENTS_FOLDER, filename))
    return jsonify({"imageUrl": f"{request.host_url.rstrip('/')}/uploads/events/{filename}"}), 200

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
            result.append({
                "userId": other_user.id,
                "name": other_user.name,
                "username": other_user.username,
                "avatarUrl": other_user.avatar_url,
                "lastMessage": m.content,
                "lastMessageTimestamp": m.timestamp.isoformat(),
                "isRead": m.is_read or (m.sender_id == user_id) # If I sent it, it's "read" for me in context of unread indicators usually, or we check m.is_read
            })
            
    return jsonify(sorted(result, key=lambda x: x['lastMessageTimestamp'], reverse=True))

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
    socketio.emit('friend_request', {"type": "new", "fromUser": user_id}, room=f"user_{target_id}")
    
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
        socketio.emit('friend_request', {"type": "accepted", "byUser": user_id}, room=f"user_{f.user_id_1}")
        return jsonify({"message": "Accepted"}), 200
    elif action == 'reject':
        db.session.delete(f)
        db.session.commit()
        return jsonify({"message": "Rejected"}), 200
        
    return jsonify({"error": "Invalid action"}), 400

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

if __name__ == '__main__':
    with app.app_context(): db.create_all()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)