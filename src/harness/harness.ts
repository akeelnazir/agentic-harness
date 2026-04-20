import OpenAI from 'openai';
import { executeTool } from '../tools/tool-executor.ts';
import type { ChatCompletionMessageParam } from '../types/types.ts';
import { LLMHOST_HOST, DEFAULT_MODEL, MAX_ITERATIONS, } from '../config.ts';
import { TOOLS } from '../tools/tools-definition.ts';
import { systemPrompt } from './system-prompt.ts';

/**
 * Harness class that combines LLM with tool calling capabilities
 */
export class Harness {
  private client: OpenAI;
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.client = new OpenAI({
      baseURL: LLMHOST_HOST,
      apiKey: 'not-needed',
    });
    this.model = model;
  }

  /**
   * Process a query using LLMHOST with LLM-driven tool calling
   */
  async processQuery(query: string): Promise<string> {
    const messages: Array<ChatCompletionMessageParam> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];
    let iterations = 0;
    const maxIterations = MAX_ITERATIONS;

    console.log(`[QUERY START] Processing: "${query}"`);
    console.log(`[MODEL] Using: ${this.model}`);

    while (iterations < maxIterations) {
      iterations++;
      console.log(`\n[ITERATION ${iterations}/${maxIterations}]`);

      try {
        console.log(`[LLMHOST REQUEST] Sending prompt to model...`);
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: messages,
          tools: TOOLS,
          stream: false,
        });

        const choice = response.choices[0];
        if (!choice) throw new Error('No choices returned from model');
        const message = choice.message;

        console.log(`[LLMHOST RESPONSE] finish_reason: ${choice.finish_reason}`);

        if (!message.tool_calls || message.tool_calls.length === 0) {
          console.log(`[NO TOOL CALL] Returning final response`);
          return message.content ?? '';
        }

        console.log(`[TOOL CALLS] ${message.tool_calls.length} tool call(s) requested`);
        messages.push(message);

        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const { id, function: fn } = toolCall;
          console.log(`[TOOL CALL] id=${id} name=${fn.name} args=${fn.arguments}`);

          const toolResult = await executeTool(fn.name, fn.arguments);

          messages.push({
            role: 'tool',
            tool_call_id: id,
            content: toolResult,
          });
        }

        console.log(`[TOOL RESULTS] Added to conversation history, continuing...`);
        continue;
      } catch (error) {
        console.error('Error generating response from LLMHOST:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate response: ${errorMessage}`);
      }
    }

    throw new Error('Maximum tool call iterations reached');
  }
}
