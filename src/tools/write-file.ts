import { mkdir, writeFile, appendFile, access } from 'fs/promises';
import { join } from 'path';
import type { WriteResult } from '../types/types.js';

/**
 * Write content to a markdown file in the 'files' folder
 * Auto-detects if file exists: creates new file or appends to existing
 * @param filename - Name of the file (without .md extension)
 * @param content - Content to write to the file
 * @returns Promise resolving to WriteResult with operation details
 */
export async function writeToFile(
  filename: string,
  content: string
): Promise<WriteResult> {
  try {
    console.log(`[WRITE] Writing to file: ${filename}`);

    const folderPath = join(process.cwd(), filename.split('/').slice(0, -1).join('/'));
    const fullFilename = filename.split('/').pop()!;
    const filePath = join(folderPath, fullFilename);

    // check if folder exists, if not create it
    try {
      await access(folderPath);
      console.log(`[WRITE] Folder exists: ${folderPath}`);
    } catch {
      await mkdir(folderPath, { recursive: true });
      console.log(`[WRITE] Created folder: ${folderPath}`);
    }

    let fileExists = false;
    try {
      await access(filePath);
      fileExists = true;
      console.log(`[WRITE] File exists: ${filePath}`);
    } catch {
      fileExists = false;
      console.log(`[WRITE] File does not exist: ${filePath}`);
    }

    if (fileExists) {
      await appendFile(filePath, `\n${content}`);
      console.log(
        `[WRITE] Successfully appended to file: ${fullFilename}`
      );
      return {
        success: true,
        message: `Appended content to ${fullFilename}`,
        filename: fullFilename,
        mode: 'appended'
      };
    } else {
      await writeFile(filePath, content);
      console.log(`[WRITE] Successfully created file: ${fullFilename}`);
      return {
        success: true,
        message: `Created new file ${fullFilename}`,
        filename: fullFilename,
        mode: 'created'
      };
    }
  } catch (error) {
    console.error(`[WRITE] Error writing to file:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to write file: ${errorMessage}`,
      filename: filename,
      mode: 'created'
    };
  }
}
