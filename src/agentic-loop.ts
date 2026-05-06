import readline from 'readline';
import { Harness } from './harness/harness.ts';
import { logger } from './services/logger.ts';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const agenticLoop = (harness: Harness, cleanup?: () => void | Promise<void>) => {
  rl.question('You: ', async (answer: string) => {
    if (logger.isDebugEnabled()) {
      logger.debug('User input received', { input: answer });
    }
    const response = answer.toLowerCase();
    if (response === 'quit' || response === 'exit' || response === 'bye') {
      rl.close();
      if (cleanup) {
        await cleanup();
      }
      return;
    }

    harness
      .processQuery(answer)
      .then((response: string) => {
        if (logger.isDebugEnabled()) {
          logger.debug('Agent response', { response });
        }
        logger.info(`Agent: ${response}\n`);
        agenticLoop(harness);
      })
      .catch((error: Error) => {
        logger.error(`Error: ${error.message}`);
        if (logger.isDebugEnabled()) {
          logger.debug('Agent error', {
            error: error.message,
            stack: error.stack,
          });
        }
        agenticLoop(harness);
      });
  });
};
