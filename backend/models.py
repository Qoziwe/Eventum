from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime
import uuid

db = SQLAlchemy()
bcrypt = Bcrypt()

# Таблицы связей
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
    
    following = db.relationship(
        'User', secondary=follows,
        primaryjoin=(follows.c.follower_id == id),
        secondaryjoin=(follows.c.organizer_id == id),
        backref=db.backref('followers', lazy='dynamic'), lazy='dynamic'
    )
    interests = db.relationship('Interest', secondary=user_interests, backref=db.backref('users', lazy='dynamic'))
    saved_events = db.relationship('Event', secondary=favorites, backref=db.backref('favorited_by', lazy='dynamic'))
    created_events = db.relationship('Event', backref='organizer_rel', lazy=True)
    tickets = db.relationship('Ticket', backref='owner', lazy=True)

class Event(db.Model):
    __tablename__ = 'events'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"event_{uuid.uuid4().hex[:8]}")
    title = db.Column(db.String(200), nullable=False)
    full_description = db.Column(db.Text)
    organizer_name = db.Column(db.String(100))
    organizer_avatar = db.Column(db.String(500))
    time_range = db.Column(db.String(100))
    organizer_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    vibe = db.Column(db.String(50))
    district = db.Column(db.String(100))
    age_limit = db.Column(db.Integer, default=0)
    tags = db.Column(db.JSON) 
    categories = db.Column(db.JSON) 
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    event_timestamp = db.Column(db.BigInteger) 
    price_value = db.Column(db.Float, default=0.0)
    location = db.Column(db.String(200))
    image = db.Column(db.String(500))
    views = db.Column(db.Integer, default=0)
    stats = db.Column(db.Integer, default=0)

class EventView(db.Model):
    __tablename__ = 'event_views'
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.String(50), db.ForeignKey('events.id'), nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    content = db.Column(db.Text, nullable=False)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    age_limit = db.Column(db.Integer, default=0)
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
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    content = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.String(50), db.ForeignKey('comments.id'), nullable=True)
    depth = db.Column(db.Integer, default=0)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    
    author = db.relationship('User', backref='comments')

class Ticket(db.Model):
    __tablename__ = 'tickets'
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"tick_{uuid.uuid4().hex[:8]}")
    event_id = db.Column(db.String(50), db.ForeignKey('events.id'), nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)
    event = db.relationship('Event', backref='sold_tickets')
    
    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='unique_event_user_ticket'),
    )