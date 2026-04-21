export type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
export type { ChatCompletionTool } from 'openai/resources/chat/completions';

export interface ReadResult {
  success: boolean;
  message: string;
  content: string | null;
  filepath: string;
}

export interface WriteResult {
  success: boolean;
  message: string;
  filename: string;
  mode: 'created' | 'appended' | 'overwrite';
}

export interface ToolRequest {
  type: 'read';
  value: string;
  secondaryValue?: string;
}

export interface RepositoryContext {
  name: string;
  version: string;
  description: string;
  type: string;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  typescript:
    | {
        target: string;
        module: string;
        strict: boolean;
      }
    | undefined;
}

export interface RunShellResult {
  success: boolean;
  message: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  command: string;
}
