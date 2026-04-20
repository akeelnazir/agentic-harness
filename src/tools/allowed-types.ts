export const allowedTypes = [
  '.txt',
  '.sh',
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.js', '.ts', '.json', '.tsconfig.json', '.jsconfig.json',
  '.md',
  '.csv',
  '.log',
  '.xml',
  '.html', '.css',
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
  '.env', '.env.example', '.env.local',
  '.dockerfile', '.dockerignore', 'docker-compose.yml',
  '.gitignore', '.gitattributes',
  '.editorconfig',
  '.eslintignore', '.prettierignore', '.npmignore',
  'Makefile',
];

export function isAllowedType(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return lowerFilename.endsWith(type);
    } else {
      return lowerFilename === type;
    }
  });
}
