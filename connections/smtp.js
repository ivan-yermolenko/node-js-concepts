/**
 * ============================================================================
 * ПРОТОКОЛ: SMTP (Simple Mail Transfer Protocol)
 * ============================================================================
 * 
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Прикладний (Application Layer).
 * - Транспортний протокол: TCP (порти: 25 - без шифрування/релей, 465 - SSL/TLS, 587 - STARTTLS).
 * - Тип з'єднання: Клієнт-Сервер (Push-протокол). Клієнт підключається до сервера відправника 
 *   (SMTP-клієнт -> SMTP-сервер) для "проштовхування" повідомлення.
 * - Безпека: Сучасний SMTP використовує шифрування TLS (порт 465) або STARTTLS (команда оновлення 
 *   з'єднання з незашифрованого TCP до зашифрованого TLS на порту 587).
 * - Стан (State): Stateful. Командами обмінюються покроково (HELO/EHLO -> MAIL FROM -> RCPT TO -> DATA -> QUIT).
 * 
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Відправка електронних листів (email) з додатку (підтвердження реєстрації, розсилки, чеки).
 * - Передача повідомлень між поштовими серверами (наприклад, з Gmail на Outlook).
 * 
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Читання або отримання пошти: SMTP призначений ТІЛЬКИ для відправки. Для читання та 
 *   синхронізації поштової скриньки використовуються протоколи IMAP або POP3.
 * - Миттєвий обмін повідомленнями (чати): SMTP має значні затримки, оскільки листи проходять 
 *   через ланцюжок черг та перевірок (SPAM, DKIM, SPF).
 * 
 * ЧОМУ РЕАЛІЗАЦІЯ САМЕ ТАКА:
 * - Для відправки пошти в Node.js стандартною бібліотекою є `nodemailer`.
 * - Нижче наведено приклад коду, який намагається створити тестовий акаунт через Ethereal Email 
 *   (популярний сервіс для тестування пошти) та надіслати лист. Додано обробку помилок на випадок, 
 *   якщо запуск відбувається в офлайн-середовищі.
 */

const nodemailer = require('nodemailer');

async function runSmtpDemo() {
  console.log('[SMTP] Ініціалізація відправника пошти...');

  try {
    // 1. СТВОРЕННЯ ТЕСТОВОГО АКАУНТУ (для демонстрації без реальних облікових даних)
    // Ethereal.email — це безкоштовний SMTP-сервіс, де листи не надсилаються реальним отримувачам,
    // а просто перехоплюються для перевірки.
    console.log('[SMTP] Спроба отримати тестовий акаунт від Ethereal...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('[SMTP] Тестовий акаунт створено успішно.');

    // 2. НАЛАШТУВАННЯ ТРАНСПОРТУ (SMTP-КЛІЄНТА)
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure, // true для 465, false для інших портів (наприклад, 587)
      auth: {
        user: testAccount.user, // генерований користувач
        pass: testAccount.pass, // генерований пароль
      },
    });

    // 3. ПІДГОТОВКА ЛИСТА
    const mailOptions = {
      from: '"Node.js Network Course" <sender@example.com>',
      to: 'receiver@example.com',
      subject: 'Привіт! Тест протоколу SMTP',
      text: 'Цей лист надіслано з Node.js за допомогою SMTP та Nodemailer!',
      html: '<b>Цей лист надіслано з Node.js за допомогою SMTP та Nodemailer!</b>',
    };

    console.log('[SMTP] Надсилання листа...');
    const info = await transporter.sendMail(mailOptions);

    console.log('[SMTP] Лист успішно надіслано!');
    console.log('[SMTP] Message ID:', info.messageId);
    // Посилання на перегляд листа в Ethereal інбоксі
    console.log('[SMTP] Переглянути лист: %s', nodemailer.getTestMessageUrl(info));

  } catch (error) {
    console.warn('\n[SMTP WARNING] Не вдалося завершити повний цикл відправки.');
    console.warn(`Причина: ${error.message}`);
    console.log('\n[SMTP] Нижче наведено типову конфігурацію для реального SMTP сервера (наприклад, Gmail/SendGrid):');
    console.log(`
      const transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net', // або smtp.gmail.com
        port: 587,
        secure: false, // false означає використання STARTTLS
        auth: {
          user: 'YOUR_USERNAME',
          pass: 'YOUR_API_KEY_OR_PASSWORD'
        }
      });
    `);
  }
}

// Запуск демонстрації
runSmtpDemo();
