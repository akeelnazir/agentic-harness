import { writeFile } from 'fs/promises';
import type { ChatCompletionMessageParam } from '../types/types.ts';
import { DEFAULT_MODEL, MAX_ITERATIONS, INPUT_TOKEN_PRICE_PER_MILLION, OUTPUT_TOKEN_PRICE_PER_MILLION, MAX_MESSAGES_TO_KEEP, LLM_PROVIDER, MCP_SERVERS } from '../config.ts';
import { systemPrompt } from './system-prompt.ts';
import { logger } from '../services/logger.ts';
import { AdapterFactory } from '../llm/adapter-factory.ts';
import type { LLMAdapter, LLMTool } from '../llm/llm-adapter.ts';
import { MCPClientManager } from '../mcp/mcp-client.ts';

/**
 * Harness class that combines LLM with tool calling capabilities
 */
export class Harness {
  private llmAdapter: LLMAdapter;
  private model: string;
  private mcpClient: MCPClientManager;
  private initialized = false;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
    this.llmAdapter = AdapterFactory.createAdapter(model);
    this.mcpClient = new MCPClientManager();

    if (logger.isDebugEnabled()) {
      logger.debug('Harness initialized', {
        model: this.model,
        provider: LLM_PROVIDER,
      });
    }
  }

  /**
   * Initialize the harness and connect to MCP servers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Connect to MCP servers if configured
    if (Object.keys(MCP_SERVERS).length > 0) {
      logger.info(`[MCP] Initializing ${Object.keys(MCP_SERVERS).length} MCP server(s)...`);
      await this.mcpClient.initialize(MCP_SERVERS);
      const toolCount = this.mcpClient.getAllTools().length;
      logger.info(`[MCP] Connected with ${this.mcpClient.getConnectedCount()} server(s), ${toolCount} total tool(s) available`);
    } else {
      logger.info('[MCP] No MCP servers configured');
    }

    this.initialized = true;
  }

  /**
   * Prune messages to keep only recent context and avoid excessive token usage
   * Keeps the system message and user query, then keeps the most recent messages
   */
  private pruneMessages(messages: Array<ChatCompletionMessageParam>): Array<ChatCompletionMessageParam> {
    if (messages.length <= MAX_MESSAGES_TO_KEEP) {
      return messages;
    }

    const systemMsg = messages[0]!;
    const userMsg = messages[1]!;
    const recentMessages = messages.slice(-MAX_MESSAGES_TO_KEEP + 2);

    const prunedMessages: Array<ChatCompletionMessageParam> = [systemMsg, userMsg, ...recentMessages];
    const tokensRemoved = messages.length - prunedMessages.length;

    if (logger.isDebugEnabled()) {
      logger.debug(`Pruned messages: removed ${tokensRemoved} old messages, keeping ${prunedMessages.length} total`);
    }

    return prunedMessages;
  }

  /**
   * Process a query using LLM with tool calling capabilities
   */
  async processQuery(query: string): Promise<string> {
    // Ensure harness is initialized
    await this.initialize();

    const messages: Array<ChatCompletionMessageParam> = [
      { role: 'user', content: query },
    ];

    const maxIterations = MAX_ITERATIONS;
    let iterations = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    logger.info(`[QUERY START] Processing: "${query}"`);
    logger.info(`[MODEL] Using: ${this.model}`);

    // Get tools from MCP servers
    const adapterTools: LLMTool[] = this.mcpClient.getAllTools();
    if (adapterTools.length === 0) {
      logger.warn('[MCP] No tools available from MCP servers');
    } else if (logger.isDebugEnabled()) {
      logger.debug(`[MCP] Available tools: ${adapterTools.map((t) => t.name).join(', ')}`);
    }

    while (iterations < maxIterations) {
      iterations++;
      logger.info(`\n[ITERATION ${iterations}/${maxIterations}]`);

      try {
        logger.info(`[LLMHOST REQUEST] Sending prompt to model...`);

        const prunedMessages = this.pruneMessages(messages);
        if (logger.isDebugEnabled()) {
          logger.debug('LLM request', { model: this.model, messages: prunedMessages });
          writeFile(`messages-${iterations}.log`, JSON.stringify({ messages: prunedMessages }, null, 2));
        }

        const response = await this.llmAdapter.sendRequest(prunedMessages, systemPrompt, adapterTools);

        const inputTokens = response.inputTokens;
        const outputTokens = response.outputTokens;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        const iterationCost = (inputTokens * INPUT_TOKEN_PRICE_PER_MILLION / 1000000) + (outputTokens * OUTPUT_TOKEN_PRICE_PER_MILLION / 1000000);
        const totalCost = (totalInputTokens * INPUT_TOKEN_PRICE_PER_MILLION / 1000000) + (totalOutputTokens * OUTPUT_TOKEN_PRICE_PER_MILLION / 1000000);

        logger.info(
          `[LLMHOST RESPONSE] tokens used this iteration: ${inputTokens + outputTokens} (input: ${inputTokens}, output: ${outputTokens}), cost: $${iterationCost.toFixed(6)}` +
          `\n[LLMHOST RESPONSE] total tokens used so far: ${totalInputTokens + totalOutputTokens} tokens (input: ${totalInputTokens}, output: ${totalOutputTokens})` +
          `\n[LLMHOST RESPONSE] total cost: $${totalCost.toFixed(6)}`
        );

        logger.info(
          `[LLMHOST RESPONSE] stop_reason: ${response.stopReason}`
        );
        if (logger.isDebugEnabled()) {
          logger.debug('LLM response', {
            stop_reason: response.stopReason,
            content: response.content,
            toolCalls: response.toolCalls,
          });
        }

        if (response.toolCalls.length === 0) {
          logger.info(`[NO TOOL CALL] Returning final response`);
          return response.content;
        }

        logger.info(
          `[TOOL CALLS] ${response.toolCalls.length} tool call(s) requested`
        );

        // Add assistant response to messages with tool calls (OpenAI format)
        messages.push({
          role: 'assistant',
          content: response.content || null,
          tool_calls: response.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          })),
        });

        // Execute tools and collect results
        for (const toolCall of response.toolCalls) {
          const { id, name, arguments: args } = toolCall;
          logger.info(
            `[TOOL CALL] id=${id} name=${name} args=${args}`
          );

          const toolResult = await this.mcpClient.executeTool(name, args);
          if (logger.isDebugEnabled()) {
            logger.debug('Tool result', {
              id,
              name,
              result: JSON.stringify(toolResult),
            });
          }

          messages.push({
            role: 'tool',
            tool_call_id: id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          });
        }

        logger.info(
          `[TOOL RESULTS] Added to conversation history, continuing...`
        );
      } catch (error) {
        logger.error('Error generating response from LLMHOST:', error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate response: ${errorMessage}`);
      }
    }

    throw new Error('Maximum tool call iterations reached');
  }

  /**
   * Cleanup - disconnect from all MCP servers
   */
  async cleanup(): Promise<void> {
    await this.mcpClient.disconnect();
  }
}
