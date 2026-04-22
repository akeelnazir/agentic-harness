import OpenAI from 'openai';
import { executeTool } from '../tools/tool-executor.ts';
import type { ChatCompletionMessageParam } from '../types/types.ts';
import { LLMHOST_HOST, DEFAULT_MODEL, MAX_ITERATIONS, OPENROUTER_API_KEY, INPUT_TOKEN_PRICE_PER_MILLION, OUTPUT_TOKEN_PRICE_PER_MILLION, MAX_MESSAGES_TO_KEEP } from '../config.ts';
import { TOOLS } from '../tools/tools-definition.ts';
import { systemPrompt } from './system-prompt.ts';
import { logger } from '../services/logger.ts';

/**
 * Harness class that combines LLM with tool calling capabilities
 */
export class Harness {
  private client: OpenAI;
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.client = new OpenAI({
      baseURL: LLMHOST_HOST,
      apiKey: OPENROUTER_API_KEY,
    });

    this.model = model;

    if (logger.isDebugEnabled()) {
      logger.debug('Harness initialized', {
        model: this.model,
        baseURL: LLMHOST_HOST,
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
   * Process a query using LLMHOST with LLM-driven tool calling
   */
  async processQuery(query: string): Promise<string> {
    const messages: Array<ChatCompletionMessageParam> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];
    const maxIterations = MAX_ITERATIONS;
    let iterations = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    logger.info(`[QUERY START] Processing: "${query}"`);
    logger.info(`[MODEL] Using: ${this.model}`);

    while (iterations < maxIterations) {
      iterations++;
      logger.info(`\n[ITERATION ${iterations}/${maxIterations}]`);

      try {
        logger.info(`[LLMHOST REQUEST] Sending prompt to model...`);
        const prunedMessages = this.pruneMessages(messages);
        if (logger.isDebugEnabled()) {
          logger.debug('LLM request', { model: this.model, messages: prunedMessages });
        }
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: prunedMessages,
          tools: TOOLS,
          parallel_tool_calls: true,
          temperature: 0.2,
          stream: false,
        });
        
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;
        
        const iterationCost = (inputTokens * INPUT_TOKEN_PRICE_PER_MILLION / 1000000) + (outputTokens * OUTPUT_TOKEN_PRICE_PER_MILLION / 1000000);
        const totalCost = (totalInputTokens * INPUT_TOKEN_PRICE_PER_MILLION / 1000000) + (totalOutputTokens * OUTPUT_TOKEN_PRICE_PER_MILLION / 1000000);
        
        logger.info(
          `[LLMHOST RESPONSE] tokens used this iteration: ${inputTokens + outputTokens} (input: ${inputTokens}, output: ${outputTokens}), cost: $${iterationCost.toFixed(6)}` +
          `\n[LLMHOST RESPONSE] total tokens used so far: ${totalInputTokens + totalOutputTokens} tokens (input: ${totalInputTokens}, output: ${totalOutputTokens})` +
          `\n[LLMHOST RESPONSE] total cost: $${totalCost.toFixed(6)}`
        );

        const choice = response.choices[0];
        if (!choice) throw new Error('No choices returned from model');
        const message = choice.message;

        logger.info(
          `[LLMHOST RESPONSE] finish_reason: ${choice.finish_reason}`
        );
        if (logger.isDebugEnabled()) {
          logger.debug('LLM response', {
            finish_reason: choice.finish_reason,
            message,
            usage: response.usage,
          });
        }

        if (!message.tool_calls || message.tool_calls.length === 0) {
          logger.info(`[NO TOOL CALL] Returning final response`);
          return message.content ?? '';
        }

        logger.info(
          `[TOOL CALLS] ${message.tool_calls.length} tool call(s) requested`
        );
        messages.push(message);
        if (logger.isDebugEnabled()) {
          logger.debug(`Messages stack of length: ${messages.length}`, {
            messages: JSON.stringify(messages),
          });
        }

        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const { id, function: fn } = toolCall;
          logger.info(
            `[TOOL CALL] id=${id} name=${fn.name} args=${fn.arguments}`
          );

          const toolResult = await executeTool(fn.name, fn.arguments);
          if (logger.isDebugEnabled()) {
            logger.debug('Tool result', {
              id,
              name: fn.name,
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
        continue;
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
