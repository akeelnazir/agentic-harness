import type { ToolRequest } from '../types/index.ts';

/**
 * Extract tool requests from LLM response
 * Format: [SEARCH: query] or [STOCK: ticker] or [WRITE: filename | content]
 */
export function extractToolRequests(response: string): ToolRequest[] {
  console.log(`[TOOL EXTRACTION] Analyzing response for tool calls...`);
  console.log(`[TOOL EXTRACTION] Response length: ${response.length} characters`);
  console.log(`[TOOL EXTRACTION] Response content: "${response.substring(0, 200)}..."`);

  const tools: ToolRequest[] = [];

  const readMatches = response.matchAll(/\[READ:\s*([^\]]+)\]/g);
  for (const match of readMatches) {
    if (match[1]) {
      const filename = match[1].trim();
      if (filename) {
        tools.push({ type: 'read', value: filename });
        console.log(`[TOOL CALL DETECTED] ✓ Read tool call: "${filename}"`);
      }
    }
  }

  if (tools.length === 0) {
    console.log(`[TOOL EXTRACTION] ✗ No tool calls found in response`);
  }

  return tools;
}
