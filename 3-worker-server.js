/**
 * SCENARIO 3: Scaling CPU-Bound Tasks Using Worker Threads
 * 
 * Architectural Background:
 * - A single-threaded Node.js server blocks its Event Loop when running CPU-heavy logic (e.g., encryption, 
 *   heavy loops, image processing). During this time, the server cannot accept or respond to other HTTP requests.
 * - The `node:worker_threads` module allows spawning threads that run JavaScript code in parallel.
 * - Each Worker Thread has its own V8 engine isolate (independent call stack, garbage collector, and heap).
 * - Spawning a worker thread is lightweight (takes ~10-15MB of base RAM) compared to forks or child processes 
 *   (which duplicate the entire Node.js runtime process structure).
 * - Since they run in the same process, they share process resources, and communication via message passing 
 *   (postMessage) or SharedArrayBuffer is extremely fast.
 */

const http = require('node:http');
const { Worker } = require('node:worker_threads');
const path = require('node:path');

const PORT = 3080;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. LIGHT ENDPOINT: Instantly responds to demonstrate event-loop non-blocking
  if (url.pathname === '/light') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'OK', 
      message: 'Instant response! The Event Loop is free and responsive.',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. HEAVY CPU-BOUND ENDPOINT: Spawns a Worker Thread to run calculations in parallel
  if (url.pathname === '/heavy') {
    const limit = parseInt(url.searchParams.get('limit') || '15000000', 10);
    console.log(`[Main Thread] Received /heavy request. Spawning Worker Thread...`);

    // Worker file path
    const workerPath = path.resolve(__dirname, '3-worker-task.js');

    // Spawn the worker thread
    const worker = new Worker(workerPath, {
      workerData: { limit } // Pass input params directly to the worker isolate
    });

    // Listen for the computation result from the Worker
    worker.on('message', (result) => {
      console.log(`[Main Thread] Worker completed computation. Sending response.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'OK',
        calculationDurationMs: result.durationMs,
        totalPrimesFound: result.count,
        samplePrimes: result.sample,
        message: 'Calculated in worker thread. Event loop remained completely free!'
      }));
    });

    // Handle any runtime error thrown inside the Worker Thread
    worker.on('error', (err) => {
      console.error(`[Main Thread] Worker error:`, err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'Error', message: err.message }));
    });

    // Handle worker exit events
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[Main Thread] Worker exited with code: ${code}`);
      }
    });

    return;
  }

  // 3. Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found\n');
});

server.listen(PORT, () => {
  console.log(`[Main Thread] HTTP Server running on port ${PORT}`);
  console.log(`- Test non-blocking: http://localhost:${PORT}/light`);
  console.log(`- Test heavy CPU work: http://localhost:${PORT}/heavy?limit=15000000`);
});
