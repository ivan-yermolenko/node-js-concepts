/**
 * ============================================================================
 * ПРОТОКОЛ / БІБЛІОТЕКА: Socket.io (Понад WebSocket / HTTP Long-Polling)
 * ============================================================================
 * 
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Прикладний (Application Layer).
 * - Транспортний протокол: WebSocket як основний, але має автоматичний fallback 
 *   (повернення до альтернативи) у вигляді HTTP Long-Polling, якщо WebSocket заблокований проксі-сервером.
 * - Орієнтованість на події (Event-Driven): На відміну від сирого WebSocket, де передаються 
 *   лише текстові/бінарні кадри, Socket.io надає вбудовану абстракцію подій: 
 *   `socket.emit('eventName', data)`.
 * - Авто-перепідключення (Auto-reconnection): Якщо з'єднання розірвано, клієнт автоматично 
 *   намагатиметься перепідключитися з алгоритмом експоненціального бекоффу (exponential backoff).
 * - Кімнати та Простори імен (Rooms & Namespaces): Дозволяє легко групувати клієнтів (наприклад, 
 *   для чату в конкретній кімнаті) без написання складної логіки маршрутизації повідомлень вручну.
 * - Стан (State): Stateful. Зберігає стан сесії, сесійні ID та приналежність до кімнат.
 * 
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Складні real-time додатки, де важлива відмовостійкість і надійність з'єднання:
 *   - Багатокористувацькі ігри (де потрібні кімнати, швидкий обмін станом).
 *   - Корпоративні чати (групові кімнати, приватні канали).
 *   - Системи спільної роботи в реальному часі (whiteboards, редактори коду).
 *   - Системи миттєвих сповіщень на веб-ресурсах.
 * 
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Дуже прості WebSocket-сервери (наприклад, IoT-пристрої, що відправляють JSON): 
 *   Клієнтська бібліотека Socket.io є досить "важкою" (~100KB для браузера) і вимагає 
 *   використання спеціального протоколу Socket.io (тобто ви не можете підключитися 
 *   до Socket.io сервера за допомогою звичайного браузерного `new WebSocket()`).
 * - Високопродуктивні мікросервісні комунікації: Оверхед протоколу Socket.io занадто великий. 
 *   Краще gRPC або TCP.
 * 
 * РЕАЛІЗАЦІЯ:
 * - Використовує бібліотеку `socket.io` для сервера та `socket.io-client` для клієнта.
 * - Показує підключення, приєднання до кімнати (Room), обмін повідомленнями всередині кімнати 
 *   та відключення.
 */

const http = require('node:http');
const { Server } = require('socket.io');
const { io } = require('socket.io-client');

const PORT = 7000;
const HOST = '127.0.0.1';

// 1. СТВОРЕННЯ HTTP СЕРВЕРА
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.io сервер працює.');
});

// 2. СТВОРЕННЯ SOCKET.IO СЕРВЕРА
const ioServer = new Server(server, {
  cors: {
    origin: '*', // Дозволяємо підключення з будь-яких джерел
  }
});

ioServer.on('connection', (socket) => {
  console.log(`[SERVER] Клієнт під'єднався. ID: ${socket.id}`);

  // Обробка події приєднання до кімнати
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`[SERVER] Клієнт ${socket.id} приєднався до кімнати: "${roomName}"`);
    
    // Надсилаємо повідомлення всім у кімнаті, окрім відправника
    socket.to(roomName).emit('user_joined', { userId: socket.id });
    
    // Вітаємо самого відправника
    socket.emit('joined_successfully', `Ти у кімнаті ${roomName}`);
  });

  // Обробка події надсилання повідомлення в кімнату
  socket.on('send_message', (payload) => {
    const { room, message } = payload;
    console.log(`[SERVER] Повідомлення для кімнати "${room}": "${message}"`);
    
    // Транслюємо повідомлення ВСІМ у кімнаті (включаючи відправника)
    ioServer.to(room).emit('new_message', {
      sender: socket.id,
      message: message,
      time: new Date().toLocaleTimeString()
    });
  });

  // Обробка відключення клієнта
  socket.on('disconnect', () => {
    console.log(`[SERVER] Клієнт від'єднався. ID: ${socket.id}`);
  });
});

// Запуск сервера
server.listen(PORT, HOST, () => {
  console.log(`[SERVER] Socket.io сервер запущено на http://${HOST}:${PORT}`);
  
  // Запуск клієнта після запуску сервера
  runSocketIoClient();
});


// 3. РЕАЛІЗАЦІЯ SOCKET.IO КЛІЄНТА
function runSocketIoClient() {
  console.log('[CLIENT] Підключення до Socket.io сервера...');
  
  const socket = io(`http://${HOST}:${PORT}`);

  socket.on('connect', () => {
    console.log(`[CLIENT] Підключено з ID: ${socket.id}`);
    
    // Приєднуємось до кімнати "lobby"
    socket.emit('join_room', 'lobby');
  });

  socket.on('joined_successfully', (msg) => {
    console.log(`[CLIENT] Повідомлення від сервера: "${msg}"`);
    
    // Надсилаємо повідомлення в кімнату
    socket.emit('send_message', {
      room: 'lobby',
      message: 'Всім привіт у чаті!'
    });
  });

  socket.on('new_message', (data) => {
    console.log(`[CLIENT] Нове повідомлення в кімнаті від ${data.sender}: "${data.message}" (${data.time})`);
    
    // Отримали повідомлення — завершуємо демо
    console.log('[CLIENT] Повідомлення доставлено. Відключаємось...');
    socket.disconnect();
  });

  socket.on('disconnect', () => {
    console.log('[CLIENT] Відключено від сервера.');
    
    // Закриваємо сервер для завершення демонстрації
    console.log('[SYSTEM] Демонстрація Socket.io успішно завершена. Закриваємо сервер...');
    ioServer.close();
    server.close();
  });
}
