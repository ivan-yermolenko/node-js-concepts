/**
 * ============================================================================
 * ПРОТОКОЛ: TCP (Transmission Control Protocol)
 * ============================================================================
 * 
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Транспортний (Transport Layer).
 * - Орієнтований на з'єднання (Connection-Oriented): Перед відправкою даних встановлюється 
 *   зв'язок між клієнтом і сервером за допомогою 3-way handshake (SYN, SYN-ACK, ACK).
 * - Надійність (Reliability): Гарантує доставку пакетів у правильному порядку. Втрачені пакети 
 *   перевідправляються автоматично. Контролює потік даних (Flow control) та перевантаження.
 * - Потік байтів (Byte Stream): Дані передаються як безперервний потік байтів без чітких меж 
 *   повідомлень (потрібно реалізовувати протокол розділення повідомлень самостійно, наприклад, 
 *   символ нового рядка '\n' або вказувати довжину перед даними).
 * - Стан (State): Зберігає стан з'єднання протягом усього часу сесії.
 * 
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Коли критично важлива точність та повна доставка даних:
 *   - Бази даних (PostgreSQL, MySQL, Redis тощо).
 *   - Передача файлів (FTP, SFTP).
 *   - Електронна пошта (SMTP, IMAP).
 *   - Веб-трафік (HTTP/1.1 та HTTP/2 працюють поверх TCP).
 *   - Віддалене керування (SSH, Telnet).
 * 
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Реальний час з критично низькою затримкою та готовністю до втрати пакетів (ігри, аудіо/відео):
 *   TCP буде чекати на перевідправку втраченого пакету (Head-of-Line Blocking), що викличе затримки (лаги).
 *   Для цього краще UDP або WebRTC (SCTP/SRTP).
 * - Дуже прості запити типу "запит-відповідь" від тисяч IoT пристроїв: Встановлення з'єднання (handshake)
 *   та підтримка сесії споживає занадто багато пам'яті та трафіку. Краще UDP / MQTT.
 * 
 * ЧОМУ РЕАЛІЗАЦІЯ САМЕ ТАКА:
 * - Використовує вбудований модуль `node:net` — це основа для створення TCP-серверів (`net.createServer`) 
 *   та клієнтів (`net.createConnection`).
 * - Оскільки TCP є потоковим, ми використовуємо символ нового рядка `\n` як маркер закінчення повідомлення (Framing).
 */

const net = require('node:net');

const PORT = 4000;
const HOST = '127.0.0.1';

// 1. СТВОРЕННЯ TCP СЕРВЕРА
const server = net.createServer((socket) => {
  console.log(`[SERVER] Клієнт під'єднався: ${socket.remoteAddress}:${socket.remotePort}`);

  // Обробка вхідних даних від клієнта
  socket.on('data', (data) => {
    const message = data.toString().trim();
    console.log(`[SERVER] Отримано дані: "${message}"`);

    // Відправляємо відповідь клієнту
    // Оскільки це TCP, ми додаємо '\n', щоб клієнт міг зрозуміти межу повідомлення
    if (message === 'PING') {
      socket.write('PONG\n');
    } else {
      socket.write(`ECHO: ${message}\n`);
    }
  });

  // Обробка від'єднання клієнта
  socket.on('end', () => {
    console.log('[SERVER] Клієнт від\'єднався');
  });

  socket.on('error', (err) => {
    console.error(`[SERVER] Помилка сокета: ${err.message}`);
  });
});

// Запуск сервера
server.listen(PORT, HOST, () => {
  console.log(`[SERVER] TCP Сервер слухає порт ${PORT} на ${HOST}`);
  
  // Запускаємо клієнт після успішного запуску сервера
  runTcpClient();
});

// 2. РЕАЛІЗАЦІЯ TCP КЛІЄНТА
function runTcpClient() {
  console.log('[CLIENT] Підключення до TCP сервера...');

  const client = net.createConnection({ port: PORT, host: HOST }, () => {
    console.log('[CLIENT] Підключено до сервера!');
    
    // Надсилаємо перше повідомлення
    client.write('PING\n');
  });

  let buffer = '';
  // Обробка отриманих даних від сервера
  client.on('data', (data) => {
    buffer += data.toString();
    
    // Оскільки TCP потоковий, збираємо буфер і розбиваємо по символу нового рядка (\n)
    let boundary = buffer.indexOf('\n');
    while (boundary !== -1) {
      const message = buffer.substring(0, boundary);
      buffer = buffer.substring(boundary + 1);
      
      console.log(`[CLIENT] Отримано відповідь: "${message}"`);
      
      if (message === 'PONG') {
        console.log('[CLIENT] Отримано PONG. Надсилаємо наступні дані...');
        client.write('Привіт, TCP сервер!\n');
      } else if (message.startsWith('ECHO:')) {
        console.log('[CLIENT] Отримано відлуння. Закриваємо з\'єднання...');
        client.end(); // Ініціюємо відключення
      }
      
      boundary = buffer.indexOf('\n');
    }
  });

  client.on('end', () => {
    console.log('[CLIENT] Відключено від сервера.');
    
    // Закриваємо сервер для завершення демонстрації
    console.log('[SYSTEM] Демонстрація TCP успішно завершена. Закриваємо сервер...');
    server.close();
  });

  client.on('error', (err) => {
    console.error(`[CLIENT] Помилка: ${err.message}`);
    server.close();
  });
}
