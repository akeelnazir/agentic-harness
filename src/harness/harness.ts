import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { writeFile } from 'fs/promises';
import { executeTool } from '../tools/tool-executor.ts';
import type { ChatCompletionMessageParam } from '../types/types.ts';
import { LLM_PROVIDER, OPENAI_API_KEY, ANTHROPIC_API_KEY, DEFAULT_MODEL, MAX_ITERATIONS, OPENROUTER_API_KEY, INPUT_TOKEN_PRICE_PER_MILLION, OUTPUT_TOKEN_PRICE_PER_MILLION, MAX_MESSAGES_TO_KEEP, OPENAI_ORG_ID, OPENAI_PROJECT_ID } from '../config.ts';
import { TOOLS } from '../tools/tools-definition.ts';
import { systemPrompt } from './system-prompt.ts';
import { logger } from '../services/logger.ts';

/**
 * Harness class that combines LLM with tool calling capabilities
 */
export class Harness {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private model: string;
  private provider: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
    this.provider = LLM_PROVIDER;

    switch (LLM_PROVIDER) {
      case 'openai':
        {
          const apiKey = OPENAI_API_KEY;
          if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER is set to "openai"');
          }
          this.openaiClient = new OpenAI({
            baseURL: 'https://api.openai.com/v1',
            apiKey,
            organization: OPENAI_ORG_ID,
            project: OPENAI_PROJECT_ID,
          });
        }
        break;
      
      case 'openrouter':
        {
          const apiKey = OPENROUTER_API_KEY;
          if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY is required when LLM_PROVIDER is set to "openrouter"');
          }
          this.openaiClient = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey,
          });
        }
        break;
      
      case 'anthropic':
        {
          const apiKey = ANTHROPIC_API_KEY;
          if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER is set to "anthropic"');
          }
          this.anthropicClient = new Anthropic({ apiKey });
        }
        break;
      
      case 'lmstudio':
      default:
        this.openaiClient = new OpenAI({
          baseURL: 'http://127.0.0.1:1234/v1',
          apiKey: 'dummy-key-for-local',
        });
        break;
    }

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
   * Process a query using LLMHOST with LLM-driven tool calling
   */
  async processQuery(query: string): Promise<string> {
    if (this.provider === 'anthropic') {
      return this.processQueryAnthropic(query);
    } else {
      return this.processQueryOpenAI(query);
    }
  }

  /**
   * Process query using OpenAI-compatible API
   */
  private async processQueryOpenAI(query: string): Promise<string> {
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
          writeFile(`messages-${iterations}.log`, JSON.stringify({ messages: prunedMessages }, null, 2));
        }
        const response = await this.openaiClient!.chat.completions.create({
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

        if (!response?.choices || response.choices.length === 0) {
          throw new Error('No choices returned from model');
        }

        const choice = response.choices[0]!;
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

  /**
   * Process query using Anthropic API
   */
  private async processQueryAnthropic(query: string): Promise<string> {
    const anthropicMessages: Anthropic.Messages.MessageParam[] = [
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
        if (logger.isDebugEnabled()) {
          logger.debug('LLM request', { model: this.model, messages: anthropicMessages });
          writeFile(`messages-${iterations}.log`, JSON.stringify({ messages: anthropicMessages }, null, 2));
        }

        const response = await this.anthropicClient!.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          tools: this.convertToolsToAnthropic(),
          messages: anthropicMessages,
        });

        const inputTokens = response.usage.input_tokens || 0;
        const outputTokens = response.usage.output_tokens || 0;
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
          `[LLMHOST RESPONSE] stop_reason: ${response.stop_reason}`
        );
        if (logger.isDebugEnabled()) {
          logger.debug('LLM response', {
            stop_reason: response.stop_reason,
            content: response.content,
            usage: response.usage,
          });
        }

        let hasToolUse = false;
        let finalText = '';

        for (const block of response.content) {
          if (block.type === 'text') {
            finalText = block.text;
          } else if (block.type === 'tool_use') {
            hasToolUse = true;
          }
        }

        if (!hasToolUse) {
          logger.info(`[NO TOOL CALL] Returning final response`);
          return finalText;
        }

        logger.info(
          `[TOOL CALLS] Tool use(s) requested`
        );

        anthropicMessages.push({
          role: 'assistant',
          content: response.content,
        });

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          const { id, name, input } = block;
          logger.info(
            `[TOOL CALL] id=${id} name=${name} args=${JSON.stringify(input)}`
          );

          const toolResult = await executeTool(name, JSON.stringify(input));
          if (logger.isDebugEnabled()) {
            logger.debug('Tool result', {
              id,
              name,
              result: JSON.stringify(toolResult),
            });
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: id,
            content: toolResult,
          });
        }

        anthropicMessages.push({
          role: 'user',
          content: toolResults,
        });

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

  /**
   * Convert OpenAI tools format to Anthropic tools format
   */
  private convertToolsToAnthropic(): Anthropic.Messages.Tool[] {
    return TOOLS.map((tool) => {
      if (tool.type !== 'function') {
        throw new Error('Only function tools are supported');
      }
      return {
        name: tool.function.name,
        description: tool.function.description || '',
        input_schema: tool.function.parameters as Anthropic.Messages.Tool['input_schema'],
      };
    });
  }
}
