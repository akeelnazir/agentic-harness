import { runShell } from '../run-shell.ts';

describe('runShell', () => {
  it('should execute command successfully and return success result', async () => {
    const result = await runShell('echo "test"');

    expect(result.success).toBe(true);
    expect(result.message).toContain('Command executed successfully');
    expect(result.stdout).toContain('test');
    expect(result.exitCode).toBe(0);
  });

  it('should handle command execution error', async () => {
    const result = await runShell('false');

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });

  it('should handle timeout', async () => {
    const result = await runShell('sleep 10', 100);

    expect(result.success).toBe(false);
  });
});