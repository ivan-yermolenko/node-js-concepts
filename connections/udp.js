/**
 * ============================================================================
 * ПРОТОКОЛ: UDP (User Datagram Protocol)
 * ============================================================================
 *
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Транспортний (Transport Layer).
 * - Без встановлення з'єднання (Connectionless): Не потребує handshake. Відправник просто
 *   надсилає пакети на IP/порт одержувача.
 * - Ненадійний (Unreliable): Не гарантує доставку пакетів, порядок їх отримання чи дублювання.
 *   Немає контролю потоку та перевантаження. Якщо пакет втрачено, він втрачений назавжди
 *   (якщо не реалізовано логіку перевідправки на прикладному рівні).
 * - Орієнтований на повідомлення (Datagram-oriented): Дані надсилаються у вигляді окремих
 *   пакетів (датаграм). Кожна датаграма має фіксований розмір (зазвичай ліміт до 65,507 байт,
 *   але на практиці бажано утримувати її в межах MTU ~1500 байт для уникнення фрагментації IP).
 * - Швидкість (Low latency): Оскільки немає оверхеду на підтримку стану, черг та підтверджень,
 *   цей протокол є найшвидшим з усіх транспортних протоколів.
 *
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Передача в реальному часі, де актуальність даних важливіша за 100% доставку:
 *   - Онлайн-ігри (координати гравців).
 *   - IP-телефонія (VoIP), відеодзвінки, стрімінг (Zoom, Discord тощо).
 *   - Потокове аудіо та відео.
 * - Прості запити/відповіді з мінімальним трафіком:
 *   - DNS (Domain Name System) запити.
 *   - DHCP (Dynamic Host Configuration Protocol).
 *   - NTP (Network Time Protocol).
 * - IoT пристрої, що збирають метрики (наприклад, датчик температури відправляє телеметрію раз на хвилину).
 *
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Передача критично важливих даних (файли, тексти повідомлень, транзакції), де втрата
 *   навіть 1 байта призведе до помилки (HTTP, FTP, бази даних, SSH, SMTP).
 * - Коли розмір повідомлення занадто великий і вимагає фрагментації.
 *
 * ЧОМУ РЕАЛІЗАЦІЯ САМЕ ТАКА:
 * - Використовує вбудований модуль `node:dgram`, який надає API для роботи з UDP-сокетами (`dgram.createSocket`).
 * - Створюються два сокети: "Сервер" (слухає порт) та "Клієнт" (відправляє на цей порт).
 */

const dgram = require('node:dgram');

const PORT = 5000;
const HOST = '127.0.0.1';

// 1. СТВОРЕННЯ UDP СЕРВЕРА (ОДЕРЖУВАЧА)
const server = dgram.createSocket('udp4'); // udp4 означає використання IPv4

server.on('listening', () => {
  const address = server.address();
  console.log(`[SERVER] UDP Сервер слухає на ${address.address}:${address.port}`);

  // Запускаємо клієнта після запуску сервера
  runUdpClient();
});

server.on('message', (msg, rinfo) => {
  console.log(`[SERVER] Отримано повідомлення від ${rinfo.address}:${rinfo.port}: "${msg.toString()}"`);

  // Відправляємо відповідь назад відправнику
  const response = Buffer.from(`ACK: ${msg.toString()}`);
  server.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
    if (err) {
      console.error(`[SERVER] Помилка надсилання відповіді: ${err.message}`);
    } else {
      console.log(`[SERVER] Надіслано підтвердження клієнту.`);
    }
  });
});

server.on('error', (err) => {
  console.error(`[SERVER] Помилка: ${err.stack}`);
  server.close();
});

// Зв'язуємо сервер з портом
server.bind(PORT, HOST);


// 2. РЕАЛІЗАЦІЯ UDP КЛІЄНТА (ВІДПРАВНИКА)
function runUdpClient() {
  console.log('[CLIENT] Створення клієнтського UDP сокета...');
  const client = dgram.createSocket('udp4');

  // Клієнт також може слухати відповіді
  client.on('message', (msg, rinfo) => {
    console.log(`[CLIENT] Отримано відповідь від сервера ${rinfo.address}:${rinfo.port}: "${msg.toString()}"`);

    // Закриваємо обидва сокети після успішного обміну
    console.log('[SYSTEM] Демонстрація UDP успішно завершена. Закриваємо сокети...');
    client.close();
    server.close();
  });

  client.on('error', (err) => {
    console.error(`[CLIENT] Помилка: ${err.message}`);
    client.close();
    server.close();
  });

  const message = Buffer.from('Привіт, UDP сервер!');
  console.log(`[CLIENT] Надсилання датаграми до ${HOST}:${PORT}...`);

  // Відправка повідомлення на сервер
  client.send(message, 0, message.length, PORT, HOST, (err) => {
    if (err) {
      console.error(`[CLIENT] Помилка при надсиланні: ${err.message}`);
      client.close();
      server.close();
    } else {
      console.log('[CLIENT] Датаграму успішно надіслано в мережу.');
    }
  });
}

console.log('Buffer: ', Buffer.from('123'))
