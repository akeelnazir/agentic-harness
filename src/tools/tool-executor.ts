import { readFromFile } from './read-file.ts';

/**
 * Execute a tool call by name and return the result string
 */
export async function executeTool(name: string, args: string): Promise<string> {
  switch (name) {
    case 'read_file':
      const { filename } = JSON.parse(args) as { filename: string };
      console.log(`[READ FILE] Executing read for: "${filename}"`);
      const readResult = await readFromFile(filename);
      return readResult.success
        ? (readResult.content ??
            `Successfully read file: ${readResult.filepath}`)
        : `Failed to read file: ${readResult.message}`;
    default:
      return `Unknown tool: ${name}`;
  }
}
