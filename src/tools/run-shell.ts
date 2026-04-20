import { exec } from 'child_process';
import { promisify } from 'util';
import type { RunShellResult } from '../types/types.ts';

const execAsync = promisify(exec);

/**
 * Run a shell command
 * @param command - The shell command to execute
 * @param timeout - Maximum execution time in milliseconds (default: 30000)
 * @returns Promise resolving to CommandResult with stdout, stderr, and exit code
 */
export async function runShell(
  command: string,
  timeout: number = 30000
): Promise<RunShellResult> {
  try {
    console.log(`[RUN COMMAND] Executing: ${command}`);

    const { stdout, stderr } = await execAsync(command, { timeout });

    console.log(`[RUN COMMAND] Successfully executed: ${command}`);
    return {
      success: true,
      message: `Command executed successfully`,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      command: command,
    };
  } catch (error) {
    console.error(`[RUN COMMAND] Error executing command:`, error);

    if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
      const execError = error as unknown as {
        stdout: string;
        stderr: string;
        code: number | null;
      };
      return {
        success: execError.code === 0,
        message: `Command exited with code ${execError.code}`,
        stdout: execError.stdout?.trim() || '',
        stderr: execError.stderr?.trim() || '',
        exitCode: execError.code ?? null,
        command: command,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to execute command: ${errorMessage}`,
      stdout: '',
      stderr: '',
      exitCode: null,
      command: command,
    };
  }
}
