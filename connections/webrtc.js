/**
 * ============================================================================
 * ПРОТОКОЛ: WebRTC (Web Real-Time Communication)
 * ============================================================================
 * 
 * ОСОБЛИВОСТІ:
 * - Рівень моделі OSI: Гібридний. Використовує протоколи SRTP (для аудіо/відео), 
 *   SCTP (для Data Channel), які працюють поверх UDP/TCP (транспортний рівень).
 * - Peer-to-Peer (P2P): Пряма передача даних між браузерами/пристроями без проходження 
 *   через центральний сервер (що зменшує затримки та навантаження на сервери).
 * - Обхід NAT (STUN/TURN): Більшість пристроїв знаходяться за брандмауерами або NAT 
 *   і не мають публічної IP-адреси.
 *   - STUN (Session Traversal Utilities for NAT): Допомагає клієнту дізнатися свою публічну IP та порт.
 *   - TURN (Traversal Using Relays around NAT): Якщо пряме P2P з'єднання заблоковане, TURN 
 *     виступає як релей-сервер, через який проганяється трафік (це крайній випадок).
 * - Сигналізація (Signaling): WebRTC не має вбудованого механізму для виявлення пірів. 
 *   Тому потрібен сигналізаційний сервер (зазвичай WebSocket чи HTTP), щоб піри обмінялися:
 *   - SDP (Session Description Protocol) - конфігурація кодеків, роздільної здатності, медіа-треків.
 *   - ICE (Interactive Connectivity Establishment) Candidates - списки можливих мережевих адрес для з'єднання.
 * 
 * ДЕ ВИКОРИСТОВУВАТИ:
 * - Стрімінг медіа з низькою затримкою (менше секунди):
 *   - Відеодзвінки (Google Meet, Zoom у браузері, Webex).
 *   - Трансляції в реальному часі (кіберспорт, аукціони).
 * - Швидка пряма передача файлів між пристроями (наприклад, ShareDrop, Snapdrop).
 * - Децентралізовані P2P мережі (наприклад, WebTorrent).
 * 
 * ДЕ НЕ ВИКОРИСТОВУВАТИ:
 * - Трансляція відео на мільйони глядачів одночасно (один-до-багатьох): Кожен новий пір створює 
 *   додаткове P2P з'єднання, що перевантажує процесор та мережу стрімера. Для цього краще HLS або DASH.
 * - Прості клієнт-серверні запити (REST API, бази даних): Занадто складний процес встановлення зв'язку.
 * 
 * РОЛЬ NODE.JS У WebRTC:
 * - Node.js частіше за все грає роль **Сигналізаційного Сервера** (через WebSockets), який просто 
 *   пересилає SDP та ICE повідомлення від одного клієнта до іншого.
 * - Також на Node.js пишуть медіа-сервери (SFU/MCU) для мікшування відеопотоків (наприклад, mediasoup, licode).
 * 
 * РЕАЛІЗАЦІЯ:
 * - Код нижче реалізує сигналізаційний сервер на WebSocket (`ws`), який координує обмін повідомленнями 
 *   між Peer A та Peer B для встановлення WebRTC-з'єднання.
 */

const { WebSocketServer } = require('ws');
const http = require('node:http');

const PORT = 8000;
const HOST = '127.0.0.1';

// 1. СТВОРЕННЯ HTTP СЕРВЕРА
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebRTC Signaling Server is running.');
});

// 2. СТВОРЕННЯ WEBSOCKET СИГНАЛІЗАЦІЙНОГО СЕРВЕРА
const wss = new WebSocketServer({ server });

// Зберігаємо підключених пірів за їхніми ідентифікаторами
const peers = new Map();

wss.on('connection', (ws) => {
  let peerId = null;

  ws.on('message', (message) => {
    try {
      const packet = JSON.parse(message.toString());
      const { type, target, sender, data } = packet;

      console.log(`[SIGNALING] Отримано пакет типу: "${type}" від "${sender}" до "${target || 'усіх'}"`);

      switch (type) {
        // Реєстрація піра на сервері
        case 'register':
          peerId = sender;
          peers.set(peerId, ws);
          console.log(`[SIGNALING] Зареєстровано пір: ${peerId}`);
          ws.send(JSON.stringify({ type: 'registered', status: 'success' }));
          break;

        // Пересилання SDP Offer, SDP Answer або ICE Candidate конкретному піру
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          if (target && peers.has(target)) {
            const targetWs = peers.get(target);
            targetWs.send(JSON.stringify({
              type,
              sender,
              data
            }));
            console.log(`[SIGNALING] Переслано ${type} від ${sender} до ${target}`);
          } else {
            console.warn(`[SIGNALING WARNING] Цільовий пір "${target}" не знайдений для типу "${type}"`);
          }
          break;

        default:
          console.warn(`[SIGNALING] Невідомий тип повідомлення: ${type}`);
      }
    } catch (err) {
      console.error('[SIGNALING ERROR] Не вдалося розпарсити повідомлення:', err.message);
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      console.log(`[SIGNALING] Пір ${peerId} відключився.`);
    }
  });
});

