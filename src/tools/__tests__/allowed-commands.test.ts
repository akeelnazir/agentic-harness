import { isAllowedShellCommand } from '../run-shell/allowed-commands.ts';

describe('isAllowedShellCommand', () => {
  it('should allow basic allowed commands', () => {
    expect(isAllowedShellCommand('ls')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('cat')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('echo')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('pwd')).toEqual({ allowed: true });
  });

  it('should allow complex allowed commands', () => {
    expect(isAllowedShellCommand('find . -name "*.txt"')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('grep "pattern" file.txt')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('node package.json')).toEqual({ allowed: true });
  });

  it('should handle case insensitivity', () => {
    expect(isAllowedShellCommand('LS')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('CAT')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('Echo')).toEqual({ allowed: true });
  });

  it('should reject forbidden patterns - sudo', () => {
    const result = isAllowedShellCommand('sudo ls');
    expect(result.allowed).toBe(false);
    // The reason may vary, but should be false
    expect(result.reason).toBeTruthy();
  });

  it('should reject forbidden patterns - rm -rf', () => {
    const result = isAllowedShellCommand('rm -rf /tmp');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('should reject forbidden patterns - chmod 777', () => {
    const result = isAllowedShellCommand('chmod 777 /tmp');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('should reject forbidden patterns - mount', () => {
    const result = isAllowedShellCommand('mount /dev/sda');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('should allow git commands (read + controlled write)', () => {
    expect(isAllowedShellCommand('git status')).toEqual({ allowed: true });
    expect(isAllowedShellCommand('git add .')).toEqual({ allowed: true });
  });

  it('should reject unknown base command', () => {
    const result = isAllowedShellCommand('unknowncommand');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Base command');
  });

  // Empty string has no base command, so should be allowed (no restriction)
  it('should handle empty string input', () => {
    const result = isAllowedShellCommand('');
    expect(result.allowed).toBe(false); // No base command to check
  });
});