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
    let isAllowedToRead = false;
    const allowedTypes = ['.txt', '.sh', '.js', '.ts'];

    for (const extension of allowedTypes) {
      if (filepath.endsWith(extension)) {
        isAllowedToRead = true;
        break;
      }
    }

    if (!isAllowedToRead) {
      return {
        success: false,
        content: null,
        filepath,
        message: `Cannot read file: ${filepath}, only files with the following extensions can be read: ${allowedTypes.join(', ')}`
      }
    }

    if (filepath.startsWith('/') || filepath.includes('..')) {
      return {
        success: false,
        content: null,
        filepath,
        message: `Cannot read file: ${filepath}, only files in the current folder can be read for security reasons`
      }
    }

    console.log(`[READ] Reading from file: ${filepath}`);

    const fullPath = resolve(filepath);
    const content = await readFile(fullPath, 'utf-8');

    console.log(`[READ] Successfully read file: ${filepath}`);
    return {
      success: true,
      message: `Successfully read ${filepath}`,
      content,
      filepath
    };
  } catch (error) {
    console.error(`[READ] Error reading file:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to read file: ${errorMessage}`,
      content: null,
      filepath
    };
  }
}
