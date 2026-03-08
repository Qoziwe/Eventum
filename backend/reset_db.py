import os
import shutil
from dotenv import load_dotenv
from app import app, db, bcrypt
from models import User

load_dotenv()

# Пути к медиафайлам
UPLOAD_ROOT = "uploads"
AVATARS_FOLDER = os.path.join(UPLOAD_ROOT, "avatars")
EVENTS_FOLDER = os.path.join(UPLOAD_ROOT, "events")

def clear_media_files():
    """Очищает папки с медиафайлами, сохраняя структуру."""
    folders = [AVATARS_FOLDER, EVENTS_FOLDER]
    
    for folder in folders:
        if not os.path.exists(folder):
            os.makedirs(folder, exist_ok=True)
            continue
            
        try:
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            print(f"Папка {folder} очищена.")
        except Exception as e:
            print(f"Ошибка при очистке папки {folder}: {e}")

def reset_database():
    """Сбрасывает базу данных через SQLAlchemy."""
    with app.app_context():
        print("--- Начинаю сброс базы данных ---")
        db.drop_all()
        db.create_all()
        print("--- База данных пересоздана ---")

def create_admin_user():
    """Создаёт администратора."""
    with app.app_context():
        try:
            admin = User(
                name='Lekim',
                username='Lekim',
                email='lekim@gmail.com',
                password_hash=bcrypt.generate_password_hash(os.getenv('ADMIN_PASSWORD')).decode('utf-8'),
                is_admin=True,
                user_type='admin',
            )
            db.session.add(admin)
            db.session.commit()
            print("✅ Админ создан: Lekim (lekim@gmail.com)")
        except Exception as e:
            print(f"Ошибка при создании админа: {e}")

if __name__ == "__main__":
    print("=== Полный сброс базы данных и медиафайлов ===")
    clear_media_files()
    reset_database()
    create_admin_user()
    print("\n=== Готово! Запускай app.py ===")