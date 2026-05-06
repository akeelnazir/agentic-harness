import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { LLMTool } from '../llm/llm-adapter.ts';
import { logger } from '../services/logger.ts';

export interface MCPServerConfig {
  type: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface MCPClientState {
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
  connected: boolean;
  tools: LLMTool[];
}

/**
 * MCP Client Manager - handles connections to multiple MCP servers
 */
export class MCPClientManager {
  private servers: Map<string, MCPClientState> = new Map();

  /**
   * Initialize connections to all configured MCP servers
   */
  async initialize(config: Record<string, MCPServerConfig>): Promise<void> {
    for (const [name, serverConfig] of Object.entries(config)) {
      try {
        await this.connectServer(name, serverConfig);
      } catch (error) {
        logger.error(`Failed to connect to MCP server "${name}":`, error);
      }
    }
  }

  /**
   * Connect to a single MCP server
   */
  private async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    logger.info(`[MCP] Connecting to server "${name}" (${config.type})`);

    let transport: StdioClientTransport | SSEClientTransport;

    if (config.type === 'stdio') {
      if (!config.command) {
        throw new Error(`MCP server "${name}" missing command for stdio transport`);
      }
      const stdioParams: { command: string; args: string[]; env?: Record<string, string> } = {
        command: config.command,
        args: config.args || [],
      };
      if (config.env) {
        stdioParams.env = config.env;
      }
      transport = new StdioClientTransport(stdioParams);
    } else if (config.type === 'sse') {
      if (!config.url) {
        throw new Error(`MCP server "${name}" missing URL for SSE transport`);
      }
      transport = new SSEClientTransport(new URL(config.url));
    } else {
      throw new Error(`Unknown MCP transport type: ${config.type}`);
    }

    const client = new Client({
      name: 'agentic-harness',
      version: '1.0.0',
    });

    await client.connect(transport);

    // Discover tools from this server
    const toolsResponse = await client.listTools();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: LLMTool[] = toolsResponse.tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema as Record<string, unknown>,
    }));

    logger.info(`[MCP] Server "${name}" connected with ${tools.length} tool(s)`);
    if (logger.isDebugEnabled()) {
      logger.debug(`[MCP] Server "${name}" tools:`, tools.map((t) => t.name));
    }

    this.servers.set(name, {
      client,
      transport,
      connected: true,
      tools,
    });
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): LLMTool[] {
    const allTools: LLMTool[] = [];
    for (const state of this.servers.values()) {
      if (state.connected) {
        allTools.push(...state.tools);
      }
    }
    return allTools;
  }

  /**
   * Execute a tool by name across all connected servers
   */
  async executeTool(name: string, args: string): Promise<string> {
    const parsedArgs = JSON.parse(args);

    // Find which server has this tool
    for (const [serverName, state] of this.servers.entries()) {
      if (!state.connected) continue;

      const hasTool = state.tools.some((t) => t.name === name);
      if (hasTool) {
        try {
          logger.info(`[MCP] Executing tool "${name}" on server "${serverName}"`);
          if (logger.isDebugEnabled()) {
            logger.debug(`[MCP] Tool "${name}" args:`, parsedArgs);
          }

          const result = await state.client.callTool(
            {
              name,
              arguments: parsedArgs,
            },
            undefined, // resultSchema
            { timeout: 300000 } // 5 minute timeout for long operations
          );

          if (logger.isDebugEnabled()) {
            logger.debug(`[MCP] Tool "${name}" result:`, result);
          }

          // Handle different result content types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const content = (result as any).content;
          if (content && Array.isArray(content) && content.length > 0) {
            const textContent = content
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((c: any) => c.type === 'text')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((c: any) => c.text || '')
              .join('\n');
            return textContent || JSON.stringify(content);
          }

          return 'Tool executed successfully (no content returned)';
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`[MCP] Tool "${name}" execution failed:`, error);
          return `Tool execution failed: ${errorMessage}`;
        }
      }
    }

    return `Tool "${name}" not found on any connected MCP server`;
  }

  /**
   * Disconnect all servers
   */
  async disconnect(): Promise<void> {
    for (const [name, state] of this.servers.entries()) {
      try {
        await state.client.close();
        logger.info(`[MCP] Disconnected from server "${name}"`);
      } catch (error) {
        logger.error(`[MCP] Error disconnecting from server "${name}":`, error);
      }
    }
    this.servers.clear();
  }

  /**
   * Check if any servers are connected
   */
  isConnected(): boolean {
    for (const state of this.servers.values()) {
      if (state.connected) return true;
    }
    return false;
  }

  /**
   * Get connected server count
   */
  getConnectedCount(): number {
    let count = 0;
    for (const state of this.servers.values()) {
      if (state.connected) count++;
    }
    return count;
  }
}
