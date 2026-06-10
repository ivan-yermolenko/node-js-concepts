/**
 * SCENARIO 3: Worker Threads (CPU-Bound task script)
 * 
 * Architectural Background:
 * - This script is executed inside a Worker Thread, spawned from the main thread.
 * - It runs in a separate V8 Isolate, meaning it has its own call stack and heap memory.
 * - However, it runs inside the same operating system process, sharing raw system handles and process memory space.
 * - This script performs a heavy CPU-bound computation (finding prime numbers) which would otherwise freeze 
 *   the single-threaded Event Loop of the main process.
 */

const { parentPort, workerData } = require('node:worker_threads');

// 1. Read input parameters passed from the main thread
const limit = workerData.limit || 15000000;

console.log(`[Worker Thread] Starting prime computation up to ${limit}...`);
const startTime = Date.now();

/**
 * CPU-intensive function: Sieve of Eratosthenes to find primes.
 * Time Complexity: O(N log log N), Space Complexity: O(N)
 */
function calculatePrimes(max) {
  // Allocate a flat typed array in V8 heap memory for fast access
  const isPrime = new Uint8Array(max + 1);
  isPrime.fill(1);
  isPrime[0] = 0;
  isPrime[1] = 0;

  const primes = [];

  for (let i = 2; i <= Math.sqrt(max); i++) {
    if (isPrime[i] === 1) {
      for (let j = i * i; j <= max; j += i) {
        isPrime[j] = 0;
      }
    }
  }

  // Collect the computed primes
  for (let i = 2; i <= max; i++) {
    if (isPrime[i] === 1) {
      primes.push(i);
    }
  }

  return primes;
}

// 2. Perform the intensive CPU work
const allPrimes = calculatePrimes(limit);
const duration = Date.now() - startTime;

console.log(`[Worker Thread] Found ${allPrimes.length} primes in ${duration}ms.`);

// 3. Send the computed result back to the main thread
parentPort.postMessage({
  count: allPrimes.length,
  durationMs: duration,
  // We send only a small sample of the array to prevent unnecessary cloning overhead across V8 isolates
  sample: allPrimes.slice(0, 10) 
});
