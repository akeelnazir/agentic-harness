import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { WriteResult } from '../types/types.js';
import { logger } from '../utils/logger.ts';

/**
 * Write content to a markdown file in the 'files' folder
 * Auto-detects if file exists: creates new file or overwrites existing
 * @param filename - Name of the file
 * @param content - Content to write to the file
 * @returns Promise resolving to WriteResult with operation details
 */
export async function writeToFile(
  filename: string,
  content: string
): Promise<WriteResult> {
  try {
    logger.info(`[WRITE] Writing to file: ${filename}`);

    const folderPath = join(process.cwd(), filename.split('/').slice(0, -1).join('/'));
    const fullFilename = filename.split('/').pop()!;
    const filePath = join(folderPath, fullFilename);

    if (logger.isDebugEnabled()) {
      logger.debug('Write file paths', { folderPath, filePath, fullFilename });
    }

    // check if folder exists, if not create it
    try {
      await access(folderPath);
      logger.info(`[WRITE] Folder exists: ${folderPath}`);
    } catch {
      await mkdir(folderPath, { recursive: true });
      logger.info(`[WRITE] Created folder: ${folderPath}`);
    }

    let fileExists = false;
    try {
      await access(filePath);
      fileExists = true;
      logger.info(`[WRITE] File exists: ${filePath}`);
    } catch {
      fileExists = false;
      logger.info(`[WRITE] File does not exist: ${filePath}`);
    }

    if (logger.isDebugEnabled()) {
      logger.debug('Write file state', { fileExists, contentLength: content.length });
    }

    if (fileExists) {
      await writeFile(filePath, content.trim());
      logger.info(
        `[WRITE] Successfully wrote to file: ${fullFilename}, append not supported, overwriting content.`
      );
      return {
        success: true,
        message: `Wrote content to existing file: ${fullFilename}`,
        filename: fullFilename,
        mode: 'overwrite'
      };
    } else {
      await writeFile(filePath, content.trim());
      logger.info(`[WRITE] Successfully created file: ${fullFilename}`);
      return {
        success: true,
        message: `Created new file ${fullFilename}`,
        filename: fullFilename,
        mode: 'created'
      };
    }
  } catch (error) {
    logger.error(`[WRITE] Error writing to file:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to write file: ${filename} - error: ${errorMessage}`,
      filename,
      mode: 'created'
    };
  }
}
