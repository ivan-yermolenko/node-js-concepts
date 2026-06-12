/**
 * ============================================================================
 * КОНСПЕКТ-ПРАКТИКУМ: БАЗОВІ КОНСОЛЬНІ ЗАСТОСУНКИ (CLI) НА Node.js
 * ============================================================================
 *
 * Цей файл є одночасно теоретичним конспектом та інтерактивним інструментом.
 * Ви можете читати коментарі як конспект, а також запускати файл у терміналі:
 *
 *   Запуск інтерактивного меню:
 *     node cli-apps-conspect.js
 *
 *   Запуск парсингу аргументів (Тема 3):
 *     node cli-apps-conspect.js --port 8080 -v build
 *
 * ============================================================================
 */

const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const { parseArgs } = require('util');

/**
 * ----------------------------------------------------------------------------
 * ТЕМА 1: Введення. Отримання даних через process.stdin та readline
 * ----------------------------------------------------------------------------
 * - process.stdin — це потік читання (Readable Stream), який отримує дані
 *   від клавіатури або іншого процесу через конвеєр (pipe).
 * - За замовчуванням він "призупинений" (paused). Щоб зчитувати дані напряму,
 *   потрібно підписатися на подію 'data' або увімкнути режим читання (resume()).
 * - Дані надходять у вигляді Buffer (масиву байтів), тому для роботи з текстом
 *   потрібно встановити кодування `setEncoding('utf-8')` або декодувати вручну.
 * - Вбудований модуль `readline/promises` надає високорівневий інтерфейс
 *   для створення інтерактивних CLI через проміси (async/await) та метод rl.question().
 */
async function demoTakingInput() {
  console.log('\n=== ДЕМОНСТРАЦІЯ: Отримання введення через readline/promises ===');

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const name = await rl.question('👉 Як вас звати? ');
    const ageRaw = await rl.question('👉 Скільки вам років? ');
    const age = parseInt(ageRaw, 10);

    if (isNaN(age)) {
      console.log(`⚠️ Вік має бути числом! Введене значення: "${ageRaw}"`);
    } else {
      console.log(`🎉 Привіт, ${name}! Через 5 років вам буде ${age + 5}.`);
    }
  } finally {
    // ВАЖЛИВО: Обов'язково закривати readline інтерфейс, інакше процес не завершиться,
    // оскільки Event Loop триматиме відкритим потік stdin.
    rl.close();
  }
}

/**
 * ----------------------------------------------------------------------------
 * ТЕМА 2: Виведення. stdout / stderr та різниця з console.log
 * ----------------------------------------------------------------------------
 * - process.stdout — стандартний потік виведення (Writable Stream) для результатів.
 * - process.stderr — стандартний потік помилок (Writable Stream) для логів/діагностики.
 * - console.log(...) — це обгортка над process.stdout.write().
 *   Відмінності console.log від write:
 *     1. console.log автоматично додає новий рядок \n в кінець.
 *     2. console.log автоматично форматує об'єкти (викликає util.format).
 *     3. write приймає тільки рядки (string) або буфери (Buffer).
 * - Використання stderr дозволяє відокремити потік помилок від корисних даних.
 *   Наприклад, у Linux: `node script.js > results.txt` запише в файл лише stdout,
 *   а помилки з stderr виведуться в термінал.
 */
function demoOutputStreams() {
  console.log('\n=== ДЕМОНСТРАЦІЯ: Робота з stdout та stderr ===');

  // 1. Демонстрація process.stdout.write без перенесення рядка
  process.stdout.write('Запис у stdout: [');
  for (let i = 1; i <= 5; i++) {
    process.stdout.write(`${i}`);
    if (i < 5) process.stdout.write(', ');
  }
  process.stdout.write(']\n'); // додаємо \n вручну

  // 2. Демонстрація stderr
  console.log('Це звичайне повідомлення (stdout)');
  process.stderr.write('🔴 А це повідомлення про помилку у stderr!\n');

  console.log('\n💡 Спробуйте запустити цей скрипт так, щоб зберегти лише stdout у файл:');
  console.log('   node cli-apps-conspect.js --demo-output > output.log');
}

/**
 * ----------------------------------------------------------------------------
 * ТЕМА 3: Аргументи. Обробка прапорців командного рядка (process.argv)
 * ----------------------------------------------------------------------------
 * - process.argv — масив, який містить аргументи запуску:
 *     argv[0]: Шлях до виконуваного файлу node.
 *     argv[1]: Шлях до файлу скрипта, який виконується.
 *     argv[2] і далі: Аргументи, які передав користувач.
 * - Для отримання чисто користувацьких аргументів роблять `process.argv.slice(2)`.
 * - Для складного парсингу (прапорці, опції, значення) у Node.js 18.3+ вбудовано
 *   метод `util.parseArgs()`, який позбавляє необхідності ставити yargs чи commander.
 */
