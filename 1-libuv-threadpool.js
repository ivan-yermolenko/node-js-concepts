/**
 * SCENARIO 1: Libuv Threadpool Optimization
 * 
 * Architectural Background:
 * - Node.js runs the JavaScript Event Loop in a single main thread.
 * - However, operations like file I/O (fs), DNS lookups, compression (zlib), and some cryptographic 
 *   functions (like crypto.pbkdf2, crypto.scrypt) are asynchronous but block-heavy. Node.js delegates 
 *   these to a background C++ threadpool managed by libuv.
 * - By default, this threadpool size is 4 (UV_THREADPOOL_SIZE = 4).
 * - If your application performs many simultaneous disk read/writes or cryptographic tasks, they will queue 
 *   up waiting for an available libuv thread, causing severe latency spikes (I/O bottlenecks).
 * 
 * How to configure UV_THREADPOOL_SIZE:
 * 1. Inside JS Code: Must be set on process.env BEFORE any module utilizing libuv is loaded/required.
 * 2. Via Environment: Set in the start script: `UV_THREADPOOL_SIZE=8 node app.js` (Recommended).
 */

// 1. Configure threadpool size dynamically BEFORE requiring crypto or fs
const THREADPOOL_SIZE = 8;
process.env.UV_THREADPOOL_SIZE = THREADPOOL_SIZE.toString();

// 2. Import modules after setting the threadpool size
const crypto = require('node:crypto');
const os = require('node:os');

console.log(`=== Libuv Threadpool Optimization ===`);
console.log(`Logical CPU Cores available: ${os.cpus().length}`);
console.log(`Configured UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE}`);
console.log(`--------------------------------------------------`);

const ITERATIONS = 100000; // Adjust based on CPU speed to see clear concurrency patterns
const KEY_LEN = 64;
const CONCURRENT_TASKS = 8; // We will run 8 cryptographic tasks concurrently

/**
 * Runs a single pbkdf2 cryptographic hash asynchronously.
 * Since it is async, Node.js offloads it to the libuv threadpool.
 */
function runCryptoTask(id) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    crypto.pbkdf2('my-secret-password', 'some-salt-string', ITERATIONS, KEY_LEN, 'sha512', (err, derivedKey) => {
      if (err) throw err;
      const duration = Date.now() - startTime;
      console.log(`[Task #${id}] Completed in ${duration}ms`);
      resolve(duration);
    });
  });
}

async function runBenchmark() {
  const startAll = Date.now();
  console.log(`Spawning ${CONCURRENT_TASKS} concurrent pbkdf2 operations...`);
  
  const tasks = Array.from({ length: CONCURRENT_TASKS }, (_, i) => runCryptoTask(i + 1));
  
  await Promise.all(tasks);
  const totalTime = Date.now() - startAll;
  
  console.log(`--------------------------------------------------`);
  console.log(`All ${CONCURRENT_TASKS} tasks completed in: ${totalTime}ms`);
  console.log(`--------------------------------------------------`);
  console.log(`Architectural Analysis (CPU/RAM/Event Loop):`);
  console.log(`1. Event Loop: Stays completely unblocked. Incoming HTTP requests can still be processed.`);
  console.log(`2. CPU Utilization: The heavy computations are parallelized across ${THREADPOOL_SIZE} OS threads.`);
  console.log(`   If your CPU has >= 8 cores, tasks run in parallel. If THREADPOOL_SIZE was default (4),`);
  console.log(`   tasks 5-8 would wait in a queue, doubling the total execution time.`);
  console.log(`3. RAM Footprint: Extremely low overhead. Spawning threads inside the libuv C++ layer`);
  console.log(`   incurs minimal memory cost (mostly thread stack overhead, < 1MB total), compared to`);
  console.log(`   creating full Node.js processes (Cluster/Child Processes) which duplicate the V8 runtime (~30MB+ each).`);
}

runBenchmark();
