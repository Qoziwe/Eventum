# Backend Notes

Local development:

```bash
python app.py
```

The local Flask-SocketIO server listens on `http://localhost:5001`.

Production example:

```bash
gunicorn --worker-class eventlet -w 1 app:app --bind 0.0.0.0:5001
```

The app also uses Firebase for push notifications.
