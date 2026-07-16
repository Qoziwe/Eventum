# Инструкция по развертыванию проекта (Eventum) на сервере Ubuntu

В этом руководстве описан процесс развертывания **backend-части** проекта на Ubuntu Server и настройки связи с **frontend-частью**, которая хостится на GitHub Pages.

## 1. Подготовка сервера

Подключитесь к вашему серверу по SSH:
```bash
ssh user@your_server_ip
```

Обновите пакеты и установите необходимые зависимости:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip python3-venv nginx git curl libmagic1 -y
```

## 2. Клонирование проекта

Создайте директорию для проекта и клонируйте репозиторий:
```bash
cd ~
git clone https://github.com/ВАШ_АККАУНТ/ВАШ_РЕПОЗИТОРИЙ.git eventum
cd eventum/backend
```

## 3. Настройка Backend (Python/Flask)

### 3.1 Создание виртуального окружения
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3.2 Установка зависимостей
Установите зависимости из файла (также добавьте `gunicorn` нужной версии для поддержки eventlet):
```bash
pip install -r requirements.txt
pip install "gunicorn==21.2.0"
```

### 3.3 Настройка переменных окружения
Скопируйте пример файла конфигурации и настройте его:
```bash
cp .env.example .env
nano .env
```

Отредактируйте переменные в `.env`:
* `JWT_SECRET_KEY` — сгенерируйте и впишите длинную случайную строку.
* `ADMIN_PASSWORD` — установите сложный пароль для админа.
* `CORS_ORIGINS` — укажите URL вашего сайта на GitHub Pages (например, `https://username.github.io`).
* `PUBLIC_URL` — укажите публичный IP-адрес вашего сервера (например, `http://89.22.12.33`) или домен, если есть.

### 3.4 Настройка базы данных

По умолчанию проект использует **SQLite** (база данных хранится в обычном файле `database.db`). Для SQLite не нужно устанавливать отдельный сервер баз данных. 

**Вариант 1: Использование SQLite (по умолчанию)**
Просто оставьте в файле `.env` строку: `DATABASE_URL=sqlite:///database.db`

**Вариант 2: Использование PostgreSQL (рекомендуется для Production)**
Если вы хотите использовать полноценную базу данных PostgreSQL:
1. Установите PostgreSQL на сервер:
   ```bash
   sudo apt install postgresql postgresql-contrib -y
   ```
2. Зайдите в консоль PostgreSQL и создайте базу данных и пользователя:
   ```bash
   sudo -u postgres psql
   ```
   Внутри консоли `psql` выполните:
   ```sql
   CREATE DATABASE eventum_db;
   CREATE USER eventum_user WITH PASSWORD 'your_secure_password';
   ALTER ROLE eventum_user SET client_encoding TO 'utf8';
   ALTER ROLE eventum_user SET default_transaction_isolation TO 'read committed';
   ALTER ROLE eventum_user SET timezone TO 'UTC';
   GRANT ALL PRIVILEGES ON DATABASE eventum_db TO eventum_user;
   \q
   ```
3. Установите драйвер в ваше виртуальное окружение:
   ```bash
   pip install psycopg2-binary
   ```
4. В файле `.env` измените `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://eventum_user:your_secure_password@localhost/eventum_db
   ```

### 3.5 Инициализация базы данных
Независимо от того, выбрали вы SQLite или PostgreSQL, вам нужно создать таблицы и первичные данные. Выполните скрипт инициализации:
```bash
python reset_db.py
```

## 4. Настройка Gunicorn как службы (systemd)

Чтобы сервер работал в фоновом режиме и автоматически запускался при перезагрузке, создадим systemd сервис.

Откройте файл для создания службы:
```bash
sudo nano /etc/systemd/system/eventum.service
```

Вставьте следующую конфигурацию (замените `user` на ваше имя пользователя Ubuntu):
```ini
[Unit]
Description=Gunicorn instance to serve Eventum Backend
After=network.target

[Service]
User=user
Group=www-data
WorkingDirectory=/home/user/eventum/backend
Environment="PATH=/home/user/eventum/backend/venv/bin"
ExecStart=/home/user/eventum/backend/venv/bin/gunicorn --worker-class eventlet --workers 1 --bind 127.0.0.1:5001 app:app

[Install]
WantedBy=multi-user.target
```

Запустите и включите службу:
```bash
sudo systemctl daemon-reload
sudo systemctl restart eventum
sudo systemctl enable eventum
```

Проверьте статус (должен быть `active (running)`):
```bash
sudo systemctl status eventum
```

## 5. Настройка Nginx в качестве Reverse Proxy

Nginx будет принимать запросы на 80 (и 443) порту и перенаправлять их в Gunicorn (5001 порт), включая поддержку WebSockets.

Создайте конфигурационный файл Nginx:
```bash
sudo nano /etc/nginx/sites-available/eventum
```

Добавьте следующую конфигурацию (вместо `your_server_ip` укажите ваш домен nip.io):
```nginx
server {
    listen 80;
    server_name your_server_ip;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируйте конфигурацию и перезапустите Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/eventum /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

> **Важно**: убедитесь, что порт 80 открыт в файерволе вашего сервера (например: `sudo ufw allow 'Nginx Full'`).

---

## 6. Настройка Frontend (GitHub Pages) для работы с Backend

Поскольку frontend работает на GitHub Pages, он представляет собой просто статические файлы в браузере, и у него нет серверного окружения, в котором можно было бы считывать локальный `.env`. Переменные окружения должны внедряться **на этапе сборки (build time)**.

### Как привязать Frontend к вашему новому Backend на сервере:

1. Зайдите в репозиторий проекта на GitHub.
2. Перейдите в **Settings** -> **Secrets and variables** -> **Actions**.
3. Нажмите **New repository secret** (или variable).
4. Укажите Name: `EXPO_PUBLIC_API_URL`
5. Укажите Secret (или Value): `http://ВАШ_IP_СЕРВЕРА/api` (замените на IP вашего сервера).
6. Отредактируйте файл `.github/workflows/deploy.yml` в вашем проекте, чтобы переменная окружения передавалась при сборке.

Добавьте блок `env` в шаг сборки:
```yaml
      - name: Build with Expo
        run: |
          cd frontend
          npx expo export --platform web
        env:
          CI: false
          NODE_OPTIONS: "--max_old_space_size=4096"
          EXPO_PUBLIC_API_URL: ${{ secrets.EXPO_PUBLIC_API_URL }}
```

После этого сделайте коммит и пуш в ветку `main`. GitHub Actions заново соберет frontend и пропишет туда ваш IP адрес бекенда!