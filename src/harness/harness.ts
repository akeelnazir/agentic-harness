import { writeFile } from 'fs/promises';
import { executeTool } from '../tools/tool-executor.ts';
import type { ChatCompletionMessageParam } from '../types/types.ts';
import { DEFAULT_MODEL, MAX_ITERATIONS, INPUT_TOKEN_PRICE_PER_MILLION, OUTPUT_TOKEN_PRICE_PER_MILLION, MAX_MESSAGES_TO_KEEP, LLM_PROVIDER } from '../config.ts';
import { TOOLS } from '../tools/tools-definition.ts';
import { systemPrompt } from './system-prompt.ts';
import { logger } from '../services/logger.ts';
import { AdapterFactory } from '../llm/adapter-factory.ts';
import type { LLMAdapter, LLMTool } from '../llm/llm-adapter.ts';

/**
 * Harness class that combines LLM with tool calling capabilities
 */
export class Harness {
  private llmAdapter: LLMAdapter;
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
    this.llmAdapter = AdapterFactory.createAdapter(model);

    if (logger.isDebugEnabled()) {
      logger.debug('Harness initialized', {
        model: this.model,
        provider: LLM_PROVIDER,
      });
    }
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
    const messages: Array<ChatCompletionMessageParam> = [
      { role: 'user', content: query },
    ];

    const maxIterations = MAX_ITERATIONS;
    let iterations = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    logger.info(`[QUERY START] Processing: "${query}"`);
    logger.info(`[MODEL] Using: ${this.model}`);

    // Convert tools to adapter format
    const adapterTools: LLMTool[] = TOOLS.map((tool) => {
      if (tool.type !== 'function') {
        throw new Error('Only function tools are supported');
      }
      return {
        name: tool.function.name,
        description: tool.function.description || '',
        inputSchema: tool.function.parameters as Record<string, unknown>,
      };
    });

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

        // Add assistant response to messages with tool use blocks
        const assistantContent: any[] = [];
        if (response.content) {
          assistantContent.push({
            type: 'text',
            text: response.content,
          });
        }
        for (const toolCall of response.toolCalls) {
          assistantContent.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.name,
            input: JSON.parse(toolCall.arguments),
          });
        }

        messages.push({
          role: 'assistant',
          content: assistantContent,
        });

        // Execute tools and collect results
        for (const toolCall of response.toolCalls) {
          const { id, name, arguments: args } = toolCall;
          logger.info(
            `[TOOL CALL] id=${id} name=${name} args=${args}`
          );

          const toolResult = await executeTool(name, args);
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
            content: toolResult,
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
}
