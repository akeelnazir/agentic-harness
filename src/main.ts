import readline from 'readline';
import dotenv from 'dotenv';
import { Harness } from './harness/harness.ts';

dotenv.config();

async function main() {
  const harness = new Harness();

  console.log('Harness initialized');
  console.log('Type "quit" or "exit" or "bye" to exit\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const agenticLoop = () => {
    rl.question('You: ', (answer: string) => {
      const response = answer.toLowerCase();
      if (response === 'quit' || response === 'exit' || response === 'bye') {
        rl.close();
        return;
      }

      harness.processQuery(answer).then((response: string) => {
        console.log(`Agent: ${response}\n`);
        agenticLoop();
      }).catch((error: Error) => {
        console.error(`Error: ${error.message}\n`);
        agenticLoop();
      });
    });
  };

  agenticLoop();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
