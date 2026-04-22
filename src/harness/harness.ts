import OpenAI from 'openai';
import { executeTool } from '../tools/tool-executor.ts';
import type { ChatCompletionMessageParam } from '../types/types.ts';
import { LLMHOST_HOST, DEFAULT_MODEL, MAX_ITERATIONS, OPENROUTER_API_KEY } from '../config.ts';
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
   * Process a query using LLMHOST with LLM-driven tool calling
   */
  async processQuery(query: string): Promise<string> {
    const messages: Array<ChatCompletionMessageParam> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];
    const maxIterations = MAX_ITERATIONS;
    let iterations = 0;

    logger.info(`[QUERY START] Processing: "${query}"`);
    logger.info(`[MODEL] Using: ${this.model}`);

    while (iterations < maxIterations) {
      iterations++;
      logger.info(`\n[ITERATION ${iterations}/${maxIterations}]`);

      try {
        logger.info(`[LLMHOST REQUEST] Sending prompt to model...`);
        if (logger.isDebugEnabled()) {
          logger.debug('LLM request', { model: this.model, messages });
        }
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: messages,
          tools: TOOLS,
          parallel_tool_calls: true,
          temperature: 0.2,
          stream: false,
        });

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
