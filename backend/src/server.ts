import { config } from '@config/env';
import { app } from './app';
import http from 'http';

const server = http.createServer(app);

function start(port: number) {
  server.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

server.on('error', (err: any) => {
  if (err && err.code === 'EADDRINUSE') {
    const nextPort = (Number(process.env.CI) ? config.port : config.port + 1);
    if (nextPort !== config.port) {
      console.warn(`Port ${config.port} in use, retrying on ${nextPort}...`);
      setTimeout(() => start(nextPort), 200);
    } else {
      console.warn(`Port ${config.port} in use, assuming server already running. Skipping new listener.`);
    }
  } else {
    console.error('Server error:', err);
    process.exitCode = 1;
  }
});

start(config.port);

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down HTTP server...`);
  server.close(err => {
    if (err) {
      console.error('Error during HTTP server close:', err);
      process.exit(1);
    }
    process.exit(0);
  });
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
