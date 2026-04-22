import { readFromFile } from './file-reader/read-file.ts';
import { runShell } from './run-shell/run-shell.ts';
import { isAllowedShellCommand } from './run-shell/allowed-commands.ts';
import { writeToFile } from './file-writer/write-file.ts';
import { logger } from '../services/logger.ts';

/**
 * Execute a tool call by name and return the result string
 */
export async function executeTool(name: string, args: string): Promise<string> {
  if (logger.isDebugEnabled()) {
    logger.debug('Executing tool', { name, args });
  }
  switch (name) {
    case 'read_file':
      const { filename } = JSON.parse(args) as { filename: string };
      logger.info(`[READ FILE] Executing read for: "${filename}"`);
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
        logger.warn(`[RUN SHELL] Blocked command: ${command} — ${reason}`);
        return `Command blocked: ${reason}`;
      }
      logger.info(`[RUN SHELL] Executing: ${command}`);
      const shellResult = await runShell(command, timeout);
      return shellResult.success
        ? `Command executed successfully: ${shellResult.stdout}`
        : `Failed to execute command: ${shellResult.stderr}`;

    case 'write_file':
      const { filename: writeFilename, content } = JSON.parse(args) as {
        filename: string;
        content: string;
      };
      logger.info(`[WRITE FILE] Executing write for: "${writeFilename}"`);
      const writeResult = await writeToFile(writeFilename, content);
      return writeResult.success
        ? `File written successfully: ${writeResult.filename}`
        : `Failed to write file: ${writeResult.message}`;

    default:
      return `Unknown tool: ${name}`;
  }
}
