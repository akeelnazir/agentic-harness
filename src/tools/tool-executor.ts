import { readFromFile } from './file-reader/read-file.ts';
import { runShell } from './run-shell/run-shell.ts';
import { isAllowedShellCommand } from './run-shell/allowed-commands.ts';
import { writeToFile } from './file-writer/write-file.ts';
import { logger } from '../services/logger.ts';
import { webSearch } from './web-search/web-search.ts';
import { personSearch, companySearch } from './192-search/192-search.ts';

/**
 * Execute a tool call by name and return the result string
 */
export async function executeTool(name: string, args: string): Promise<string> {
  if (logger.isDebugEnabled()) {
    logger.debug('Executing tool', { name, args });
  }
  switch (name) {
    case 'read_file':
      const { filename } = JSON.parse(args) as { filename: string };
      logger.info(`[READ FILE] Executing read for: "${filename}"`);
      const readResult = await readFromFile(filename);
      return readResult.success
        ? (readResult.content ??
            `Successfully read file: ${readResult.filepath}`)
        : `Failed to read file: ${readResult.message}`;

    case 'run_shell':
      const { command, timeout } = JSON.parse(args) as {
        command: string;
        timeout?: number;
      };
      const { allowed, reason } = isAllowedShellCommand(command);
      if (!allowed) {
        logger.warn(`[RUN SHELL] Blocked command: ${command} — ${reason}`);
        return `Command blocked: ${reason}`;
      }
      logger.info(`[RUN SHELL] Executing: ${command}`);
      const shellResult = await runShell(command, timeout);
      return shellResult.success
        ? `Command executed successfully: ${shellResult.stdout}`
        : `Failed to execute command: ${shellResult.stderr}`;

    case 'write_file':
      const { filename: writeFilename, content } = JSON.parse(args) as {
        filename: string;
        content: string;
      };
      logger.info(`[WRITE FILE] Executing write for: "${writeFilename}"`);
      const writeResult = await writeToFile(writeFilename, content);
      return writeResult.success
        ? `File written successfully: ${writeResult.filename}`
        : `Failed to write file: ${writeResult.message}`;

    case 'person_search':
      const { first_name, last_name, location } = JSON.parse(args) as {
        first_name: string;
        last_name: string;
        location?: string;
      };
      logger.info(`[PERSON SEARCH] Searching for: "${first_name} ${last_name}"`);
      try {
        const personResults = await personSearch(first_name, last_name, location);
        return personResults.length > 0
          ? `Found ${personResults.length} result(s):\n${personResults
              .map(
                (r, i) =>
                  `${i + 1}. ${r.firstName} ${r.lastName} | Address: ${r.address || 'N/A'} | Phone: ${r.phone || 'N/A'} | DOB: ${r.dateOfBirth || 'N/A'}`
              )
              .join('\n')}`
          : 'No person records found';
      } catch (err) {
        return `Person search error: ${err instanceof Error ? err.message : String(err)}`;
      }

    case 'company_search':
      const { company_name, registration_number } = JSON.parse(args) as {
        company_name: string;
        registration_number?: string;
      };
      logger.info(`[COMPANY SEARCH] Searching for: "${company_name}"`);
      try {
        const companyResults = await companySearch(company_name, registration_number);
        return companyResults.length > 0
          ? `Found ${companyResults.length} result(s):\n${companyResults
              .map(
                (r, i) =>
                  `${i + 1}. ${r.companyName} | Reg: ${r.registrationNumber || 'N/A'} | Address: ${r.address || 'N/A'} | Status: ${r.status || 'N/A'} | Incorporated: ${r.incorporationDate || 'N/A'}`
              )
              .join('\n')}`
          : 'No company records found';
      } catch (err) {
        return `Company search error: ${err instanceof Error ? err.message : String(err)}`;
      }

    case 'web_search':
      const { query } = JSON.parse(args) as { query: string };
      logger.info(`[WEB SEARCH] Executing search for: "${query}"`);
      const searchResult = await webSearch(query);
      return searchResult.length > 0
        ? `Search results: ${searchResult.map((r: { title: string }) => r.title).join(', ')}`
        : 'No search results found';

    default:
      return `Unknown tool: ${name}`;
  }
}
