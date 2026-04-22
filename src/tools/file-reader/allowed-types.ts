export const allowedTypes = [
  '.txt',
  '.sh',
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.tsconfig.json',
  '.jsconfig.json',
  '.md',
  '.csv',
  '.log',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.yaml',
  '.yml',
  '.conf',
  '.cfg',
  '.env',
  '.env.example',
  '.env.local',
  '.dockerfile',
  '.dockerignore',
  'docker-compose.yml',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  '.eslintignore',
  '.prettierignore',
  '.npmignore',
  'Makefile',
];

export function isAllowedType(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  const lowerFilename = filename.toLowerCase();
  return allowedTypes.some((type) => {
    const lowerType = type.toLowerCase();
    if (lowerType.startsWith('.')) {
      return lowerFilename.endsWith(lowerType);
    } else {
      return lowerFilename === lowerType;
    }
  });
}
