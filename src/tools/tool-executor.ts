import { readFromFile } from './read-file.ts';
import { runShell } from './run-shell.ts';
import { isAllowedShellCommand } from './allowed-commands.ts';
import { writeToFile } from './write-file.ts';

/**
 * Execute a tool call by name and return the result string
 */
export async function executeTool(name: string, args: string): Promise<string> {
  switch (name) {
    case 'read_file':
      const { filename } = JSON.parse(args) as { filename: string };
      console.log(`[READ FILE] Executing read for: "${filename}"`);
      const readResult = await readFromFile(filename);
      return readResult.success
        ? (readResult.content ??
          `Successfully read file: ${readResult.filepath}`)
        : `Failed to read file: ${readResult.message}`;

    case 'run_shell':
      const { command, timeout } = JSON.parse(args) as {
        command: string;
        timeout?: number;
      };
      const { allowed, reason } = isAllowedShellCommand(command);
      if (!allowed) {
        console.warn(`[RUN SHELL] Blocked command: ${command} — ${reason}`);
        return `Command blocked: ${reason}`;
      }
      console.log(`[RUN SHELL] Executing: ${command}`);
      const shellResult = await runShell(command, timeout);
      return shellResult.success
        ? `Command executed successfully: ${shellResult.stdout}`
        : `Failed to execute command: ${shellResult.stderr}`;

    case 'write_file':
      const { filename: writeFilename, content } = JSON.parse(args) as {
        filename: string;
        content: string;
      };
      console.log(`[WRITE FILE] Executing write for: "${writeFilename}"`);
      const writeResult = await writeToFile(writeFilename, content);
      return writeResult.success
        ? `File written successfully: ${writeResult.filename}`
        : `Failed to write file: ${writeResult.message}`;

    default:
      return `Unknown tool: ${name}`;
  }
}
