import dotenv from 'dotenv';
import { Harness } from './harness/harness.ts';
import { agenticLoop } from './agentic-loop.ts';
import { logger } from './utils/logger.ts';

dotenv.config();

async function main() {
  const harness = new Harness();

  logger.info('Harness initialized');
  logger.info('Type "quit" or "exit" or "bye" to exit\n');

  agenticLoop(harness);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => logger.error('Unhandled error in main:', err));
}