// Запуск сигналізаційного сервера
server.listen(PORT, HOST, () => {
  console.log(`[SERVER] WebRTC сигналізаційний сервер запущено на ws://${HOST}:${PORT}`);
  console.log('\n--- СХЕМА ВСТАНОВЛЕННЯ З\'ЄДНАННЯ WEBRTC ---');
  console.log(`
  1. Peer A реєструється на Signaling Server -> { type: 'register', sender: 'PeerA' }
  2. Peer B реєструється на Signaling Server -> { type: 'register', sender: 'PeerB' }
  3. Peer A створює SDP Offer (опис медіа) та надсилає через сервер до Peer B:
     Peer A -> [Offer] -> Signaling Server -> [Offer] -> Peer B
  4. Peer B отримує Offer, створює SDP Answer та надсилає через сервер до Peer A:
     Peer B -> [Answer] -> Signaling Server -> [Answer] -> Peer A
  5. Паралельно обидва піри отримують локальні ICE Candidates (адреси мережі) від STUN-сервера 
     та пересилають їх один одному:
     Peer A -> [ICE Candidates] -> Signaling Server -> Peer B
     Peer B -> [ICE Candidates] -> Signaling Server -> Peer A
  6. Як тільки піри отримали SDP та знайшли сумісний мережевий шлях (ICE Candidate), 
     вони встановлюють пряме P2P з'єднання. Сигналізаційний сервер більше не бере участі!
  `);
  
  // Запускаємо тестовий пробіг сигналізації для демонстрації
  runSignalingTest();
});


// 3. ТЕСТ СИГНАЛІЗАЦІЇ (Симуляція поведінки Peer A та Peer B)
function runSignalingTest() {
  console.log('[SYSTEM] Запуск симуляції обміну сигналізацією...');

  const WebSocket = require('ws');
  
  // Створюємо клієнт Peer A
  const peerA = new WebSocket(`ws://${HOST}:${PORT}`);
  // Створюємо клієнт Peer B
  const peerB = new WebSocket(`ws://${HOST}:${PORT}`);

  peerA.on('open', () => {
    peerA.send(JSON.stringify({ type: 'register', sender: 'PeerA' }));
  });

  peerB.on('open', () => {
    peerB.send(JSON.stringify({ type: 'register', sender: 'PeerB' }));
  });

  peerA.on('message', (message) => {
    const packet = JSON.parse(message.toString());
    
    if (packet.type === 'registered') {
      console.log('[Peer A] Зареєстровано. Створення та відправка Offer...');
      // Імітуємо SDP Offer
      peerA.send(JSON.stringify({
        type: 'offer',
        sender: 'PeerA',
        target: 'PeerB',
        data: { sdp: 'v=0\\no=- 123456789 IN IP4 127.0.0.1\\ns=TestSession\\n...' }
      }));
    }

    if (packet.type === 'answer') {
      console.log('[Peer A] Отримано Answer від Peer B! Імітуємо обмін ICE candidates...');
      // Імітуємо надсилання ICE candidate
      peerA.send(JSON.stringify({
        type: 'ice-candidate',
        sender: 'PeerA',
        target: 'PeerB',
        data: { candidate: 'candidate:842163049 1 udp 16777215 127.0.0.1 50001 typ srflx raddr 192.168.1.10...' }
      }));
    }
  });

  peerB.on('message', (message) => {
    const packet = JSON.parse(message.toString());

    if (packet.type === 'offer') {
      console.log('[Peer B] Отримано Offer від Peer A! Створення та відправка Answer...');
      // Імітуємо SDP Answer
      peerB.send(JSON.stringify({
        type: 'answer',
        sender: 'PeerB',
        target: 'PeerA',
        data: { sdp: 'v=0\\no=- 987654321 IN IP4 127.0.0.1\\ns=TestSession\\n...' }
      }));
    }

    if (packet.type === 'ice-candidate') {
      console.log('[Peer B] Отримано ICE Candidate від Peer A! З\'єднання успішно симульовано.');
      
      // Завершуємо демо
      console.log('[SYSTEM] Демонстрація WebRTC успішно завершена. Закриваємо з\'єднання...');
      peerA.close();
      peerB.close();
      wss.close(() => {
        server.close();
      });
    }
  });
}
