import psycopg2
import os
import shutil

# Настройки подключения (изменены для соответствия app.py)
DB_NAME = "eventummobile"
DB_USER = "backend_app"
DB_PASS = "qoziwe"
DB_HOST = "localhost"

# Пути к медиафайлам (относительно скрипта)
UPLOAD_ROOT = "uploads"
AVATARS_FOLDER = os.path.join(UPLOAD_ROOT, "avatars")
EVENTS_FOLDER = os.path.join(UPLOAD_ROOT, "events")

def clear_media_files():
    """Очищает папки с медиафайлами, сохраняя структуру."""
    folders = [AVATARS_FOLDER, EVENTS_FOLDER]
    
    for folder in folders:
        if not os.path.exists(folder):
            try:
                os.makedirs(folder)
            except OSError:
                pass
            continue
            
        try:
            # Удаляем все файлы в папке
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                        print(f"Удален файл: {file_path}")
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                        print(f"Удалена папка: {file_path}")
                except Exception as e:
                    print(f"Ошибка при удалении {file_path}: {e}")
            
            print(f"Папка {folder} очищена.")
        except Exception as e:
            print(f"Ошибка при очистке папки {folder}: {e}")

def drop_tables():
    """Удаляет таблицы полностью, чтобы Flask пересоздал их с новыми колонками."""
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("--- Начинаю удаление таблиц ---")

        # Список ВСЕХ таблиц, которые используются в вашем приложении (согласно app.py и моделям)
        tables_to_drop = [
            "messages",        # Новая таблица для сообщений
            "friendships",     # Новая таблица для друзей
            "notifications",
            "event_views",
            "tickets",
            "comments",
            "post_votes",
            "posts",
            "favorites",
            "user_interests",
            "follows",
            "events",
            "users",
            "interests_list",
            "alembic_version"
        ]

        for table in tables_to_drop:
            try:
                # CASCADE удаляет также связи (foreign keys), связанные с этой таблицей
                cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                print(f"Таблица {table} удалена.")
            except Exception as e:
                print(f"Ошибка при удалении {table}: {e}")

        print("--- Все таблицы удалены ---")

    except Exception as e:
        print(f"Критическая ошибка при работе с БД: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    print("=== Полный сброс базы данных и медиафайлов ===")
    
    # 1. Очищаем медиафайлы
    clear_media_files()
    
    # 2. Удаляем таблицы (чтобы пересоздать структуру)
    drop_tables()
    
    print("\n=== Готово! Теперь запусти app.py, и таблицы создадутся с новыми полями ===")