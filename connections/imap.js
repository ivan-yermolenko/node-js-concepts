/**
 * ============================================================================
 * ПРОТОКОЛ: IMAP (Internet Message Access Protocol)
 * ============================================================================
 * 
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Прикладний (Application Layer).
 * - Транспортний протокол: TCP (порт 143 - без шифрування/STARTTLS, 993 - SSL/TLS).
 * - Тип з'єднання: Клієнт-Сервер (Pull-протокол). Клієнт підключається до поштового 
 *   сервера та "стягує" заголовки чи тіла листів за запитом.
 * - Стан (State): Stateful (зберігає стан сесії). Дозволяє тримати постійне з'єднання 
 *   для відстеження нових листів у реальному часі за допомогою команди `IDLE`.
 * - Двостороння синхронізація: На відміну від застарілого POP3 (який просто завантажує 
 *   листи на один пристрій і зазвичай видаляє їх з сервера), IMAP зберігає всі листи 
 *   на сервері. Зміни (позначення як прочитане, видалення, переміщення в папки) 
 *   синхронізуються між усіма пристроями.
 * 
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Створення поштових клієнтів (веб, мобільних, десктопних).
 * - Автоматизація обробки вхідної пошти:
 *   - Системи підтримки (створення тікетів з листів клієнтів).
 *   - Парсинг інвойсів/рахунків, які надходять на пошту.
 *   - Роботи-автовідповідачі на вхідні повідомлення.
 * 
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Відправка електронних листів: Для відправки використовується виключно SMTP.
 * - Системи з обмеженими ресурсами (IoT) або дуже повільним інтернетом: IMAP є досить 
 *   складним та "балакучим" протоколом, що створює значне навантаження.
 * 
 * ЧОМУ РЕАЛІЗАЦІЯ САМЕ ТАКА:
 * - Для роботи з IMAP у Node.js використовується сучасна бібліотека `imapflow`. Вона є 
 *   новішою, простішою та повністю побудованою на Promise/async-await (на відміну від старішої `node-imap`).
 * - Код намагається підключитися до тестового сервера Ethereal (якщо доступний інтернет) або 
 *   виводить детальний шаблон конфігурації при виникненні помилки мережі.
 */

const { ImapFlow } = require('imapflow');

async function runImapDemo() {
  console.log('[IMAP] Ініціалізація IMAP клієнта...');

  // 1. СТВОРЕННЯ КОНФІГУРАЦІЇ КЛІЄНТА
  // Ми використовуємо публічний тестовий сервер Ethereal
  const client = new ImapFlow({
    host: 'imap.ethereal.email',
    port: 993,
    secure: true,
    auth: {
      user: 'test.user@ethereal.email', // Шаблонний акаунт для демонстрації конфігурації
      pass: 'password123'
    },
    logger: false // Вимикаємо детальний лог внутрішніх команд IMAP для чистоти виводу
  });

  // Додаємо обробник помилок для запобігання падінню процесу при збоях сокета
  client.on('error', (err) => {
    // Помилка зазвичай виникає при таймаутах, ми її ловимо тут
  });

  try {
    console.log('[IMAP] Спроба підключення до imap.ethereal.email...');
    // Підключення до сервера
    await client.connect();
    console.log('[IMAP] Підключено успішно!');

    // 2. ВИБІР ПОШТОВОЇ СКРИНЬКИ (INBOX)
    // lock() гарантує монопольний доступ до папки на час виконання операції
    let lock = await client.getMailboxLock('INBOX');
    try {
      console.log('[IMAP] Отримано доступ до INBOX. Отримання інформації...');
      console.log(`[IMAP] Всього листів: ${client.mailbox.exists}`);
      console.log(`[IMAP] Нових листів: ${client.mailbox.unseen}`);

      // 3. ОТРИМАННЯ ОСТАННЬОГО ЛИСТА
      if (client.mailbox.exists > 0) {
        console.log('[IMAP] Завантаження останнього повідомлення...');
        // Отримуємо останній лист за індексом
        const lastSequence = client.mailbox.exists;
        const message = await client.fetchOne(lastSequence, { envelope: true });
        
        console.log('[IMAP] Інформація про останній лист:');
        console.log(`- Від кого: ${message.envelope.from.map(f => f.address).join(', ')}`);
        console.log(`- Тема: ${message.envelope.subject}`);
        console.log(`- Дата: ${message.envelope.date}`);
      } else {
        console.log('[IMAP] Скринька порожня.');
      }
    } finally {
      // Обов'язково знімаємо блокування папки
      lock.release();
    }

    // Відключаємось від сервера
    console.log('[IMAP] Закриття з\'єднання...');
    await client.logout();

  } catch (error) {
    console.warn('\n[IMAP WARNING] Не вдалося завершити підключення (можливо, немає інтернету або невірні облікові дані).');
    console.warn(`Причина: ${error.message}`);
    console.log('\n[IMAP] Нижче наведено типову структуру для реальної інтеграції:');
    console.log(`
      const { ImapFlow } = require('imapflow');

      const client = new ImapFlow({
        host: 'imap.gmail.com', // або imap.mail.yahoo.com
        port: 993,
        secure: true,
        auth: {
          user: 'your-email@gmail.com',
          pass: 'your-app-specific-password' // Для Gmail потрібен пароль додатку (App Password)
        }
      });

      async function main() {
        await client.connect();
        
        // Відкриваємо INBOX в режимі "лише для читання"
        let mailbox = await client.selectMailbox('INBOX');
        console.log('Кількість листів:', mailbox.exists);
        
        // Пошук непрочитаних листів
        let messages = await client.search({ unseen: true });
        console.log('ID непрочитаних листів:', messages);
        
        await client.logout();
      }
    `);
  }
}

// Запуск демонстрації
runImapDemo();
