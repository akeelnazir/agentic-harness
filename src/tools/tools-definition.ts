import type { ChatCompletionTool } from '../types/types.ts';

export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the contents of a file from the local disk. Use this tool to access information stored in files. The input should be the filename or path relative to the current working directory.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description:
              'The name or relative path of the file to read. For example, "data/info.txt" or "notes.md".',
          },
        },
        required: ['filename'],
      },
      strict: true,
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_shell',
      description:
        'Execute a shell command and return the result. Use this tool to run system commands or scripts.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description:
              'The shell command to execute. For example, "ls -la" or "npm install".',
          },
          timeout: {
            type: 'number',
            description:
              'Maximum execution time in milliseconds (default: 30000).',
          },
        },
        required: ['command'],
      },
      strict: true,
    },
  },
];
