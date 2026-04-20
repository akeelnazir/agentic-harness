import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { RepositoryContext } from '../types/types.ts';

function loadPackageJson(): Partial<RepositoryContext> {
  try {
    const content = readFileSync(
      resolve(process.cwd(), 'package.json'),
      'utf-8'
    );
    const pkg = JSON.parse(content);
    return {
      name: pkg.name || 'unknown',
      version: pkg.version || 'unknown',
      description: pkg.description || '',
      type: pkg.type || 'commonjs',
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
      scripts: pkg.scripts || {},
    };
  } catch {
    return {
      name: 'unknown',
      version: 'unknown',
      description: '',
      type: 'commonjs',
      dependencies: [],
      devDependencies: [],
      scripts: {},
    };
  }
}

function loadTsConfig():
  | { target: string; module: string; strict: boolean }
  | undefined {
  try {
    const content = readFileSync(
      resolve(process.cwd(), 'tsconfig.json'),
      'utf-8'
    );
    const config = JSON.parse(content);
    return {
      target: config.compilerOptions?.target || 'ES2020',
      module: config.compilerOptions?.module || 'CommonJS',
      strict: config.compilerOptions?.strict || false,
    };
  } catch {
    return undefined;
  }
}

export function loadRepositoryContext(): RepositoryContext {
  const pkg = loadPackageJson();
  const typescript = loadTsConfig();

  return {
    name: pkg.name!,
    version: pkg.version!,
    description: pkg.description!,
    type: pkg.type!,
    dependencies: pkg.dependencies!,
    devDependencies: pkg.devDependencies!,
    scripts: pkg.scripts!,
    typescript,
  };
}

export function formatRepositoryContext(ctx: RepositoryContext): string {
  const lines: string[] = [];

  lines.push(
    `Project: ${ctx.name} v${ctx.version} (${ctx.type === 'module' ? 'ESM' : 'CommonJS'})`
  );

  if (ctx.typescript) {
    lines.push(
      `Language: TypeScript (target: ${ctx.typescript.target}, module: ${ctx.typescript.module}, strict: ${ctx.typescript.strict})`
    );
  }

  if (ctx.dependencies.length > 0) {
    lines.push(`Dependencies: ${ctx.dependencies.join(', ')}`);
  }

  if (ctx.devDependencies.length > 0) {
    lines.push(`Dev Dependencies: ${ctx.devDependencies.join(', ')}`);
  }

  return lines.join('\n');
}
