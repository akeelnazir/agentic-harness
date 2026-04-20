import readline from 'readline';
import { Harness } from './harness/harness.ts';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export const agenticLoop = (harness: Harness) => {
  rl.question('You: ', (answer: string) => {
    const response = answer.toLowerCase();
    if (response === 'quit' || response === 'exit' || response === 'bye') {
      rl.close();
      return;
    }

    harness.processQuery(answer).then((response: string) => {
      console.log(`Agent: ${response}\n`);
      agenticLoop(harness);
    }).catch((error: Error) => {
      console.error(`Error: ${error.message}\n`);
      agenticLoop(harness);
    });
  });
};