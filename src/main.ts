import dotenv from 'dotenv';
import { Harness } from './harness/harness.ts';
import { agenticLoop } from './agentic-loop.ts';
import { logger } from './services/logger.ts';

dotenv.config();

async function main() {
  const harness = new Harness();

  // Initialize harness (connects to MCP servers)
  await harness.initialize();

  logger.info('Harness initialized');
  logger.info('Type "quit" or "exit" or "bye" to exit\n');

  // Handle cleanup on exit
  const cleanup = async () => {
    logger.info('Shutting down...');
    await harness.cleanup?.();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  agenticLoop(harness, cleanup);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => logger.error('Unhandled error in main:', err));
}
