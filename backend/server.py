"""
Высокопроизводительный сервер симуляции цифрового двойника «Су-Орта Азия».
Предоставляет:
1. HTTP REST API и раздачу статического веб-интерфейса (3D WebGL Three.js).
2. WebSocket сервер для трансляции телеметрии IoT в реальном времени.
3. Интеграцию гидрологического движка, моделей фильтрации, солепереноса и квот вододеления.
"""

import os
import sys
import json
import time
import asyncio
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

# Установка UTF-8 для консоли Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Импорт локальных вычислительных модулей
from hydrology_engine import HydrologyEngine
from transboundary_allocator import TransboundaryAllocator
from iot_telemetry_simulator import IoTTelemetrySimulator

HTTP_PORT = 8080
WS_PORT = 8765

class SimulationManager:
    """Управляющий класс симуляции цифрового двойника."""
    def __init__(self):
        self.гидрология = HydrologyEngine()
        self.трансграничный = TransboundaryAllocator()
        self.iot = IoTTelemetrySimulator()
        
        # Интерактивные параметры управления
        self.уровень_модернизации = 0.0     # 0.0 (Кризис) до 1.0 (Умная экосистема)
        self.глобальное_обновление = True
        self.засуха = False
        self.маловодный_год = False
        self.кош_тепа_отбор_км3 = 0.0        # 0 до 15 км³/год
        self.авария_утечка = False
        self.время_симуляции = 0.0

    def получить_полное_состояние(self):
        """Формирование комплексного снимка состояния водного баланса."""
        # 1. Расчет баланса и трансграничных квот
        баланс = self.трансграничный.расчет_распределения(
            уровень_модернизации=self.уровень_модернизации,
            кош_тепа_отбор_км3=self.кош_тепа_отбор_км3,
            маловодный_год=self.маловодный_год,
            засуха=self.засуха
        )
        
        # 2. Прогноз дефицита питьевой воды для городов
        города_дефицит = self.гидрология.прогноз_дефицита_городов(
            уровень_модернизации=self.уровень_модернизации,
            засуха_активна=self.засуха,
            маловодный_год=self.маловодный_год,
            кош_тепа_отбор_км3=self.кош_тепа_отбор_км3
        )
        
        # 3. Состояние ключевых водоемов
        водоемы = self.гидрология.расчет_деградации_водоемов(
            уровень_модернизации=self.уровень_модернизации,
            кош_тепа_отбор_км3=self.кош_тепа_отбор_км3,
            засуха_активна=self.засуха
        )
        
        # 4. Моделирование засоления почв и фильтрации
        тип_орош = 'КАПЕЛЬНОЕ_ОРОШЕНИЕ' if self.уровень_модернизации > 0.5 else 'БОРОЗДКОВЫЙ_ЗЕМЛЯНОЙ'
        почва = self.гидрология.симуляция_засоления_почвы(
            глубина_грунтовых_вод_м=1.4 + self.уровень_модернизации * 2.2,
            минерализация_воды_гл=2.8 * (1.0 - self.уровень_модернизации * 0.7),
            тип_орошения=тип_орош
        )
        
        # 5. Генерация телеметрии датчиков IoT
        датчики = self.iot.сгенерировать_отсчет_телеметрии(
            уровень_модернизации=self.уровень_модернизации,
            засуха=self.засуха,
            авария_утечка=self.авария_утечка
        )
        
        # 6. Обнаружение аномалий и предупреждений
        аномалии = self.iot.анализ_аномалий_утечек(датчики)
        все_предупреждения = list(set(баланс["предупреждения"] + аномалии))
        
        # Расчет комплексных показателей для HUD
        потери_фильтрации_процент = round(48.0 * (1.0 - self.уровень_модернизации * 0.88), 1)
        потери_испарения_процент = round(22.0 * (1.0 - self.уровень_модернизации * 0.72), 1)
        эффективность_системы_процент = round(10.0 + self.уровень_модернизации * 86.0, 1)
        
        риск_истощения = "КРИТИЧЕСКИЙ (10 ЛЕТ)" if self.уровень_модернизации < 0.25 else (
            "ПОВЫШЕННЫЙ" if self.уровень_модернизации < 0.65 else "УСТОЙЧИВАЯ БЕЗОПАСНОСТЬ"
        )
        
        return {
            "временная_метка": time.time(),
            "параметры_управления": {
                "уровень_модернизации": self.уровень_модернизации,
                "глобальное_обновление": self.глобальное_обновление,
                "засуха": self.засуха,
                "маловодный_год": self.маловодный_год,
                "кош_тепа_отбор_км3": self.кош_тепа_отбор_км3,
                "авария_утечка": self.авария_утечка
            },
            "сводные_метрики": {
                "эффективность_процент": эффективность_системы_процент,
                "потери_фильтрации_процент": потери_фильтрации_процент,
                "потери_испарения_процент": потери_испарения_процент,
                "риск_истощения": риск_истощения,
                "объем_экономии_км3_год": round(self.уровень_модернизации * 24.5, 2)
            },
            "баланс_бассейна": баланс,
            "города_водоснабжение": города_дефицит,
            "водоемы": водоемы,
            "почва_и_солончаки": почва,
            "телеметрия_датчиков": датчики,
            "журнал_предупреждений": все_предупреждения
        }

