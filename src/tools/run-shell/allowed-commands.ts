import { resolve, normalize } from 'path';

// Commands that accept filesystem path arguments and must be confined to CWD
const PATH_AWARE_COMMANDS: string[] = [
  'ls', 'cat', 'find', 'grep', 'rg', 'head', 'tail', 'wc', 'stat',
  'tree', 'file', 'sed', 'awk', 'cut', 'du', 'sort', 'uniq', 'mkdir',
];

// Allowed base executables — the command must start with one of these
export const allowedBaseCommands: string[] = [
  // Filesystem navigation & inspection
  'ls',
  'cat',
  'echo',
  'pwd',
  'find',
  'grep',
  'rg',
  'head',
  'tail',
  'wc',
  'stat',
  'tree',
  'file',

  // Text manipulation
  'sed',
  'awk',
  'sort',
  'uniq',
  'cut',
  'jq',

  // System info (read-only)
  'whoami',
  'date',
  'df',
  'du',
  'free',
  'ps',
  'top',
  'uptime',
  'uname',
  'ifconfig',
  'ip',
  'netstat',
  'ss',

  // Docker (read-only)
  'docker',

  // Git (read + controlled write)
  'git',

  // Node / package managers
  'node',
  'npm',
  'npx',
  'yarn',
  'pnpm',

  // Build & test
  'tsc',
  'eslint',
  'jest',
  'vitest',
  'make',

  // Python
  'python',
  'python3',

  // Folder operations
  'mkdir',

  // Web search
  'curl',
  'wget',
];

// Forbidden argument patterns — matched against the full command string.
// If any pattern matches, the command is rejected regardless of base command.
export const forbiddenPatterns: RegExp[] = [
  // Privilege escalation
  /\bsudo\b/,
  /\bsu\b/,
  /\bdoas\b/,

  // Destructive filesystem
  /\brm\s+.*-[a-z]*r[a-z]*/i, // rm -r, rm -rf, rm -fr, etc.
  /\bshred\b/,
  /\btruncate\b/,
  /\bdd\b/,
  /\bmkfs\b/,
  /\bfdisk\b/,
  /\bparted\b/,

  // Dangerous chmod/chown
  /\bchmod\s+[0-7]*7[0-7][0-7]/, // chmod 777, 707, etc.
  /\bchown\b/,

  // System service / persistence modification
  /\bsystemctl\b/,
  /\bservice\b/,
  /\bcrontab\b/,
  /\bvisudo\b/,
  /\bmount\b/,
  /\bumount\b/,
  /\biptables\b/,
  /\bufw\b/,

  // Network exfiltration
  // /\bcurl\b/,
  // /\bwget\b/,
  /\bnc\b/,
  /\bnetcat\b/,
  /\bssh\b/,
  /\bscp\b/,
  /\brsync\b/,

  // Docker write / cluster operations
  /\bdocker\s+run\b/,
  /\bdocker\s+exec\b/,
  /\bdocker\s+build\b/,
  /\bkubectl\b/,

  // Shell escape / arbitrary execution
  /\beval\b/,
  /;\s*bash\b/,
  /;\s*sh\b/,
  /\$\(.*\)/, // command substitution
  /`[^`]+`/, // backtick substitution
  />\s*\/etc\//, // redirecting into /etc
  />\s*\/usr\//, // redirecting into /usr
  />\s*\/bin\//, // redirecting into /bin
];

export function isAllowedShellCommand(
  command: string,
  cwd: string = process.cwd()
): {
  allowed: boolean;
  reason?: string;
} {
  const trimmed = command.trim();
  const baseCommand = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';

  if (!allowedBaseCommands.includes(baseCommand)) {
    return {
      allowed: false,
      reason: `Base command '${baseCommand}' is not in the allowlist`,
    };
  }

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: `Command matches forbidden pattern: ${pattern}`,
      };
    }
  }

  if (PATH_AWARE_COMMANDS.includes(baseCommand)) {
    const confinementResult = checkPathConfinement(trimmed, cwd);
    if (!confinementResult.allowed) {
      return confinementResult;
    }
  }

  return { allowed: true };
}

/**
 * Checks that all path-like tokens in a command are confined to the given root directory.
 * Rejects absolute paths outside root and any parent traversal (../).
 */
export function checkPathConfinement(
  command: string,
  root: string = process.cwd()
): { allowed: boolean; reason?: string } {
  const normalizedRoot = normalize(resolve(root));
  const tokens = command.split(/\s+/).slice(1);

  for (const token of tokens) {
    if (token.startsWith('-')) continue;

    const looksLikePath =
      token.startsWith('/') ||
      token.startsWith('./') ||
      token.startsWith('../') ||
      token === '..' ||
      token.includes('/');

    if (!looksLikePath) continue;

    const resolved = normalize(resolve(normalizedRoot, token));

    if (!resolved.startsWith(normalizedRoot + '/') && resolved !== normalizedRoot) {
      return {
        allowed: false,
        reason: `Path '${token}' resolves outside the working directory ('${normalizedRoot}')`,
      };
    }
  }

  return { allowed: true };
}