function demoArgvParsing() {
  console.log('\n=== ДЕМОНСТРАЦІЯ: Обробка аргументів (process.argv) ===');

  console.log('Вміст process.argv повністю:');
  process.argv.forEach((val, index) => {
    console.log(`  argv[${index}]: ${val}`);
  });

  const rawArgs = process.argv.slice(2);
  console.log('\nКористувацькі аргументи (argv.slice(2)):', rawArgs);

  // Використання вбудованого util.parseArgs
  console.log('\nПарсинг за допомогою util.parseArgs:');
  const options = {
    port: { type: 'string', short: 'p', default: '3000' },
    verbose: { type: 'boolean', short: 'v', default: false }
  };

  try {
    const { values, positionals } = parseArgs({
      args: rawArgs, // якщо не передати, за замовчуванням береться process.argv.slice(2)
      options,
      allowPositionals: true
    });
    console.log('  Парсовані значення (values):', values);
    console.log('  Позиційні аргументи (positionals):', positionals);
  } catch (err) {
    console.log('  ❌ Помилка парсингу:', err.message);
  }
}

/**
 * ----------------------------------------------------------------------------
 * ТЕМА 4: Контроль. Завершення роботи програми та коди виходу (Exit Codes)
 * ----------------------------------------------------------------------------
 * - Процес завершується автоматично, коли Event Loop порожній.
 * - process.exit(code) — негайно перериває виконання процесу.
 *   - code = 0: успішне завершення.
 *   - code > 0: завершення з помилкою (наприклад, 1).
 *   ⚠️ УВАГА: process.exit() є руйнівним. Він може не дати записатися активним
 *     потокам виведення або завершити асинхронні операції.
 * - process.exitCode = code — безпечніша альтернатива. Вона задає код повернення,
 *   але дозволяє черзі подій (Event Loop) завершити роботу природним шляхом.
 */
function demoExitCodes() {
  console.log('\n=== ДЕМОНСТРАЦІЯ: Робота з кодами виходу ===');
  console.log('Встановлюємо process.exitCode = 42...');

  process.exitCode = 42;

  console.log('Програма вийде автоматично з кодом 42, коли Event Loop завершиться.');
  console.log('Спробуйте запустити у терміналі:');
  console.log('   node cli-apps-conspect.js --demo-exit');
  console.log('   echo $? # (виведе 42 в Unix / macOS)');
}

/**
 * ============================================================================
 * МЕНЮ КЕРУВАННЯ ТА ЛОГІКА ЗАПУСКУ
 * ============================================================================
 */
async function showMenu() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.clear();
  console.log('======================================================');
  console.log('   ІНТЕРАКТИВНИЙ КОНСПЕКТ: CLI ЗАСТОСУНКИ НА NODE.JS');
  console.log('======================================================');
  console.log('1. Тема 1: Отримання введення від користувача (process.stdin)');
  console.log('2. Тема 2: Виведення результатів та потоки stdout/stderr');
  console.log('3. Тема 3: Обробка аргументів командного рядка (process.argv)');
  console.log('4. Тема 4: Завершення програми та коди виходу (Exit Codes)');
  console.log('0. Вихід');
  console.log('------------------------------------------------------');

  try {
    const choice = await rl.question('👉 Оберіть тему для демонстрації (0-4): ');
    rl.close(); // закриваємо інтерфейс перед запуском демо, щоб не було конфліктів потоку

    switch (choice.trim()) {
      case '1':
        await demoTakingInput();
        break;
      case '2':
        demoOutputStreams();
        break;
      case '3':
        demoArgvParsing();
        break;
      case '4':
        demoExitCodes();
        break;
      case '0':
        console.log('Бувай!');
        process.exit(0);
      default:
        console.log('Невірний вибір. Спробуйте ще раз.');
    }
  } catch (err) {
    console.error('Помилка в меню:', err);
    rl.close();
  }

  // Чекаємо перед виходом, щоб користувач встиг прочитати результат
  console.log('\n------------------------------------------------------');
  console.log('Натисніть Enter, щоб повернутися в меню...');

  const rlWait = readline.createInterface({ input: stdin, output: stdout });
  await rlWait.question('');
  rlWait.close();
  showMenu();
}

// Аналізуємо аргументи запуску
const args = process.argv.slice(2);

if (args.includes('--demo-output')) {
  demoOutputStreams();
} else if (args.includes('--demo-exit')) {
  demoExitCodes();
} else if (args.length > 0) {
  // Якщо скрипт запущено з аргументами, одразу показуємо парсинг аргументів
  demoArgvParsing();
} else {
  // Запуск інтерактивного меню
  showMenu();
}
