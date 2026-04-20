import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { ReadResult } from '../types/index.js';

/**
 * Read content from a file
 * @param filepath - Path to the file (relative or absolute)
 * @returns Promise resolving to ReadResult with file content
 */
export async function readFromFile(filepath: string): Promise<ReadResult> {
  try {
    console.log(`[READ] Reading from file: ${filepath}`);

    const fullPath = resolve(filepath);
    const content = await readFile(fullPath, 'utf-8');

    console.log(`[READ] Successfully read file: ${filepath}`);
    return {
      success: true,
      message: `Successfully read ${filepath}`,
      content: content,
      filepath: filepath
    };
  } catch (error) {
    console.error(`[READ] Error reading file:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to read file: ${errorMessage}`,
      content: null,
      filepath: filepath
    };
  }
}
