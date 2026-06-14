/**
 * ============================================================================
 * ПРОТОКОЛ: HTTP (Hypertext Transfer Protocol) / HTTPS (Secure)
 * ============================================================================
 * 
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Прикладний (Application Layer).
 * - Транспортний протокол: TCP (зазвичай порт 80 для HTTP, 443 для HTTPS).
 * - Стан (State): Без збереження стану (Stateless). Кожен запит обробляється незалежно.
 * - Тип взаємодії: Клієнт-Сервер (Request-Response). Тільки клієнт може ініціювати запит.
 * - Безпека: HTTPS додає шифрування TLS/SSL поверх TCP для захисту даних.
 * 
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Веб-сайти та веб-додатки (передача HTML, CSS, JS, зображень).
 * - REST API, GraphQL API, Webhook для інтеграції сервісів.
 * - Завантаження або відправка файлів (multipart/form-data).
 * - Публічні API, де потрібна максимальна сумісність із браузерами та іншими клієнтами.
 * 
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Реальний час з низькою затримкою (ігри, чати): HTTP-запит має великий оверхед (заголовки) 
 *   і вимагає постійного встановлення TCP-з'єднання ( handshake). Краще WebSocket.
 * - Потокова передача медіа або великих бінарних даних без підтверджень: Краще UDP або WebRTC.
 * - IoT пристрої з обмеженим трафіком і зарядом батареї: Заголовки HTTP занадто важкі. Краще MQTT або CoAP.
 * 
 * ЧОМУ РЕАЛІЗАЦІЯ САМЕ ТАКА:
 * - Використовує вбудований модуль `node:http`. Це показує низькорівневу роботу з потоками (streams),
 *   де запит (`req`) та відповідь (`res`) є Readable та Writable потоками відповідно.
 * - HTTPS реалізується через модуль `node:https` і вимагає сертифікатів (приватний ключ та сертифікат).
 *   Нижче показано, як запустити HTTP-сервер і зробити до нього запит клієнтом.
 */

const http = require('node:http');

const PORT = 13000;
const HOST = '127.0.0.1';

// 1. СТВОРЕННЯ HTTP СЕРВЕРА
const server = http.createServer((req, res) => {
  console.log(`[SERVER] Отримано запит: ${req.method} ${req.url}`);

  // Читання тіла запиту (якщо є)
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', () => {
    // Встановлюємо заголовки відповіді
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Powered-By': 'Node.js Native HTTP'
    });

    // Формуємо відповідь
    const responseData = {
      message: 'Привіт від HTTP сервера!',
      receivedData: body ? JSON.parse(body) : null,
      timestamp: new Date().toISOString()
    };

    res.end(JSON.stringify(responseData));
  });
});

// Запуск сервера
server.listen(PORT, HOST, () => {
  console.log(`[SERVER] HTTP Сервер запущено на http://${HOST}:${PORT}`);
  
  // Після запуску сервера запускаємо клієнтський запит
  runClientRequest();
});

// 2. РЕАЛІЗАЦІЯ HTTP КЛІЄНТА
function runClientRequest() {
  console.log('[CLIENT] Надсилання POST запиту до сервера...');

  const postData = JSON.stringify({
    course: 'Node.js Practice',
    topic: 'Network Connections'
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/api/data',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`[CLIENT] Отримано статус відповіді: ${res.statusCode}`);
    console.log(`[CLIENT] Заголовки відповіді:`, res.headers);

    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      console.log('[CLIENT] Тіло відповіді:');
      console.log(JSON.parse(rawData));
      
      // Закриваємо сервер, щоб завершити процес після успішного демо
      console.log('[SYSTEM] Демонстрація HTTP успішно завершена. Закриваємо сервер...');
      server.close();
    });
  });

  req.on('error', (e) => {
    console.error(`[CLIENT] Помилка запиту: ${e.message}`);
    server.close();
  });

  // Записуємо тіло запиту та завершуємо його надсилання
  req.write(postData);
  req.end();
}

/**
 * ПРИМІТКА ЩОДО HTTPS:
 * Для створення HTTPS сервера замість http використовується https:
 * 
 * const https = require('node:https');
 * const fs = require('node:fs');
 * 
 * const options = {
 *   key: fs.readFileSync('path/to/private-key.pem'),
 *   cert: fs.readFileSync('path/to/certificate.pem')
 * };
 * 
 * https.createServer(options, (req, res) => { ... }).listen(443);
 */
