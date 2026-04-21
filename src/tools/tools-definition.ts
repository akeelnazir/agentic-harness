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
              'The shell command to execute. For example, "ls -la", "npm install", "mkdir new-folder".',
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
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Write content to a file on the local disk. Use this tool to create or overwrite files. Appending to existing files is not supported; if the file already exists, it will be overwritten with the new content.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description:
              'The name or relative path of the file to write. For example, "data/output.txt" or "notes.md".',
          },
          content: {
            type: 'string',
            description: 'The content to write to the file.',
          },
        },
        required: ['filename', 'content'],
      },
      strict: true,
    },
  },
];
