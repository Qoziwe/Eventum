import requests
import threading
import os
import time  # <--- ВАЖНО: Нужно для пауз
from datetime import datetime

class ODataService:
    # Настройки подключения
    BASE_URL = os.getenv('ODATA_URL', 'http://localhost/EventumBase/odata/standard.odata')
    AUTH = (os.getenv('ODATA_LOGIN', 'Administrator'), os.getenv('ODATA_PASS', ''))
    
    # 'Connection': 'close' - обязательно, чтобы сбрасывать звонок сразу
    HEADERS = {
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'Connection': 'close' 
    }

    # "ОХРАННИК" (Очередь).
    _lock = threading.Lock()

    @staticmethod
    def _send_request(endpoint, data):
        """Фоновая отправка с ПОВТОРОМ (Retry), если 1С занята"""
        def task():
            with ODataService._lock:
                # Пытаемся 3 раза пробиться
                for attempt in range(1, 4):
                    try:
                        # Добавляем ?$format=json
                        url = f"{ODataService.BASE_URL}/{endpoint}?$format=json"
                        if attempt > 1:
                            print(f"[1C] Попытка {attempt}/3 отправки в {endpoint}...")
                        else:
                            print(f"[1C Debug] Отправка в {endpoint}: {data}")
                        
                        response = requests.post(
                            url, 
                            auth=ODataService.AUTH, 
                            json=data, 
                            headers=ODataService.HEADERS, 
                            timeout=10
                        )
                        
                        # Если успех (201 Created или 200 OK)
                        if response.status_code < 400:
                            print(f"[1C Success] Данные доставлены!")
                            return # Выходим из цикла, всё ок

                        # Если ошибка - печатаем и ждем
                        print(f"[1C Error] {response.status_code}. Ждем 2 сек...")
                        time.sleep(2) # <--- Ждем, пока 1С освободится

                    except Exception as e:
                        print(f"[1C Fail] Ошибка связи: {e}")
                        time.sleep(2)
                
                print("[1C Final] Не удалось отправить данные после 3 попыток.")

        thread = threading.Thread(target=task)
        thread.start()

    @staticmethod
    def send_new_user(user_id, email, nickname):
        payload = {
            "Code": "", 
            "Description": nickname,
            "Email": email,
            "UserFluxID": str(user_id)
        }
        ODataService._send_request("Catalog_Users", payload)

    @staticmethod
    def create_event_in_1c(event_id, title, creator_id):
        payload = {
            "Code": "",
            "Description": title,
            "EventFluxID": str(event_id),
            "CreatorID": str(creator_id),
            "IsApproved": False 
        }
        ODataService._send_request("Catalog_Events", payload)

    @staticmethod
    def send_ticket_sale(ticket_id, user_flask_id, event_title, price, quantity, event_id):
        current_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        payload = {
            "Date": current_date,
            "TicketID": str(ticket_id),
            "UserFluxID": str(user_flask_id),
            "EventTitle": event_title,
            "EventID": str(event_id),
            "Price": float(price),
            "Quantity": int(quantity),
            "Sum": float(price) * int(quantity)
        }
        ODataService._send_request("Document_TicketSale", payload)

    @staticmethod
    def get_approved_event_ids():
        """Получение данных тоже с повторами"""
        with ODataService._lock:
            # Тоже пробуем 3 раза
            for attempt in range(1, 4):
                try:
                    url = f"{ODataService.BASE_URL}/Catalog_Events?$format=json&$filter=IsApproved eq true&$select=EventFluxID"
                    
                    response = requests.get(
                        url, 
                        auth=ODataService.AUTH, 
                        headers=ODataService.HEADERS, 
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        ids = [item['EventFluxID'] for item in data.get('value', []) if item.get('EventFluxID')]
                        return ids
                    
                    print(f"[Sync Retry] 1C занята ({response.status_code}), ждем 2 сек...")
                    time.sleep(2)

                except Exception as e:
                    print(f"[Sync Retry] Ошибка: {e}")
                    time.sleep(2)
            
            return []