/**
 * SCENARIO 2: Scaling API-Server Under High Traffic Using Cluster Module
 * 
 * Architectural Background:
 * - A single Node.js instance runs on a single core. If a server is deployed on a machine with 
 *   multiple cores (e.g., 8 cores), a default Node.js app leaves 7 cores idle.
 * - The `node:cluster` module allows scaling the application by spawning worker processes.
 * - Primary Process: Does not run any server logic or accept requests. It is a control process 
 *   responsible for orchestrating worker processes, managing their lifecycles, and restarting them on crash.
 * - Worker Processes: Each worker is a separate OS process with its own V8 engine instance, Event Loop, 
 *   and memory space.
 * - Shared Port: The cluster module uses a Round-Robin approach (by default on Unix) where the primary 
 *   process listens on the target port and distributes incoming TCP connections to workers' sockets via IPC.
 */

const cluster = require('node:cluster');
const http = require('node:http');
const os = require('node:os');
const process = require('node:process');

// Port to listen on
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3080;

// Determine optimal number of workers based on CPU core availability (Node.js 18.14.0+)
// Fall back to os.cpus().length for older Node versions
const getNumCores = () => {
  if (typeof os.availableParallelism === 'function') {
    return os.availableParallelism();
  }
  return os.cpus().length;
};

const numCPUs = getNumCores();

if (cluster.isPrimary) {
  console.log(`=== CLUSTER PRIMARY PROCESS STARTED ===`);
  console.log(`Primary Process PID: ${process.pid}`);
  console.log(`Logical CPU cores detected: ${numCPUs}`);
  console.log(`Spawning ${numCPUs} Worker Processes...`);
  console.log(`--------------------------------------------------`);

  // Fork a worker for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit (Crash recovery / Self-healing)
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Primary] Worker ${worker.process.pid} exited. Code: ${code}, Signal: ${signal}`);
    console.log(`[Primary] Spawning a new worker to maintain capacity...`);
    cluster.fork();
  });

} else {
  // WORKER PROCESS: Runs the actual application code (HTTP server)
  
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // 1. Health check / Standard endpoint
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'OK',
        message: `Hello from Worker!`,
        workerPid: process.pid,
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    // 2. Simulated crash endpoint to demonstrate auto-restart/recovery
    if (url.pathname === '/crash') {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Worker PID ${process.pid} is crashing now...\n`);
      
      console.error(`[Worker ${process.pid}] Received /crash command! Terminating...`);
      // Force exit to trigger the 'exit' event on the Primary process
      process.exit(1);
    }

    // 3. Fallback 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  });

  server.listen(PORT, () => {
    console.log(`[Worker ${process.pid}] HTTP server listening on port ${PORT}`);
  });

  // Graceful shutdown handling for Workers
  process.on('SIGTERM', () => {
    console.log(`[Worker ${process.pid}] SIGTERM received. Closing HTTP server...`);
    server.close(() => {
      console.log(`[Worker ${process.pid}] HTTP server closed. Exiting.`);
      process.exit(0);
    });
  });
}
