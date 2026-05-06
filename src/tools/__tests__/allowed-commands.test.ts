import { isAllowedShellCommand, checkPathConfinement } from '../run-shell/allowed-commands.ts';

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

  describe('path confinement', () => {
    const cwd = '/home/user/project';

    it('should block ls with an absolute path outside CWD', () => {
      const result = isAllowedShellCommand('ls -la /etc', cwd);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('/etc');
    });

    it('should block cat with an absolute path outside CWD', () => {
      const result = isAllowedShellCommand('cat /etc/passwd', cwd);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('/etc/passwd');
    });

    it('should block parent directory traversal', () => {
      const result = isAllowedShellCommand('ls ../../etc', cwd);
      expect(result.allowed).toBe(false);
    });

    it('should allow ls with no path argument', () => {
      const result = isAllowedShellCommand('ls -la', cwd);
      expect(result.allowed).toBe(true);
    });

    it('should allow ls on a relative child path', () => {
      const result = isAllowedShellCommand('ls ./src', cwd);
      expect(result.allowed).toBe(true);
    });

    it('should allow ls on a nested relative child path', () => {
      const result = isAllowedShellCommand('ls src/tools', cwd);
      expect(result.allowed).toBe(true);
    });

    it('should allow find within CWD', () => {
      const result = isAllowedShellCommand('find . -name "*.ts"', cwd);
      expect(result.allowed).toBe(true);
    });

    it('should block find targeting an absolute path outside CWD', () => {
      const result = isAllowedShellCommand('find /usr/bin -name "node"', cwd);
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkPathConfinement', () => {
    const root = '/home/user/project';

    it('should return allowed for commands with only flags', () => {
      expect(checkPathConfinement('ls -la', root)).toEqual({ allowed: true });
    });

    it('should return allowed for relative child paths', () => {
      expect(checkPathConfinement('ls ./dist', root)).toEqual({ allowed: true });
    });

    it('should block absolute paths resolving outside root', () => {
      const result = checkPathConfinement('ls /etc', root);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('/etc');
    });

    it('should block .. traversal escaping root', () => {
      const result = checkPathConfinement('cat ../secret.txt', root);
      expect(result.allowed).toBe(false);
    });

    it('should allow the CWD itself (.)', () => {
      expect(checkPathConfinement('ls .', root)).toEqual({ allowed: true });
    });
  });
});