sim_manager = SimulationManager()

class CustomHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Папка со статическими файлами интерфейса
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
        super().__init__(*args, directory=frontend_dir, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            data = sim_manager.получить_полное_состояние()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/action":
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)
            try:
                payload = json.loads(post_body.decode('utf-8'))
                if "уровень_модернизации" in payload:
                    sim_manager.уровень_модернизации = float(payload["уровень_модернизации"])
                if "засуха" in payload:
                    sim_manager.засуха = bool(payload["засуха"])
                if "маловодный_год" in payload:
                    sim_manager.маловодный_год = bool(payload["маловодный_год"])
                if "кош_тепа_отбор_км3" in payload:
                    sim_manager.кош_тепа_отбор_км3 = float(payload["кош_тепа_отбор_км3"])
                if "авария_утечка" in payload:
                    sim_manager.авария_утечка = bool(payload["авария_утечка"])
                if "глобальное_обновление" in payload:
                    sim_manager.глобальное_обновление = bool(payload["глобальное_обновление"])

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"status": "ok", "state": sim_manager.получить_полное_состояние()}
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

# WebSocket вещатель
connected_websockets = set()

async def ws_handler(websocket):
    connected_websockets.add(websocket)
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if "уровень_модернизации" in data:
                    sim_manager.уровень_модернизации = float(data["уровень_модернизации"])
                if "кош_тепа_отбор_км3" in data:
                    sim_manager.кош_тепа_отбор_км3 = float(data["кош_тепа_отбор_км3"])
                if "засуха" in data:
                    sim_manager.засуха = bool(data["засуха"])
                if "маловодный_год" in data:
                    sim_manager.маловодный_год = bool(data["маловодный_год"])
                if "авария_утечка" in data:
                    sim_manager.авария_утечка = bool(data["авария_утечка"])
                # Отправляем подтверждение
                reply = sim_manager.получить_полное_состояние()
                await websocket.send(json.dumps(reply, ensure_ascii=False))
            except Exception as ex:
                pass
    except Exception:
        pass
    finally:
        connected_websockets.remove(websocket)

async def ws_broadcast_loop():
    import websockets
    while True:
        if connected_websockets:
            state = sim_manager.получить_полное_состояние()
            msg = json.dumps(state, ensure_ascii=False)
            to_remove = set()
            for ws in connected_websockets:
                try:
                    await ws.send(msg)
                except Exception:
                    to_remove.add(ws)
            for ws in to_remove:
                connected_websockets.discard(ws)
        await asyncio.sleep(0.5)

def start_http_server():
    server = ThreadingHTTPServer(('0.0.0.0', HTTP_PORT), CustomHTTPHandler)
    print(f"HTTP сервер запущен на http://localhost:{HTTP_PORT}")
    server.serve_forever()

async def main():
    import websockets
    # Запуск HTTP сервера в фоновом потоке
    t = threading.Thread(target=start_http_server, daemon=True)
    t.start()
    
    print(f"Запуск WebSocket сервера на ws://localhost:{WS_PORT}")
    ws_server = await websockets.serve(ws_handler, "0.0.0.0", WS_PORT)
    await asyncio.gather(ws_server.wait_closed(), ws_broadcast_loop())

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
