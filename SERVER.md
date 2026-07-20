# Production Server Deployment Guide (Ubuntu)

This guide covers deploying the **backend** on an Ubuntu Server and connecting it with the **frontend** hosted on GitHub Pages.

---

## 1. Server Preparation

Connect to your server via SSH:

```bash
ssh user@your_server_ip
```

Update packages and install dependencies:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip python3-venv nginx git curl libmagic1 -y
```

---

## 2. Clone the Repository

```bash
cd ~
git clone https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git eventum
cd eventum/backend
```

---

## 3. Backend Setup (Python/Flask)

### 3.1 Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3.2 Install Dependencies

```bash
pip install -r requirements.txt
pip install "gunicorn==21.2.0"
```

### 3.3 Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Set `MODE=prod` and fill in the `PROD_*` variables:

```env
MODE=prod

PROD_DATABASE_URL=postgresql://eventum_user:your_secure_password@localhost/eventum_db
PROD_JWT_SECRET_KEY=GENERATE-A-LONG-RANDOM-SECRET-AT-LEAST-64-CHARS
PROD_ADMIN_PASSWORD=GENERATE-A-STRONG-ADMIN-PASSWORD
PROD_CORS_ORIGINS=https://username.github.io
PROD_PUBLIC_URL=http://YOUR_SERVER_IP
```

> You can leave the `LOCAL_*` variables untouched. The app only reads `PROD_*` values when `MODE=prod`.

### 3.4 Database Setup

**Option 1: SQLite (simplest, suitable for small deployments)**

Set in `.env`:

```env
PROD_DATABASE_URL=sqlite:///database.db
```

No additional setup required.

**Option 2: PostgreSQL (recommended for production)**

1. Install PostgreSQL:

```bash
sudo apt install postgresql postgresql-contrib -y
```

2. Create database and user:

```bash
sudo -u postgres psql
```

Inside the `psql` console:

```sql
CREATE DATABASE eventum_db;
CREATE USER eventum_user WITH PASSWORD 'your_secure_password';
ALTER ROLE eventum_user SET client_encoding TO 'utf8';
ALTER ROLE eventum_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE eventum_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE eventum_db TO eventum_user;
\q
```

3. Install the Python driver:

```bash
pip install psycopg2-binary
```

4. Set in `.env`:

```env
PROD_DATABASE_URL=postgresql://eventum_user:your_secure_password@localhost/eventum_db
```

### 3.5 Initialize Database

Regardless of SQLite or PostgreSQL, run the initialization script:

```bash
python reset_db.py
```

This creates all tables and seeds the admin account (`lekim@gmail.com` with the password from `PROD_ADMIN_PASSWORD`).

---

## 4. Gunicorn Systemd Service

Create a systemd service so the server runs in the background and auto-starts on reboot.

```bash
sudo nano /etc/systemd/system/eventum.service
```

Paste the following configuration (replace `user` with your Ubuntu username):

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

> **Important**: Use exactly 1 eventlet worker. Multiple workers break in-memory WebSocket state.

Start and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart eventum
sudo systemctl enable eventum
```

Check status (should be `active (running)`):

```bash
sudo systemctl status eventum
```

---

## 5. Nginx Reverse Proxy

Nginx accepts requests on port 80 and forwards them to Gunicorn on port 5001, including full WebSocket support.

Create the Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/eventum
```

Paste the following (replace `your_server_ip` with your domain or IP):

```nginx
server {
    listen 80;
    server_name your_server_ip;

    client_max_body_size 10M;

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

Activate and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/eventum /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

> Make sure port 80 is open in the firewall: `sudo ufw allow 'Nginx Full'`

---

## 6. Frontend Deployment (GitHub Pages)

The frontend is a static build served from GitHub Pages. Environment variables must be injected at **build time**.

### Connect Frontend to Your Backend

1. Go to your GitHub repository.
2. Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
3. Click **New repository secret**.
4. Name: `EXPO_PUBLIC_API_URL`
5. Value: `http://YOUR_SERVER_IP/api` (replace with your server IP or domain).

The deployment workflow (`.github/workflows/deploy.yml`) already injects this variable during the Expo build:

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

After pushing to the `main` branch, GitHub Actions will rebuild the frontend with your backend URL.

---

## 7. Verification Checklist

After deployment, verify these work:

- [ ] Backend responds at `http://YOUR_SERVER_IP/api/config`
- [ ] Admin login works at the frontend with `lekim@gmail.com`
- [ ] Event creation sends event to moderation
- [ ] Real-time chat messages deliver instantly
- [ ] Image uploads display correctly (check `PROD_PUBLIC_URL` is correct)
- [ ] WebSocket connection establishes (check browser console for `[SocketManager] Connected`)

---

## 8. Useful Commands

```bash
# View backend logs
sudo journalctl -u eventum -f

# Restart backend after code changes
sudo systemctl restart eventum

# Restart Nginx after config changes
sudo systemctl restart nginx

# Re-initialize database (WARNING: deletes all data)
cd ~/eventum/backend
source venv/bin/activate
python reset_db.py
sudo systemctl restart eventum
```

---

## 9. Optional: HTTPS with Let's Encrypt

For production deployments with a domain name:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

After obtaining the certificate, update your `.env`:

```env
PROD_PUBLIC_URL=https://your-domain.com
PROD_CORS_ORIGINS=https://your-frontend-domain.com
```

Restart the backend:

```bash
sudo systemctl restart eventum
```
