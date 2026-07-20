@echo off
chcp 65001 >nul

echo Запускаем Backend...
start cmd /k "cd backend && venv\Scripts\activate && python app.py"

echo Запускаем Frontend...
start cmd /k "cd frontend && npx expo start -c"

echo Все серверы запущены в новых окнах!