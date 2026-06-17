/**
 * ============================================================================
 * ПРОТОКОЛ: Raw WebSockets (ws)
 * ============================================================================
 * 
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Прикладний (Application Layer).
 * - Транспортний протокол: TCP (зазвичай порт 80 або 443).
 * - Встановлення з'єднання (Handshake): Починається з HTTP-запиту з заголовками Upgrade 
 *   (Connection: Upgrade, Upgrade: websocket). Після успішного рукостискання з'єднання 
 *   "оновлюється" до WebSocket.
 * - Двосторонній та повнодуплексний (Full-Duplex): І клієнт, і сервер можуть надсилати дані 
 *   одночасно у будь-який момент часу через одне постійне TCP-з'єднання.
 * - Економність (Low overhead): Повідомлення передаються у вигляді кадрів (frames) з дуже малим 
 *   заголовком (від 2 до 14 байт), що набагато менше за заголовки HTTP (які можуть бути сотнями байт).
 * - Стан (State): З'єднання є постійно відкритим і зберігає стан сесії (Stateful).
 * 
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Інтерактивні додатки реального часу:
 *   - Чати та системи обміну миттєвими повідомленнями.
 *   - Спільна робота над документами (Figma, Google Docs).
 *   - Фінансові тікери та котирування акцій/криптовалют.
 *   - Прості онлайн-ігри.
 *   - Панелі моніторингу (Dashboards) з живими даними.
 * 
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Прості REST API, де клієнту потрібні статичні дані час від часу: Утримання мільйонів активних 
 *   WebSocket-з'єднань навантажує оперативну пам'ять сервера (кожен сокет потребує ресурсів).
 * - Для передачі дуже великих медіа-файлів (відео, аудіо): Краще використовувати стандартний 
 *   HTTP потоковий (chunked) трансфер або CDN, які краще кешуються.
 * - Додатки, де потрібна повна робота в офлайні або рідкісні оновлення: Мобільні пристрої 
 *   швидше розряджаються, якщо тримають постійний сокет. Краще Push Notifications.
 * 
 * РІЗНИЦЯ МІЖ RAW WEBSOCKET (ws) ТА SOCKET.IO:
 * - `ws` є низькорівневою, легкою і швидкою реалізацією стандарту RFC 6455.
 * - Вона не має автоматичного перепідключення, кімнат (rooms), масштабування через Redis 
 *   або fallback до HTTP Long-Polling (якщо WebSocket заблокований проксі-сервером).
 * - Цей файл демонструє чистий (raw) WebSocket.
 */

const { WebSocketServer, WebSocket } = require('ws');
const http = require('node:http');

const PORT = 6000;
const HOST = '127.0.0.1';

// 1. СТВОРЕННЯ HTTP СЕРВЕРА (для WebSocket Handshake)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Це HTTP сервер. WebSocket очікує підключення на ws://' + HOST + ':' + PORT);
});

// 2. ІНІЦІАЛІЗАЦІЯ WEBSOCKET СЕРВЕРА
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[SERVER] Нове WebSocket підключення з IP: ${ip}`);

  // Відправка вітального повідомлення клієнту
  ws.send(JSON.stringify({ event: 'welcome', data: 'Привіт! З\'єднання встановлено.' }));

  // Обробка вхідних повідомлень від клієнта
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      console.log(`[SERVER] Отримано подію "${parsed.event}":`, parsed.data);

      if (parsed.event === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', data: 'Хороша робота!' }));
      }
    } catch (err) {
      console.log(`[SERVER] Отримано сирі дані (не JSON): ${message}`);
      ws.send(`ECHO: ${message}`);
    }
  });

  // Обробка закриття з'єднання
  ws.on('close', () => {
    console.log('[SERVER] Клієнт закрив WebSocket з\'єднання.');
  });

  ws.on('error', (err) => {
    console.error(`[SERVER] Помилка сокета: ${err.message}`);
  });
});

// Запуск HTTP + WS сервера
server.listen(PORT, HOST, () => {
  console.log(`[SERVER] WebSocket сервер запущено на ws://${HOST}:${PORT}`);
  
  // Запускаємо клієнт після успішного запуску сервера
  runRawWebSocketClient();
});


// 3. РЕАЛІЗАЦІЯ WEBSOCKET КЛІЄНТА
function runRawWebSocketClient() {
  console.log('[CLIENT] Підключення до WebSocket сервера...');
  
  const ws = new WebSocket(`ws://${HOST}:${PORT}`);

  ws.on('open', () => {
    console.log('[CLIENT] З\'єднання відкрито!');
    
    // Надсилаємо JSON повідомлення
    ws.send(JSON.stringify({ event: 'ping', data: 'Перевірка зв\'язку' }));
  });

  ws.on('message', (data) => {
    const parsed = JSON.parse(data.toString());
    console.log(`[CLIENT] Отримано подію від сервера "${parsed.event}":`, parsed.data);

    if (parsed.event === 'pong') {
      console.log('[CLIENT] Отримано відповідь на ping. Закриваємо з\'єднання...');
      ws.close();
    }
  });

  ws.on('close', () => {
    console.log('[CLIENT] З\'єднання закрито.');
    
    // Закриваємо сервер для завершення демонстрації
    console.log('[SYSTEM] Демонстрація Raw WebSocket успішно завершена. Закриваємо сервер...');
    wss.close(() => {
      server.close();
    });
  });

  ws.on('error', (err) => {
    console.error(`[CLIENT] Помилка: ${err.message}`);
    server.close();
  });
}
