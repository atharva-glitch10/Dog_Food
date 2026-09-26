import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from './utils/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 DOGFOOD 2026 Backend Running on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`📚 OpenAPI Docs: http://localhost:${config.port}/api/docs`);
  console.log(`❤️ Healthcheck: http://localhost:${config.port}/api/health`);
  console.log(`====================================================`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connection pool released.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
