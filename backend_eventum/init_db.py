import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# 1. ТВОИ ДАННЫЕ (ИЗМЕНИ ТОЛЬКО ПАРОЛЬ НИЖЕ)
ROOT_USER = "postgres"
ROOT_PASS = "Saturn1981" 

# Данные из твоего .env
NEW_USER = "backend_app"
NEW_PASS = "qoziwe"
NEW_DB = "eventummobile"

def setup():
    try:
        # Подключаемся к системной базе для создания новой
        conn = psycopg2.connect(dbname='postgres', user=ROOT_USER, password=ROOT_PASS, host='localhost')
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # Создаем пользователя, если его нет
        cur.execute(f"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '{NEW_USER}') "
                    f"THEN CREATE USER {NEW_USER} WITH PASSWORD '{NEW_PASS}'; END IF; END $$;")
        print(f"Пользователь {NEW_USER} готов.")

        # Создаем базу данных, если её нет
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{NEW_DB}'")
        if not cur.fetchone():
            cur.execute(f"CREATE DATABASE {NEW_DB} OWNER {NEW_USER};")
            print(f"База данных {NEW_DB} создана.")
        else:
            print(f"База {NEW_DB} уже существует.")

        cur.close()
        conn.close()
        print("\n--- ВСЁ ГОТОВО. ТЕПЕРЬ ЗАПУСКАЙ reset_db.py ---")

    except Exception as e:
        print(f"Критическая ошибка: {e}")

if __name__ == "__main__":
    setup()