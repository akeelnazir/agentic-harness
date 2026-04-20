import readline from 'readline';
import dotenv from 'dotenv';
import Harness from './harness/harness.ts';
import { DEFAULT_MODEL } from './config.ts';

dotenv.config();

async function main() {
  const harness = new Harness(DEFAULT_MODEL);

  console.log('Harness initialized');
  console.log('Type "quit" to exit\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question('You: ', (answer: string) => {
      const response = answer.toLowerCase();
      if (response === 'quit' || response === 'exit' || response === 'bye') {
        rl.close();
        return;
      }

      harness.processQuery(answer).then((response: string) => {
        console.log(`Agent: ${response}\n`);
        askQuestion();
      }).catch((error: Error) => {
        console.error(`Error: ${error.message}\n`);
        askQuestion();
      });
    });
  };

  askQuestion();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
