import dotenv from 'dotenv';
import { Harness } from './harness/harness.ts';
import { agenticLoop } from './agentic-loop.ts';

dotenv.config();

async function main() {
  const harness = new Harness();

  console.log('Harness initialized');
  console.log('Type "quit" or "exit" or "bye" to exit\n');

  agenticLoop(harness);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
