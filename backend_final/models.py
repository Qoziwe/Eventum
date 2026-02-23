from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime, timezone
import uuid

db = SQLAlchemy()
bcrypt = Bcrypt()

# --- ТАБЛИЦЫ СВЯЗЕЙ (Многие-ко-многим) ---
follows = db.Table('follows',
    db.Column('follower_id', db.String(50), db.ForeignKey('users.id'), primary_key=True),
    db.Column('organizer_id', db.String(50), db.ForeignKey('users.id'), primary_key=True)
)

user_interests = db.Table('user_interests',
    db.Column('user_id', db.String(50), db.ForeignKey('users.id'), primary_key=True),
    db.Column('interest_name', db.String(100), db.ForeignKey('interests_list.name'), primary_key=True)
)

favorites = db.Table('favorites',
    db.Column('user_id', db.String(50), db.ForeignKey('users.id'), primary_key=True),
    db.Column('event_id', db.String(50), db.ForeignKey('events.id'), primary_key=True)
)

# --- МОДЕЛИ ---

class Interest(db.Model):
    __tablename__ = 'interests_list'
    name = db.Column(db.String(100), primary_key=True)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"user_{uuid.uuid4().hex[:8]}")
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    phone = db.Column(db.String(20))
    location = db.Column(db.String(100))
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.String(500))
    user_type = db.Column(db.String(20), default='explorer')
    subscription_status = db.Column(db.String(20), default='none')
    birth_date = db.Column(db.String(10)) 
    last_seen = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    is_admin = db.Column(db.Boolean, default=False)
    is_banned = db.Column(db.Boolean, default=False)
    ban_reason = db.Column(db.Text, nullable=True)
    registered_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Статус синхронизации с 1С
    is_synced = db.Column(db.Boolean, default=False)
    
    # Связи
    following = db.relationship(
        'User', secondary=follows,
        primaryjoin=(follows.c.follower_id == id),
        secondaryjoin=(follows.c.organizer_id == id),
        backref=db.backref('followers', lazy='dynamic'), lazy='dynamic'
    )
    interests = db.relationship('Interest', secondary=user_interests, backref=db.backref('users', lazy='dynamic'))
    saved_events = db.relationship('Event', secondary=favorites, backref=db.backref('favorited_by', lazy='dynamic'))
    
    created_events = db.relationship('Event', backref='organizer_rel', lazy=True)
    
    # Связь с билетами
    tickets = db.relationship('Ticket', backref='owner', lazy=True)

class Event(db.Model):
    __tablename__ = 'events'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"event_{uuid.uuid4().hex[:8]}")
    title = db.Column(db.String(200), nullable=False)
    full_description = db.Column(db.Text)
    
    # Организатор
    organizer_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    organizer_name = db.Column(db.String(100))
    organizer_avatar = db.Column(db.String(500))
    
    # Детали
    time_range = db.Column(db.String(100))
    vibe = db.Column(db.String(50))
    district = db.Column(db.String(100))
    age_limit = db.Column(db.Integer, default=0)
    tags = db.Column(db.JSON) 
    categories = db.Column(db.JSON) 
    location = db.Column(db.String(200))
    image = db.Column(db.String(500))
    
    # Даты и статистика
    added_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    event_timestamp = db.Column(db.BigInteger) 
    views = db.Column(db.Integer, default=0)
    stats = db.Column(db.Integer, default=0)
    
    # Модерация
    moderation_status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    rejection_reason = db.Column(db.Text, nullable=True)

    # Цена и Синхронизация
    price_value = db.Column(db.Float, default=0.0)  # Старое поле (для совместимости)
    price = db.Column(db.Float, default=0.0)         # Новое поле для актуальной цены
    is_synced = db.Column(db.Boolean, default=False)

class EventView(db.Model):
    __tablename__ = 'event_views'
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.String(50), db.ForeignKey('events.id'), nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    viewed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='unique_event_user_view'),
        db.Index('idx_event_view_time', 'event_id', 'viewed_at'),
    )
    
    user = db.relationship('User', backref='event_views')
    event = db.relationship('Event', backref='views_log')

class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"post_{uuid.uuid4().hex[:8]}")
    category_slug = db.Column(db.String(100))
    category_name = db.Column(db.String(100))
    author_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    author_name = db.Column(db.String(100))
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    content = db.Column(db.Text, nullable=False)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    age_limit = db.Column(db.Integer, default=0)
    moderation_status = db.Column(db.String(20), default='approved')
    rejection_reason = db.Column(db.Text, nullable=True)
    comments = db.relationship('Comment', backref='post', lazy=True, cascade="all, delete-orphan")
    votes = db.relationship('PostVote', backref='post', lazy=True, cascade="all, delete-orphan")

class PostVote(db.Model):
    __tablename__ = 'post_votes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.String(50), db.ForeignKey('posts.id'), nullable=False)
    vote_type = db.Column(db.String(10))
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='unique_user_post_vote'),
    )
    
    user = db.relationship('User', backref='post_votes')

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"comm_{uuid.uuid4().hex[:8]}")
    post_id = db.Column(db.String(50), db.ForeignKey('posts.id'), nullable=False)
    author_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    author_name = db.Column(db.String(100))
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    content = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.String(50), db.ForeignKey('comments.id'), nullable=True)
    depth = db.Column(db.Integer, default=0)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    
    author = db.relationship('User', backref='comments')

# --- БИЛЕТЫ (БЕЗ UniqueConstraint — можно покупать несколько раз) ---
class Ticket(db.Model):
    __tablename__ = 'tickets'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"tick_{uuid.uuid4().hex[:8]}")
    
    # Связи
    event_id = db.Column(db.String(50), db.ForeignKey('events.id'), nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    
    # Детали
    quantity = db.Column(db.Integer, default=1)
    purchase_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Финансовая история и синхронизация
    purchase_price = db.Column(db.Float, default=0.0)  # За сколько реально купили
    is_synced = db.Column(db.Boolean, default=False)    # Отправлено ли в 1С
    
    # Relationships
    event = db.relationship('Event', backref='sold_tickets')
    # Связь с User уже есть через backref='owner' в модели User

class Friendship(db.Model):
    __tablename__ = 'friendships'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"friend_{uuid.uuid4().hex[:8]}")
    user_id_1 = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    user_id_2 = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending') 
    action_user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False) 
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        db.UniqueConstraint('user_id_1', 'user_id_2', name='unique_friendship'),
    )

class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"msg_{uuid.uuid4().hex[:8]}")
    sender_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_read = db.Column(db.Boolean, default=False)
    
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_messages')
